import { createPublicClient, createWalletClient, encodeFunctionData, http, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  type Commitment,
} from "@solana/web3.js";
import bs58 from "bs58";

import { normalizeAssetId, parseBaseUnits } from "@/server/agents/campaign";
import { getSafeTargetChains } from "@/server/services/safe/chains";

type ExecutePayoutOptions = {
  networkId: string;
  assetId?: string | null;
  creatorAmountBaseUnits: string;
  operatorAmountBaseUnits: string;
  investorPoolAmountBaseUnits: string;
  creatorTreasury?: string | null;
  operatorTreasury?: string | null;
  investorTreasury: string;
};

type ExecutePayoutResult = {
  payoutTxHashes: string[];
};

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

function parseChainId(networkId: string): number {
  const match = /^eip155:(\d+)$/.exec(networkId.trim());
  if (!match) {
    throw new Error("On-chain payout execution currently supports EVM CAIP-2 network id only.");
  }
  return Number(match[1]);
}

function resolveRpc(chainId: number): string {
  const chain = getSafeTargetChains().find((entry) => entry.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported EVM chain for payout execution: ${chainId}`);
  }
  return chain.rpcUrl;
}

function resolvePayoutKey(): `0x${string}` {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) throw new Error("Missing PRIVATE_KEY for payout execution.");
  const normalized = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Invalid PRIVATE_KEY format for payout execution.");
  }
  return normalized;
}

function parseErc20Asset(assetId: string, chainId: number): `0x${string}` {
  const match = /^eip155:(\d+)\/erc20:(0x[0-9a-fA-F]{40})$/.exec(assetId.trim());
  if (!match) {
    throw new Error("Invalid ERC20 asset id for payout execution.");
  }
  if (Number(match[1]) !== chainId) {
    throw new Error("ERC20 asset chain mismatch for payout execution.");
  }
  return match[2] as `0x${string}`;
}

function ensureAddress(value: string | null | undefined, field: string): `0x${string}` {
  if (!value || !isAddress(value)) {
    throw new Error(`Invalid ${field} for payout execution.`);
  }
  return value as `0x${string}`;
}

function parseSolanaNetworkId(networkId: string): number {
  const match = /^solana:(\d+)$/.exec(networkId.trim());
  if (!match) {
    throw new Error("On-chain payout execution currently supports Solana CAIP-2 network id only.");
  }
  return Number(match[1]);
}

function resolveSolanaRpcUrl(): string {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC?.trim();
  if (!rpcUrl) {
    throw new Error("Missing Solana RPC URL. Set NEXT_PUBLIC_RPC.");
  }
  return rpcUrl;
}

function resolveSolanaPayoutSigner(): Keypair {
  const b58 = process.env.SOLANA_PRIVATE_KEY_B58?.trim();
  if (b58) {
    const bytes = bs58.decode(b58);
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes);
    }
  }

  const json = process.env.SOLANA_PRIVATE_KEY_JSON?.trim();
  if (json) {
    const parsed = JSON.parse(json) as number[];
    const bytes = Uint8Array.from(parsed);
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes);
    }
  }

  const evmRaw = process.env.PRIVATE_KEY?.trim();
  if (!evmRaw) {
    throw new Error(
      "Missing Solana payout signer. Set SOLANA_PRIVATE_KEY_B58, SOLANA_PRIVATE_KEY_JSON, or PRIVATE_KEY.",
    );
  }
  const normalized = evmRaw.startsWith("0x") ? evmRaw.slice(2) : evmRaw;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Invalid PRIVATE_KEY fallback for Solana payout signer.");
  }
  return Keypair.fromSeed(Buffer.from(normalized, "hex"));
}

function parseSplMintAddress(assetId: string, networkRef: number): PublicKey {
  const match = /^solana:(\d+)\/spl:([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(assetId.trim());
  if (!match) {
    throw new Error("Invalid SPL asset id for Solana payout execution.");
  }
  if (Number(match[1]) !== networkRef) {
    throw new Error("SPL asset network mismatch for Solana payout execution.");
  }
  return new PublicKey(match[2]);
}

function ensureSolanaAddress(value: string | null | undefined, field: string): PublicKey {
  if (!value) {
    throw new Error(`Missing ${field} for Solana payout execution.`);
  }
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${field} for Solana payout execution.`);
  }
}

function ensureU64(value: bigint, field: string): bigint {
  const max = (1n << 64n) - 1n;
  if (value < 0n || value > max) {
    throw new Error(`Invalid ${field}: value exceeds uint64 range.`);
  }
  return value;
}

function ensureSolTransferAmount(amount: bigint): bigint {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  if (amount > maxSafe) {
    throw new Error("Native SOL payout amount exceeds safe integer transfer bounds.");
  }
  return amount;
}

