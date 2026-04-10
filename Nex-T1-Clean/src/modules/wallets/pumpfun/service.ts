import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

import { Commitment, Connection, Finality, Keypair, PublicKey } from "@solana/web3.js";
import type { AnchorProvider } from "@coral-xyz/anchor";
import type {
  CreateTokenMetadata,
  PriorityFee,
  PumpFunSDK,
  TransactionResult,
} from "pumpdotfun-sdk";

export type PumpFunCluster = "mainnet-beta" | "devnet";

export type PumpFunPriorityFee = PriorityFee;

type PumpFunEnvironmentConfig = {
  rpcUrl: string;
  commitment: Commitment;
  finality: Finality;
  priorityFees?: PumpFunPriorityFee;
};

type CreateAndBuyInput = {
  cluster: PumpFunCluster;
  creator: Keypair;
  mint: Keypair;
  metadata: {
    name: string;
    symbol: string;
    description?: string;
    filePath?: string;
    uri?: string;
  };
  buyAmountLamports: bigint;
  slippageBasisPoints?: bigint;
  priorityFees?: PumpFunPriorityFee | null;
  commitment?: Commitment;
  finality?: Finality;
};

type BuyInput = {
  cluster: PumpFunCluster;
  buyer: Keypair;
  mint: PublicKey;
  buyAmountLamports: bigint;
  slippageBasisPoints?: bigint;
  priorityFees?: PumpFunPriorityFee | null;
  commitment?: Commitment;
  finality?: Finality;
};

type SellInput = {
  cluster: PumpFunCluster;
  seller: Keypair;
  mint: PublicKey;
  sellTokenAmount: bigint;
  slippageBasisPoints?: bigint;
  priorityFees?: PumpFunPriorityFee | null;
  commitment?: Commitment;
  finality?: Finality;
};

const DEFAULT_SLIPPAGE_BASIS_POINTS = 500n;
const PUMPFUN_METADATA_ASSET_ROOT = path.join(process.cwd(), "public");
const DEFAULT_COMMITMENT: Commitment = "confirmed";
const DEFAULT_FINALITY: Finality = "finalized";

const sdkCache = new Map<string, PumpFunSDK>();
const providerCache = new Map<string, AnchorProvider>();
let pumpFunRuntimePromise:
  | Promise<{
      AnchorProvider: typeof import("@coral-xyz/anchor").AnchorProvider;
      NodeWallet: typeof import("@coral-xyz/anchor/dist/cjs/nodewallet").default;
      PumpFunSDK: typeof import("pumpdotfun-sdk").PumpFunSDK;
    }>
  | null = null;

const MAINNET_ENV_VARS = {
  rpcUrl: [
    "PUMPFUN_MAINNET_RPC_URL",
    "SOLANA_MAINNET_RPC_URL",
    "HELIUS_RPC_URL",
    "NEXT_PUBLIC_HELIUS_RPC_URL",
  ] as const,
  priorityUnitLimit: "PUMPFUN_MAINNET_PRIORITY_UNIT_LIMIT",
  priorityUnitPrice: "PUMPFUN_MAINNET_PRIORITY_UNIT_PRICE",
};

const DEVNET_ENV_VARS = {
  rpcUrl: [
    "PUMPFUN_DEVNET_RPC_URL",
    "SOLANA_DEVNET_RPC_URL",
    "HELIUS_DEVNET_RPC_URL",
  ] as const,
  priorityUnitLimit: "PUMPFUN_DEVNET_PRIORITY_UNIT_LIMIT",
  priorityUnitPrice: "PUMPFUN_DEVNET_PRIORITY_UNIT_PRICE",
};

function readEnv(vars: readonly string[], fallback?: string): string | null {
  for (const key of vars) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback ?? null;
}

function readNumberEnv(key: string, fallback?: number): number | null {
  const raw = process.env[key];
  if (!raw) return fallback ?? null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback ?? null;
}

