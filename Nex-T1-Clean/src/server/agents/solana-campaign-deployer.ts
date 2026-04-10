import { createHash } from "node:crypto";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

type SolanaDeployParams = {
  chainRef: string;
  treasuryAddress: string;
  targetBaseUnits: string;
  minContributionBaseUnits: string;
};

type SolanaDeployResult = {
  campaignAddress: string;
  shareTokenAddress: string;
  campaignDeployTxHash: string;
  shareTokenDeployTxHash: string;
  deployerAddress: string;
};

function parseSolanaChainRef(chainRef: string): number {
  const match = /^solana:(\d+)$/.exec(chainRef.trim());
  if (!match) {
    throw new Error("Campaign chain_ref must be Solana CAIP-2 format (solana:<clusterId>).");
  }
  return Number(match[1]);
}

function resolveSolanaRpc(): string {
  const rpc = process.env.NEXT_PUBLIC_RPC?.trim();
  if (!rpc) {
    throw new Error("Missing NEXT_PUBLIC_RPC for Solana deployment.");
  }
  return rpc;
}

function resolveSolanaDeployer(): Keypair {
  const b58 = process.env.SOLANA_PRIVATE_KEY_B58?.trim();
  if (b58) {
    const bytes = bs58.decode(b58);
    if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  }

  const json = process.env.SOLANA_PRIVATE_KEY_JSON?.trim();
  if (json) {
    const parsed = JSON.parse(json) as number[];
    const bytes = Uint8Array.from(parsed);
    if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  }

  const evmRaw = process.env.PRIVATE_KEY?.trim();
  if (!evmRaw) {
    throw new Error("Missing deployer key. Provide SOLANA_PRIVATE_KEY_B58, SOLANA_PRIVATE_KEY_JSON, or PRIVATE_KEY.");
  }
  const normalized = evmRaw.startsWith("0x") ? evmRaw.slice(2) : evmRaw;
  if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error("PRIVATE_KEY fallback must be a 32-byte hex key.");
  }
  const seed = Buffer.from(normalized, "hex");
  return Keypair.fromSeed(seed);
}

function ensureBaseUnits(value: string, label: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label}: expected base-unit integer string.`);
  }
  return BigInt(value);
}

function deriveProgramOwner(label: string): PublicKey {
  const digest = createHash("sha256").update(`nex-launchpad:${label}`).digest();
  return new PublicKey(digest.subarray(0, 32));
}

export async function deploySolanaCampaignArtifacts(params: SolanaDeployParams): Promise<SolanaDeployResult> {
  parseSolanaChainRef(params.chainRef);
  ensureBaseUnits(params.targetBaseUnits, "targetBaseUnits");
  ensureBaseUnits(params.minContributionBaseUnits, "minContributionBaseUnits");
  new PublicKey(params.treasuryAddress);

  const rpcUrl = resolveSolanaRpc();
  const connection = new Connection(rpcUrl, "confirmed");
  const deployer = resolveSolanaDeployer();

  const campaignAccount = Keypair.generate();
  const shareAccount = Keypair.generate();
  const campaignSpace = 256;
  const shareSpace = 256;
  const campaignRent = await connection.getMinimumBalanceForRentExemption(campaignSpace);
  const shareRent = await connection.getMinimumBalanceForRentExemption(shareSpace);

  const campaignOwner = deriveProgramOwner("campaign");
  const shareOwner = deriveProgramOwner("share");

  const campaignTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: deployer.publicKey,
      newAccountPubkey: campaignAccount.publicKey,
      lamports: campaignRent,
      space: campaignSpace,
      programId: campaignOwner,
    }),
  );
  const campaignDeployTxHash = await sendAndConfirmTransaction(connection, campaignTx, [deployer, campaignAccount], {
    commitment: "confirmed",
  });

  const shareTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: deployer.publicKey,
      newAccountPubkey: shareAccount.publicKey,
      lamports: shareRent,
      space: shareSpace,
      programId: shareOwner,
    }),
  );
  const shareTokenDeployTxHash = await sendAndConfirmTransaction(connection, shareTx, [deployer, shareAccount], {
    commitment: "confirmed",
  });

  return {
    campaignAddress: campaignAccount.publicKey.toBase58(),
    shareTokenAddress: shareAccount.publicKey.toBase58(),
    campaignDeployTxHash,
    shareTokenDeployTxHash,
    deployerAddress: deployer.publicKey.toBase58(),
  };
}
