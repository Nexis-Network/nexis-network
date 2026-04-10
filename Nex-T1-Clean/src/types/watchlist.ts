import type { NotificationItem } from "@/lib/notifications";
import type { JsonObject } from "@/types/json";

export type WatchlistAssetType =
  | "crypto"
  | "nft"
  | "EVM_ERC20"
  | "EVM_NFT"
  | "SOL_SPL"
  | "SOL_NFT"
  | "UNKNOWN";

export type WatchlistEnrichmentSnapshot = {
  chainName: string;
  chainId?: number | null;
  addressOrMint: string;
  tokenId?: string | null;
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  liquidityUsd?: number | null;
  decimals?: number | null;
  metadata?: JsonObject;
  source: string;
  timestamp: string;
  stalenessSeconds: number;
};

export type WatchlistItemSnapshot = {
  id: string;
  watchlistId: string;
  assetId: string;
  assetType: WatchlistAssetType;
  chainId?: number | null;
  chainName?: string | null;
  addressOrMint?: string | null;
  tokenId?: string | null;
  symbol?: string | null;
  name?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  sourceSite?: string | null;
  sourceUrl?: string | null;
  confidence?: number | null;
  evidence?: JsonObject[] | null;
  source: string;
  metadata: JsonObject;
  lastPrice?: number | null;
  lastPriceChangePct?: number | null;
  lastVolume?: number | null;
  lastVolumeChangePct?: number | null;
  lastSnapshotAt?: string | null;
  priceBaseline?: number | null;
  priceBaselineAt?: string | null;
  volumeBaseline?: number | null;
  volumeBaselineAt?: string | null;
  createdAt: string;
  updatedAt: string;
  quote?: WatchlistQuote;
  enrichment?: WatchlistEnrichmentSnapshot | null;
};

export type WatchlistQuote = {
  assetId: string;
  assetType: WatchlistAssetType;
  vsCurrency: string;
  price?: number | null;
  priceChangePct?: number | null;
  volume24h?: number | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
  vendor?: string;
};

export type WatchlistSummary = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
  items: WatchlistItemSnapshot[];
};

export type WatchlistResponse = {
  watchlist: WatchlistSummary | null;
  stats: {
    totalItems: number;
    currency: string;
    updatedAt: string;
  };
};

export type WatchlistAddPayload = {
  assetId?: string | null;
  assetType: WatchlistAssetType;
  chainName?: string | null;
  chainId?: number | null;
  addressOrMint?: string | null;
  tokenId?: string | null;
  symbol?: string | null;
  name?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  source?: string;
  sourceSite?: string | null;
  sourceUrl?: string | null;
  confidence?: number | null;
  evidence?: JsonObject[] | null;
  metadata?: JsonObject;
};

export type WatchlistNotification = NotificationItem & {
  source: "watchlist";
  metadata?: NotificationItem["metadata"] & {
    assetId?: string;
    assetType?: WatchlistAssetType;
  };
};
