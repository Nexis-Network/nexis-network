export type WalletAssetType =
  | "native"
  | "erc20"
  | "erc721"
  | "erc1155"
  | "spl"
  | "spl_nft"
  | "other";

export type WalletAccountRecord = {
  id: string;
  userId: string;
  walletId: string;
  address: string;
  chainId: number | null;
  platform: string | null;
  walletType: string | null;
  provider: string | null;
  metadata: Record<string, UntypedJson>;
  createdAt: string;
  updatedAt: string;
};

export type WalletAccountUpsert = {
  userId: string;
  walletId: string;
  address: string;
  chainId?: number | null;
  platform?: string | null;
  walletType?: string | null;
  provider?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export type WalletPositionRecord = {
  id: number;
  accountId: string;
  assetType: WalletAssetType;
  chainId: number | null;
  contractAddress: string | null;
  tokenId: string | null;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  quantity: string;
  quantityUsd: string | null;
  costBasisUsd: string | null;
  unrealizedPnlUsd: string | null;
  lastPriceUsd: string | null;
  priceChange24h: string | null;
  metadata: Record<string, UntypedJson>;
  updatedAt: string;
};

export type WalletPositionUpsert = {
  accountId: string;
  assetType: WalletAssetType;
  chainId?: number | null;
  contractAddress?: string | null;
  tokenId?: string | null;
  symbol?: string | null;
  name?: string | null;
  decimals?: number | null;
  quantity: string;
  quantityUsd?: string | null;
  costBasisUsd?: string | null;
  unrealizedPnlUsd?: string | null;
  lastPriceUsd?: string | null;
  priceChange24h?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export type WalletPositionSnapshotInsert = {
  accountId: string;
  assetType: WalletAssetType;
  chainId?: number | null;
  contractAddress?: string | null;
  tokenId?: string | null;
  symbol?: string | null;
  snapshotAt?: string;
  quantity: string;
  quantityUsd?: string | null;
  costBasisUsd?: string | null;
  unrealizedPnlUsd?: string | null;
  realizedPnlUsd?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export type WalletTransactionInsert = {
  accountId: string;
  chainId?: number | null;
  hash?: string | null;
  logIndex?: number | null;
  direction: "inbound" | "outbound" | "neutral";
  assetType: WalletAssetType;
  contractAddress?: string | null;
  tokenId?: string | null;
  quantity?: string | null;
  amountUsd?: string | null;
  feeUsd?: string | null;
  realizedPnlUsd?: string | null;
  counterparty?: string | null;
  source?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  occurredAt: string;
};
