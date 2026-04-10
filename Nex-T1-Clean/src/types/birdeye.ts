export interface BirdeyeResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// --- V1 Endpoints ---

export interface TokenListToken {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name?: string;
  symbol?: string;
  icon?: string;
  logoURI?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface TokenListResponse {
  updateUnixTime: number;
  updateTime: string;
  wallet: string;
  totalUsd: number;
  items: TokenListToken[];
}

export interface TransactionHistoryItem {
  txHash: string;
  blockNumber: number;
  blockTime: string;
  status: boolean;
  from: string;
  to: string;
  fee: number;
  mainAction: string;
  balanceChange: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    amount: number;
    logoURI?: string;
  }[];
}

export interface TransactionListResponse {
  items: TransactionHistoryItem[];
  hasNext: boolean;
  offset: number;
  limit: number;
}

// --- V2 Endpoints ---

export interface WalletNetWorth {
  wallet: string;
  totalUsd: number;
}

export interface WalletNetWorthResponse {
  updateUnixTime: number;
  updateTime: string;
  wallet: string;
  totalUsd: number;
}

export interface TokenPnL {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  balance: number;
  value: number;
  initialBuyPrice: number;
  avgBuyPrice: number;
  pnl: number;
  pnlPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

// --- V3 Endpoints (DeFi) ---

export interface SearchTokenResult {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  fdv: number;
  liquidity: number;
  volume24h: number;
  logoURI?: string;
}

export interface SearchResponse {
  items: {
    type: 'token' | 'pair' | 'wallet';
    result: SearchTokenResult[];
  }[];
}