function getEnvironmentConfig(cluster: PumpFunCluster): PumpFunEnvironmentConfig {
  const source = cluster === "mainnet-beta" ? MAINNET_ENV_VARS : DEVNET_ENV_VARS;
  const rpc =
    readEnv(source.rpcUrl, cluster === "mainnet-beta"
      ? "https://rpc.ankr.com/solana"
      : "https://api.devnet.solana.com") ?? "";

  const unitLimit = readNumberEnv(source.priorityUnitLimit);
  const unitPrice = readNumberEnv(source.priorityUnitPrice);

  const priorityFees =
    unitLimit != null && unitPrice != null
      ? {
          unitLimit,
          unitPrice,
        }
      : undefined;

  return {
    rpcUrl: rpc,
    commitment: DEFAULT_COMMITMENT,
    finality: DEFAULT_FINALITY,
    priorityFees,
  };
}

function cacheKey(cluster: PumpFunCluster) {
  return cluster;
}

async function loadPumpFunRuntime() {
  if (!pumpFunRuntimePromise) {
    pumpFunRuntimePromise = Promise.all([
      import("@coral-xyz/anchor"),
      import("@coral-xyz/anchor/dist/cjs/nodewallet"),
      import("pumpdotfun-sdk"),
    ]).then(([anchorModule, nodeWalletModule, pumpFunModule]) => ({
      AnchorProvider: anchorModule.AnchorProvider,
      NodeWallet: nodeWalletModule.default,
      PumpFunSDK: pumpFunModule.PumpFunSDK,
    }));
  }

  return pumpFunRuntimePromise;
}

async function ensureProvider(cluster: PumpFunCluster): Promise<AnchorProvider> {
  const key = cacheKey(cluster);
  const cached = providerCache.get(key);
  if (cached) {
    return cached;
  }
  const { AnchorProvider, NodeWallet } = await loadPumpFunRuntime();
  const config = getEnvironmentConfig(cluster);
  const connection = new Connection(config.rpcUrl, config.commitment);
  const wallet = new NodeWallet(new Keypair());
  const provider = new AnchorProvider(connection, wallet, { commitment: config.commitment });
  providerCache.set(key, provider);
  return provider;
}

async function ensureSdk(cluster: PumpFunCluster): Promise<PumpFunSDK> {
  const key = cacheKey(cluster);
  const cached = sdkCache.get(key);
  if (cached) {
    return cached;
  }
  const [{ PumpFunSDK }, provider] = await Promise.all([
    loadPumpFunRuntime(),
    ensureProvider(cluster),
  ]);
  const sdk = new PumpFunSDK(provider);
  sdkCache.set(key, sdk);
  return sdk;
}

export async function getPumpFunSdk(cluster: PumpFunCluster = "mainnet-beta"): Promise<PumpFunSDK> {
  return ensureSdk(cluster);
}

export async function getPumpFunConnection(cluster: PumpFunCluster = "mainnet-beta"): Promise<Connection> {
  const provider = await ensureProvider(cluster);
  return provider.connection;
}

export function getDefaultPriorityFees(cluster: PumpFunCluster = "mainnet-beta"): PumpFunPriorityFee | undefined {
  return getEnvironmentConfig(cluster).priorityFees;
}

function withPriorityFees(
  cluster: PumpFunCluster,
  override?: PumpFunPriorityFee | null,
): PumpFunPriorityFee | undefined {
  if (override === null) return undefined;
  if (override && typeof override.unitLimit === "number" && typeof override.unitPrice === "number") {
    return override;
  }
  return getDefaultPriorityFees(cluster);
}

function resolveCommitment(requested?: Commitment): Commitment {
  return requested ?? DEFAULT_COMMITMENT;
}

function resolveFinality(requested?: Finality): Finality {
  return requested ?? DEFAULT_FINALITY;
}

export async function createAndBuyToken(input: CreateAndBuyInput): Promise<TransactionResult> {
  const {
    cluster,
    creator,
    mint,
    metadata,
    buyAmountLamports,
    slippageBasisPoints = DEFAULT_SLIPPAGE_BASIS_POINTS,
    priorityFees,
    commitment,
    finality,
  } = input;

  const sdk = await getPumpFunSdk(cluster);
  const resolvedPriority = withPriorityFees(cluster, priorityFees);

  return sdk.createAndBuy(
    creator,
    mint,
    await buildCreateTokenMetadata(metadata),
    buyAmountLamports,
    slippageBasisPoints,
    resolvedPriority ?? undefined,
    resolveCommitment(commitment),
    resolveFinality(finality),
  );
}

