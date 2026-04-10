// Type definitions for Birdeye API responses
// Generated for TypeScript strict mode compliance

export interface BirdeyeTokenOverview {
  address: string;
  name?: string;
  symbol?: string;
  price?: number;
  priceChange24hPercent?: number;
  priceChange1hPercent?: number;
  priceChange7dPercent?: number;
  liquidity?: number;
  v24hUSD?: number;
  v24h?: number;
  buy24h?: number;
  buy24hUSD?: number;
  sell24h?: number;
  sell24hUSD?: number;
  uniqueWallet24h?: number;
  trade24h?: number;
  circulatingSupply?: number;
  supply?: number;
  maxSupply?: number;
  fdv?: number;
  mc?: number;
  rank?: number;
  logoURI?: string;
  extensions?: {
    description?: string;
    website?: string;
  };
}

export interface BirdeyeTokenMarketRow {
  address: string;
  name?: string;
  symbol?: string;
  logoURI?: string;
  logo_uri?: string;
  price?: number;
  value?: number;
  priceChange24hPercent?: number;
  price_change_24h_percent?: number;
  priceChange1hPercent?: number;
  price_change_1h_percent?: number;
  priceChange7dPercent?: number;
  price_change_7d_percent?: number;
  v24hChangePercent?: number;
  v1hChangePercent?: number;
  v7dChangePercent?: number;
  liquidity?: number;
  mc?: number;
  market_cap?: number;
  rank?: number;
  v24hUSD?: number;
  volume24hUSD?: number;
  volume_24h_usd?: number;
  circulatingSupply?: number;
  supply?: number;
  fdv?: number;
}

export interface BirdeyeMultiPriceResponse {
  [address: string]: {
    value: number;
    updateUnixTime: number;
    updateHumanTime: string;
    priceChange24h: number;
  };
}

export interface BirdeyeMarketItem {
  address: string;
  name?: string;
  source?: string;
  base?: {
    address: string;
    symbol: string;
    decimals: number;
    icon?: string;
  };
  quote?: {
    address: string;
    symbol: string;
    decimals: number;
    icon?: string;
  };
  liquidity?: number;
  volume24hUSD?: number;
  volume24h?: number;
  price?: number;
  priceChange24h?: number;
  trade24h?: number;
  uniqueWallet24h?: number;
}

export interface BirdeyeTokenListResponse {
  tokens?: BirdeyeTokenMarketRow[];
}

export interface BirdeyeSearchResponse {
  items?: Array<{
    type: string;
    result: UntypedJson[];
  }>;
}

export interface BirdeyeTrendingResponse {
  tokens?: BirdeyeTokenMarketRow[];
}

export interface BirdeyeHistoryPriceResponse {
  items: Array<{
    unixTime: number;
    value: number;
  }>;
}

export interface BirdeyeOhlcvResponse {
  items: Array<{
    unixTime: number;
    v: number;
  }>;
}

export interface BirdeyeTokenHoldersResponse {
  items: Array<{
    amount: string;
    decimals: number;
    mint: string;
    owner: string;
    token_account: string;
    ui_amount: number;
  }>;
}

export interface BirdeyeTokenTransactionsResponse {
  items: Array<{
    txHash?: string;
    hash?: string;
    tx_hash?: string;
    blockUnixTime?: number;
    blockTime?: number;
    block_time?: number;
    side?: string;
    base?: {
      uiAmount?: number;
      symbol?: string;
    };
    baseAmount?: number;
    base_amount?: number;
    baseSymbol?: string;
    quote?: {
      uiAmount?: number;
      symbol?: string;
    };
    quoteAmount?: number;
    quote_amount?: number;
    quoteSymbol?: string;
    basePrice?: number;
    tokenPrice?: number;
    source?: string;
    exchangeName?: string;
    owner?: string;
    from?: string;
    usdValue?: number;
  }>;
}

export interface BirdeyeTokenSecurityResponse {
  creatorAddress?: string;
  creationTime?: number;
  creationTx?: string;
  mintTx?: string;
  deployerBalance?: number;
  ownerBalance?: number;
  isTrueToken?: boolean;
  isHoneypot?: boolean;
}

export interface BirdeyeWalletTokenListResponse {
  items?: Array<{
    address: string;
    decimals: number;
    balance: number;
    uiAmount: number;
    value: number;
    price: number;
    symbol: string;
    name: string;
    logoURI?: string;
    icon?: string;
  }>;
}

export interface BirdeyeWalletTransactionsResponse {
  items: UntypedJson[];
}

export interface BirdeyeWalletNetWorthResponse {
  totalUsd: number;
}

export interface BirdeyeWalletHistoryResponse {
  items: Array<{
    unixTime: number;
    value: number;
  }>;
}

export interface BirdeyeNewListingResponse {
  items: BirdeyeTokenMarketRow[];
}

export interface BirdeyeMarketListResponse {
  items: BirdeyeMarketItem[];
}