function deriveAssociatedTokenAddress(mint: PublicKey, owner: PublicKey, tokenProgramId: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

function buildCreateAssociatedTokenAccountInstruction(args: {
  payer: PublicKey;
  associatedTokenAddress: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: args.owner, isSigner: false, isWritable: false },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: args.tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function buildTransferCheckedInstruction(args: {
  sourceTokenAddress: PublicKey;
  destinationTokenAddress: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
  decimals: number;
  tokenProgramId: PublicKey;
}): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(12, 0); // TokenInstruction.TransferChecked
  data.writeBigUInt64LE(ensureU64(args.amount, "SPL payout amount"), 1);
  data.writeUInt8(args.decimals, 9);

  return new TransactionInstruction({
    programId: args.tokenProgramId,
    keys: [
      { pubkey: args.sourceTokenAddress, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: args.destinationTokenAddress, isSigner: false, isWritable: true },
      { pubkey: args.owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

async function resolveMintConfig(connection: Connection, mint: PublicKey, commitment: Commitment): Promise<{
  tokenProgramId: PublicKey;
  decimals: number;
}> {
  const mintAccount = await connection.getAccountInfo(mint, commitment);
  if (!mintAccount) {
    throw new Error("SPL mint account not found for payout execution.");
  }
  const tokenProgramId = mintAccount.owner;
  if (!tokenProgramId.equals(TOKEN_PROGRAM_ID) && !tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)) {
    throw new Error("Unsupported SPL token program for payout execution.");
  }
  if (mintAccount.data.length < 45) {
    throw new Error("Invalid SPL mint account layout for payout execution.");
  }
  const decimals = mintAccount.data.readUInt8(44);
  return { tokenProgramId, decimals };
}

export async function executeEvmRevenuePayouts(options: ExecutePayoutOptions): Promise<ExecutePayoutResult> {
  const chainId = parseChainId(options.networkId);
  const rpcUrl = resolveRpc(chainId);
  const account = privateKeyToAccount(resolvePayoutKey());
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const payoutTxHashes: string[] = [];

  const payouts: Array<{ to: string | null | undefined; amount: string }> = [
    { to: options.creatorTreasury, amount: options.creatorAmountBaseUnits },
    { to: options.operatorTreasury, amount: options.operatorAmountBaseUnits },
    { to: options.investorTreasury, amount: options.investorPoolAmountBaseUnits },
  ];

  const normalizedAsset = normalizeAssetId(options.assetId);
  if (normalizedAsset === "native") {
    for (const payout of payouts) {
      const amount = parseBaseUnits(payout.amount);
      if (amount <= 0n) continue;
      const to = ensureAddress(payout.to, "payout destination");
      const txHash = await walletClient.sendTransaction({
        chain: null,
        account,
        to,
        value: amount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("Native payout transaction failed.");
      }
      payoutTxHashes.push(txHash);
    }
    return { payoutTxHashes };
  }

  const tokenAddress = parseErc20Asset(normalizedAsset, chainId);
  for (const payout of payouts) {
    const amount = parseBaseUnits(payout.amount);
    if (amount <= 0n) continue;
    const to = ensureAddress(payout.to, "payout destination");
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "transfer",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ],
      functionName: "transfer",
      args: [to, amount],
    });
    const txHash = await walletClient.sendTransaction({
      chain: null,
      account,
      to: tokenAddress,
      data,
      value: 0n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
    if (receipt.status !== "success") {
      throw new Error("ERC20 payout transaction failed.");
    }
    payoutTxHashes.push(txHash);
  }

  return { payoutTxHashes };
}

export async function executeSolanaRevenuePayouts(options: ExecutePayoutOptions): Promise<ExecutePayoutResult> {
  const networkRef = parseSolanaNetworkId(options.networkId);
  const normalizedAsset = normalizeAssetId(options.assetId);
  const connection = new Connection(resolveSolanaRpcUrl(), "confirmed");
  const signer = resolveSolanaPayoutSigner();
  const commitment: Commitment = "confirmed";
  const payoutTxHashes: string[] = [];

  const payouts: Array<{ to: string | null | undefined; amount: string }> = [
    { to: options.creatorTreasury, amount: options.creatorAmountBaseUnits },
    { to: options.operatorTreasury, amount: options.operatorAmountBaseUnits },
    { to: options.investorTreasury, amount: options.investorPoolAmountBaseUnits },
  ];

  if (normalizedAsset === "native") {
    for (const payout of payouts) {
      const amount = parseBaseUnits(payout.amount);
      if (amount <= 0n) continue;
      const destination = ensureSolanaAddress(payout.to, "payout destination");
      const lamports = ensureSolTransferAmount(amount);
      const transferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: destination,
          lamports: Number(lamports),
        }),
      );
      const txHash = await sendAndConfirmTransaction(connection, transferTx, [signer], { commitment });
      payoutTxHashes.push(txHash);
    }
    return { payoutTxHashes };
  }

  const mint = parseSplMintAddress(normalizedAsset, networkRef);
  const { tokenProgramId, decimals } = await resolveMintConfig(connection, mint, commitment);
  const sourceTokenAddress = deriveAssociatedTokenAddress(mint, signer.publicKey, tokenProgramId);
  const sourceTokenAccount = await connection.getAccountInfo(sourceTokenAddress, commitment);
  if (!sourceTokenAccount) {
    throw new Error("Solana payout signer does not hold source SPL token account.");
  }

  for (const payout of payouts) {
    const amount = parseBaseUnits(payout.amount);
    if (amount <= 0n) continue;
    const recipient = ensureSolanaAddress(payout.to, "payout destination");
    const destinationTokenAddress = deriveAssociatedTokenAddress(mint, recipient, tokenProgramId);
    const destinationTokenAccount = await connection.getAccountInfo(destinationTokenAddress, commitment);

    const payoutTx = new Transaction();
    if (!destinationTokenAccount) {
      payoutTx.add(
        buildCreateAssociatedTokenAccountInstruction({
          payer: signer.publicKey,
          associatedTokenAddress: destinationTokenAddress,
          owner: recipient,
          mint,
          tokenProgramId,
        }),
      );
    }

    payoutTx.add(
      buildTransferCheckedInstruction({
        sourceTokenAddress,
        destinationTokenAddress,
        mint,
        owner: signer.publicKey,
        amount,
        decimals,
        tokenProgramId,
      }),
    );

    const txHash = await sendAndConfirmTransaction(connection, payoutTx, [signer], { commitment });
    payoutTxHashes.push(txHash);
  }

  return { payoutTxHashes };
}