export async function buyTokens(input: BuyInput): Promise<TransactionResult> {
  const {
    cluster,
    buyer,
    mint,
    buyAmountLamports,
    slippageBasisPoints = DEFAULT_SLIPPAGE_BASIS_POINTS,
    priorityFees,
    commitment,
    finality,
  } = input;
  const sdk = await getPumpFunSdk(cluster);
  const resolvedPriority = withPriorityFees(cluster, priorityFees);

  return sdk.buy(
    buyer,
    mint,
    buyAmountLamports,
    slippageBasisPoints,
    resolvedPriority ?? undefined,
    resolveCommitment(commitment),
    resolveFinality(finality),
  );
}

function inferMimeType(filePath: string | null | undefined): string {
  if (!filePath) {
    return "application/octet-stream";
  }
  const normalized = filePath.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

async function loadBlobFromFileSystem(filePath: string): Promise<Blob> {
  const absolute = resolvePumpFunMetadataFilePath(filePath);
  const buffer = await readFile(absolute);
  return new Blob([buffer], { type: inferMimeType(filePath) });
}

export function resolvePumpFunMetadataFilePath(filePath: string): string {
  const normalizedInput = filePath.trim();
  if (normalizedInput.length === 0) {
    throw new Error("Pump.fun metadata.filePath must be a non-empty path.");
  }

  if (path.isAbsolute(normalizedInput)) {
    return normalizedInput;
  }

  const safeRelative = normalizedInput.replace(/^[/\\]+/, "");
  const resolved = path.resolve(PUMPFUN_METADATA_ASSET_ROOT, safeRelative);
  const root = `${path.resolve(PUMPFUN_METADATA_ASSET_ROOT)}${path.sep}`;

  if (resolved !== path.resolve(PUMPFUN_METADATA_ASSET_ROOT) && !resolved.startsWith(root)) {
    throw new Error("Pump.fun metadata.filePath must stay within the public/ directory when using a relative path.");
  }

  return resolved;
}

async function loadBlobFromUri(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata asset from ${uri}: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const type = blob.type && blob.type !== "" ? blob.type : inferMimeType(uri);
  if (type !== blob.type && blob.size > 0) {
    // Re-wrap blob with inferred type to aid downstream consumers.
    const arrayBuffer = await blob.arrayBuffer();
    return new Blob([arrayBuffer], { type });
  }
  return blob;
}

async function buildCreateTokenMetadata(metadata: CreateAndBuyInput["metadata"]): Promise<CreateTokenMetadata> {
  if (!metadata.filePath && !metadata.uri) {
    throw new Error("Pump.fun create_and_buy requires either metadata.filePath or metadata.uri for the token image.");
  }

  const file =
    metadata.filePath != null
      ? await loadBlobFromFileSystem(metadata.filePath)
      : await loadBlobFromUri(metadata.uri!);

  return {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description ?? "",
    file,
  };
}

export async function sellTokens(input: SellInput): Promise<TransactionResult> {
  const {
    cluster,
    seller,
    mint,
    sellTokenAmount,
    slippageBasisPoints = DEFAULT_SLIPPAGE_BASIS_POINTS,
    priorityFees,
    commitment,
    finality,
  } = input;
  const sdk = await getPumpFunSdk(cluster);
  const resolvedPriority = withPriorityFees(cluster, priorityFees);

  return sdk.sell(
    seller,
    mint,
    sellTokenAmount,
    slippageBasisPoints,
    resolvedPriority ?? undefined,
    resolveCommitment(commitment),
    resolveFinality(finality),
  );
}

export async function getGlobalAccount(cluster: PumpFunCluster = "mainnet-beta") {
  const sdk = await getPumpFunSdk(cluster);
  return sdk.getGlobalAccount();
}

export async function getBondingCurveAccount(cluster: PumpFunCluster, mint: PublicKey) {
  const sdk = await getPumpFunSdk(cluster);
  return sdk.getBondingCurveAccount(mint);
}

export function generateOperationId() {
  return `pumpfun_${randomUUID()}`;
}
