/**
 * Solana Transaction Builder for CDP V2
 *
 * Server-only module that constructs Solana transactions for CDP embedded
 * wallets. The CDP SDK Solana `sendTransaction` endpoint requires a
 * pre-built base64-encoded serialized transaction. This module handles
 * the construction of both native SOL and SPL token transfer transactions.
 *
 * - Uses @solana/web3.js for transaction construction
 * - SPL token transfers use raw instruction layout to avoid @solana/spl-token dependency
 * - Transactions are serialized WITHOUT signatures (requireAllSignatures: false)
 *   because the CDP SDK signs server-side before broadcasting
 * - Uses SOLANA_RPC_URL env var with mainnet-beta fallback
 */
import "server-only";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SPL Token Program ID */
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

/** SPL Associated Token Account Program ID */
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/** SPL Token transfer instruction discriminator (index 3 in the Token program) */
const SPL_TRANSFER_INSTRUCTION_INDEX = 3;

// ---------------------------------------------------------------------------
// RPC Connection
// ---------------------------------------------------------------------------

/**
 * Resolve the Solana RPC URL from environment variables.
 * Checks SOLANA_RPC_URL, then NEXT_PUBLIC_RPC, then falls back to
 * the public mainnet-beta endpoint.
 */
function resolveSolanaRpcUrl(): string {
  const rpcUrl =
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC?.trim() ||
    "https://api.mainnet-beta.solana.com";

  return rpcUrl;
}

/**
 * Create a Solana Connection instance.
 * Uses "confirmed" commitment for balance/blockhash queries.
 */
function getSolanaConnection(): Connection {
  return new Connection(resolveSolanaRpcUrl(), "confirmed");
}

// ---------------------------------------------------------------------------
// SPL Token Helpers (avoiding @solana/spl-token dependency)
// ---------------------------------------------------------------------------

/**
 * Derive the associated token account (ATA) address for a given owner and mint.
 *
 * The ATA is a PDA derived from:
 *   seeds = [owner, TOKEN_PROGRAM_ID, mint]
 *   program = ASSOCIATED_TOKEN_PROGRAM_ID
 */
function deriveAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey,
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

/**
 * Build a raw SPL Token `Transfer` instruction.
 *
 * The instruction layout for Token Program transfer (index 3) is:
 * - 1 byte: instruction index (3)
 * - 8 bytes: amount (little-endian u64)
 *
 * Account keys (in order):
 * 0. source ATA (writable)
 * 1. destination ATA (writable)
 * 2. owner/authority (signer)
 */
function buildSplTransferInstruction(
  sourceAta: PublicKey,
  destinationAta: PublicKey,
  owner: PublicKey,
  amount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(SPL_TRANSFER_INSTRUCTION_INDEX, 0);
  data.writeBigUInt64LE(amount, 1);

  return new TransactionInstruction({
    keys: [
      { pubkey: sourceAta, isSigner: false, isWritable: true },
      { pubkey: destinationAta, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

/**
 * Build a "Create Associated Token Account" instruction (idempotent).
 *
 * Uses the idempotent variant (instruction index = create_idempotent, which
 * is the standard ATA creation that does not fail if the account already exists
 * when using the standard create instruction from the ATA program).
 *
 * Account keys:
 * 0. funding account (signer, writable) — pays for rent
 * 1. associated token account (writable)
 * 2. wallet/owner address
 * 3. token mint
 * 4. system program
 * 5. token program
 */
function buildCreateAtaInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a native SOL transfer transaction and serialize to base64.
 *
 * @param fromAddress - The sender's Solana address (base58)
 * @param toAddress - The recipient's Solana address (base58)
 * @param amountLamports - Amount to transfer in lamports (1 SOL = 1_000_000_000 lamports)
 * @returns Base64-encoded serialized transaction (unsigned)
 */
export async function buildSolTransfer(
  fromAddress: string,
  toAddress: string,
  amountLamports: bigint,
): Promise<string> {
  const connection = getSolanaConnection();
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);

  logger.info("solana_tx_builder_sol_transfer", {
    from: fromAddress,
    to: toAddress,
    amountLamports: amountLamports.toString(),
  });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: fromPubkey,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: amountLamports,
    }),
  );

  const serialized = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  logger.info("solana_tx_builder_sol_transfer_serialized", {
    from: fromAddress,
    to: toAddress,
    blockhash,
    serializedLength: serialized.length,
  });

  return serialized;
}

/**
 * Build an SPL token transfer transaction and serialize to base64.
 *
 * Includes a "Create Associated Token Account" instruction for the
 * destination if the ATA does not already exist on-chain. This ensures
 * transfers to new recipients succeed without a separate setup step.
 *
 * @param fromAddress - The sender's Solana address (base58)
 * @param toAddress - The recipient's Solana address (base58)
 * @param tokenMint - The SPL token mint address (base58)
 * @param amount - Amount in the token's smallest unit (e.g. for 6-decimal USDC, 1_000_000 = 1 USDC)
 * @param decimals - Token decimal places (used for logging only; amount should already be in base units)
 * @returns Base64-encoded serialized transaction (unsigned)
 */
export async function buildSplTransfer(
  fromAddress: string,
  toAddress: string,
  tokenMint: string,
  amount: bigint,
  decimals: number,
): Promise<string> {
  const connection = getSolanaConnection();
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);
  const mintPubkey = new PublicKey(tokenMint);

  logger.info("solana_tx_builder_spl_transfer", {
    from: fromAddress,
    to: toAddress,
    tokenMint,
    amount: amount.toString(),
    decimals,
  });

  // Derive associated token accounts
  const sourceAta = deriveAssociatedTokenAddress(fromPubkey, mintPubkey);
  const destinationAta = deriveAssociatedTokenAddress(toPubkey, mintPubkey);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: fromPubkey,
  });

  // Check if the destination ATA exists; if not, add a create instruction.
  // This is idempotent — the ATA program's create instruction is a no-op
  // if the account already exists.
  const destinationAtaInfo = await connection.getAccountInfo(destinationAta);
  if (!destinationAtaInfo) {
    logger.info("solana_tx_builder_creating_destination_ata", {
      ata: destinationAta.toBase58(),
      owner: toAddress,
      mint: tokenMint,
    });

    transaction.add(
      buildCreateAtaInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey),
    );
  }

  // Add the SPL token transfer instruction
  transaction.add(
    buildSplTransferInstruction(sourceAta, destinationAta, fromPubkey, amount),
  );

  const serialized = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  logger.info("solana_tx_builder_spl_transfer_serialized", {
    from: fromAddress,
    to: toAddress,
    tokenMint,
    sourceAta: sourceAta.toBase58(),
    destinationAta: destinationAta.toBase58(),
    blockhash,
    serializedLength: serialized.length,
    createdDestinationAta: !destinationAtaInfo,
  });

  return serialized;
}
