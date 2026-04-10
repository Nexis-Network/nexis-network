import type { TokenAssetInfo } from "@/modules/tokens/types";

export interface PortfolioTokenItem {
  asset: TokenAssetInfo;
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string;
  usd_price: number;
  usd_price_24hr_percent_change: number;
  usd_price_7d_percent_change?: number;
  usd_value: number;
  chainId: string;
  priceHistory: number[];
  isDefault?: boolean;
  isCustom?: boolean;
}

export interface FetchedPortfolioToken {
  token_address: string;
  name?: string;
  symbol?: string;
  logo?: string;
  thumbnail?: string;
  decimals?: number;
  balance?: string;
  usd_price?: number;
  usd_price_24hr_percent_change?: number;
  usd_price_7d_percent_change?: number;
  usd_value?: number;
  chainId: number;
  priceHistory?: number[];
}
