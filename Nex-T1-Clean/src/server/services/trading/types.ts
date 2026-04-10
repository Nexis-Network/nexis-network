/**
 * Trading Types
 *
 * Domain: trading
 * Responsibility: TypeScript type definitions for the CCXT trading service
 * Depends on: ccxt types
 *
 * Implements Unified API types per Authoritative Reference Index
 */

import type { Order as CCXTOrder } from 'ccxt';

// ============================================================================
// EXCHANGE CONFIGURATION
// ============================================================================

/** Supported exchange identifiers (Unified API compatible) */
export type ExchangeId =
  | 'binance'
  | 'coinbase'
  | 'kraken'
  | 'bybit'
  | 'okx'
  | 'bitfinex'
  | 'huobi'
  | 'kucoin'
  | 'gemini';

/** Exchange configuration metadata */
export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  logoUrl: string;
  supportsFutures: boolean;
  supportsSpot: boolean;
  requiresPassphrase: boolean;
  testnetAvailable: boolean;
  defaultFeeRate: number; // Maker fee as decimal
}

/** Registry of supported exchanges */
export const EXCHANGE_CONFIGS: Record<ExchangeId, ExchangeConfig> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    logoUrl: '/logos/exchanges/binance.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: true,
    defaultFeeRate: 0.001,
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Pro',
    logoUrl: '/logos/exchanges/coinbase.svg',
    supportsFutures: false,
    supportsSpot: true,
    requiresPassphrase: true,
    testnetAvailable: true,
    defaultFeeRate: 0.006,
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    logoUrl: '/logos/exchanges/kraken.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: false,
    defaultFeeRate: 0.0026,
  },
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    logoUrl: '/logos/exchanges/bybit.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: true,
    defaultFeeRate: 0.001,
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    logoUrl: '/logos/exchanges/okx.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: true,
    testnetAvailable: true,
    defaultFeeRate: 0.001,
  },
  bitfinex: {
    id: 'bitfinex',
    name: 'Bitfinex',
    logoUrl: '/logos/exchanges/bitfinex.svg',
    supportsFutures: false,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: false,
    defaultFeeRate: 0.002,
  },
  huobi: {
    id: 'huobi',
    name: 'Huobi',
    logoUrl: '/logos/exchanges/huobi.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: false,
    defaultFeeRate: 0.002,
  },
  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    logoUrl: '/logos/exchanges/kucoin.svg',
    supportsFutures: true,
    supportsSpot: true,
    requiresPassphrase: true,
    testnetAvailable: true,
    defaultFeeRate: 0.001,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    logoUrl: '/logos/exchanges/gemini.svg',
    supportsFutures: false,
    supportsSpot: true,
    requiresPassphrase: false,
    testnetAvailable: true,
    defaultFeeRate: 0.0035,
  },
};

// ============================================================================
// ORDER TYPES
// ============================================================================

/** Order types supported by Unified API */
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'stop_loss_limit' | 'take_profit' | 'take_profit_limit';

/** Order side */
export type OrderSide = 'buy' | 'sell';

/** Order status */
export type OrderStatus = 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';

/** Margin mode for perpetuals */
export type MarginMode = 'cross' | 'isolated';

/** Position side for hedge mode */
export type PositionSide = 'long' | 'short' | 'both';

// ============================================================================
// ORDER PARAMETERS
// ============================================================================

/** Base order parameters (shared between spot and perpetual) */
export interface BaseOrderParams {
  exchangeId: ExchangeId;
  symbol: string; // e.g., 'BTC/USDT'
  side: OrderSide;
  type: OrderType;
  amount: string; // String to preserve precision
  price?: string; // Required for limit orders
  clientOrderId?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PO';
}

/** Spot order parameters */
export interface SpotOrderParams extends BaseOrderParams {
  orderClass: 'spot';
}

/** Perpetual/Futures order parameters */
export interface PerpetualOrderParams extends BaseOrderParams {
  orderClass: 'perpetual';
  leverage?: number; // 1-125 depending on exchange
  marginMode?: MarginMode;
  reduceOnly?: boolean;
  positionSide?: PositionSide;
  stopPrice?: string; // For stop orders
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

/** Unified Order type (Spot + Perpetual) */
export type CreateOrderParams = SpotOrderParams | PerpetualOrderParams;

/** Type guard for perpetual orders */
export function isPerpetualOrder(params: CreateOrderParams): params is PerpetualOrderParams {
  return params.orderClass === 'perpetual';
}

// ============================================================================
// ORDER RESULTS
// ============================================================================

/** Fee information */
export interface OrderFee {
  cost: string;
  currency: string;
  rate?: number;
}

/** Order result from exchange */
export interface OrderResult {
  id: string;
  clientOrderId?: string;
  exchangeId: ExchangeId;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: string;
  price?: string;
  averagePrice?: string;
  filled: string;
  remaining: string;
  cost: string; // Total cost in quote currency
  status: OrderStatus;
  timestamp: number;
  datetime: string;
  fee?: OrderFee;
  trades?: TradeResult[];
  info?: CCXTOrder; // Raw exchange response
}

/** Individual trade/fill */
export interface TradeResult {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: string;
  amount: string;
  cost: string;
  fee?: OrderFee;
  timestamp: number;
}

// ============================================================================
// CREDENTIALS
// ============================================================================

/** User exchange credentials (decrypted at runtime) */
export interface ExchangeCredentials {
  exchangeId: ExchangeId;
  apiKey: string;
  secret: string;
  passphrase?: string;
  isTestnet?: boolean;
}

/** User exchange record (from database) */
export interface UserExchangeRecord {
  id: string;
  userId: string;
  exchangeId: ExchangeId;
  label: string;
  isActive: boolean;
  isTestnet: boolean;
  permissions: ExchangePermissions;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** API key permissions */
export interface ExchangePermissions {
  spot: boolean;
  futures: boolean;
  withdraw: boolean;
}

// ============================================================================
// NFT ORDERS (Opensea/Blur)
// ============================================================================

/** NFT marketplace */
export type NFTMarketplace = 'opensea' | 'blur' | 'magiceden';

/** NFT order action */
export type NFTOrderAction = 'buy' | 'sell' | 'bid' | 'list' | 'cancel';

/** NFT Order parameters */
export interface NFTOrderParams {
  marketplace: NFTMarketplace;
  chain: 'ethereum' | 'polygon' | 'solana' | 'base';
  collectionSlug?: string;
  contractAddress: string;
  tokenId: string;
  action: NFTOrderAction;
  price?: string;
  currency?: 'eth' | 'weth' | 'usdc' | 'sol';
  expirationTime?: number; // Unix timestamp
  quantity?: number; // For ERC-1155
}

/** NFT order result */
export interface NFTOrderResult {
  orderId?: string;
  transactionHash?: string;
  marketplace: NFTMarketplace;
  action: NFTOrderAction;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  contractAddress: string;
  tokenId: string;
  price?: string;
  currency?: string;
  timestamp: number;
}

// ============================================================================
// SERVICE ERRORS
// ============================================================================

/** Trading service error codes */
export type TradingErrorCode =
  | 'EXCHANGE_NOT_CONNECTED'
  | 'INVALID_CREDENTIALS'
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_ORDER'
  | 'ORDER_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'EXCHANGE_ERROR'
  | 'PRECISION_ERROR';

/** Trading service error */
export class TradingError extends Error {
  constructor(
    public readonly code: TradingErrorCode,
    message: string,
    public readonly exchangeId?: ExchangeId,
    public readonly details?: Record<string, UntypedJson>
  ) {
    super(message);
    this.name = 'TradingError';
  }
}
