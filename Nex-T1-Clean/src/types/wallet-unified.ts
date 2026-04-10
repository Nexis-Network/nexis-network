export type UnifiedEvmChain = { kind: "evm"; chain: `0x${string}` };
export type UnifiedSolanaChain = { kind: "solana"; network: "mainnet" | "devnet" };

export type UnifiedChain = UnifiedEvmChain | UnifiedSolanaChain;

export type UnifiedAssetKind = "native" | "token";

export type UnifiedFungibleAsset = {
  id: string;
  chain: UnifiedChain;
  kind: UnifiedAssetKind;
  address: string | null;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  balance: string;
  balanceFormatted: string | null;
  priceUsd: number | null;
  valueUsd: number | null;
  logoUrl: string | null;
  change24hPercent: number | null;
  isSpam: boolean | null;
};

export type UnifiedNFTAsset = {
  id: string;
  chain: UnifiedChain;
  collectionAddress: string | null;
  tokenId: string | null;
  mint: string | null;
  name: string | null;
  collectionName: string | null;
  description: string | null;
  imageUrl: string | null;
  animationUrl: string | null;
  amount: string | null;
  isSpam: boolean | null;
  raw: Record<string, UntypedJson> | null;
};

export type UnifiedTransactionDirection = "in" | "out" | "self" | "unknown";

export type UnifiedTransaction = {
  id: string;
  chain: UnifiedChain;
  hash: string;
  timestamp: string | null;
  from: string | null;
  to: string | null;
  direction: UnifiedTransactionDirection;
  category: "swap" | "transfer" | "contract" | "nft" | "unknown";
  summary: string | null;
  valueUsd: number | null;
  raw: Record<string, UntypedJson> | null;
};

export type UnifiedPnLMode = "moralis" | "approximation";

export type UnifiedPnL = {
  chain: UnifiedChain;
  mode: UnifiedPnLMode;
  calculationVersion: string;
  asOf: string;
  currency: "usd";
  realizedUsd: number | null;
  unrealizedUsd: number | null;
  totalUsd: number | null;
  costBasisUsd: number | null;
  roiPercent: number | null;
  confidence: "high" | "medium" | "low";
  limitations: string[];
  raw: Record<string, UntypedJson> | null;
};
