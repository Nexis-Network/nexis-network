/**
 * Polymarket Integration Types
 *
 * Derived from:
 * - CLOB Client SDK: https://github.com/Polymarket/clob-client
 * - Gamma API: https://docs.polymarket.com/developers/gamma-markets-api/overview
 * - Data API responses
 * - Bridge API responses
 * - WebSocket event schemas
 */

import type {
  PolymarketOrderType,
  PolymarketTickSize,
  BridgeTxStatus,
} from "./constants";

// ---------------------------------------------------------------------------
// Gamma API Types (Market Discovery)
// ---------------------------------------------------------------------------

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  negRisk: boolean;
  markets: GammaMarket[];
  tags?: string[];
  image?: string;
}

export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  tokens: GammaToken[];
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
  negRisk: boolean;
  endDate?: string;
  image?: string;
  icon?: string;
}

export interface GammaToken {
  token_id: string;
  outcome: string;
  winner: boolean;
}

export interface GammaSearchParams {
  query?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  closed?: boolean;
  active?: boolean;
  order?: string;
  ascending?: boolean;
}

// ---------------------------------------------------------------------------
// CLOB API Types (Trading)
// ---------------------------------------------------------------------------

export interface ClobApiKeyCreds {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface OrderBookSummary {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  hash: string;
  timestamp: string;
}

export interface OrderBookEntry {
  price: string;
  size: string;
}

export interface BookParams {
  token_id: string;
}

export type OrderSide = "BUY" | "SELL";

export interface UserOrder {
  tokenID: string;
  price: number;
  size: number;
  side: OrderSide;
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  taker?: string;
}

export interface CreateOrderOptions {
  tickSize: PolymarketTickSize;
  negRisk?: boolean;
}

export interface SignedOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number;
  signatureType: number;
  signature: string;
}

export interface OrderResponse {
  success: boolean;
  errorMsg?: string;
  orderID: string;
  transactionsHashes?: string[];
  status: string;
  takingAmount?: string;
  makingAmount?: string;
}

export interface OpenOrder {
  id: string;
  asset_id: string;
  market: string;
  side: OrderSide;
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  owner: string;
  order_owner?: string;
  timestamp: string;
  associate_trades?: string[];
  status?: string;
  type?: string;
}

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: OrderSide;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: TradeStatus;
  match_time: string;
  last_update: string;
  outcome: string;
  owner: string;
  trade_owner?: string;
  maker_address?: string;
  transaction_hash?: string;
  bucket_index?: number;
}

export type TradeStatus =
  | "MATCHED"
  | "MINED"
  | "CONFIRMED"
  | "RETRYING"
  | "FAILED";

export interface MarketPrice {
  t: number; // timestamp
  p: string; // price
}

export interface PriceHistoryParams {
  market: string;
  startTs?: number;
  endTs?: number;
  fidelity?: number;
}

export interface BalanceAllowanceResponse {
  balance: string;
  allowance: string;
}

export interface BanStatus {
  is_closed_only: boolean;
  address?: string;
}

// ---------------------------------------------------------------------------
// Data API Types (Positions, Analytics)
// ---------------------------------------------------------------------------

export interface UserPosition {
  asset: string;
  conditionId: string;
  market: string;
  outcome: string;
  outcomeIndex: number;
  size: string;
  avgPrice: string;
  curPrice: string;
  currentValue: string;
  initialValue: string;
  realizedPnl: string;
  unrealizedPnl: string;
  percentPnl: string;
  cashflow: string;
}

export interface UserTrade {
  conditionId: string;
  market: string;
  asset: string;
  outcome: string;
  price: string;
  side: OrderSide;
  size: string;
  fee: string;
  timestamp: string;
  transactionHash?: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Bridge API Types
// ---------------------------------------------------------------------------

export interface DepositAddressResponse {
  evm?: string;
  svm?: string;
  btc?: string;
  tvm?: string;
}

export interface BridgeTransaction {
  fromChainId: string;
  fromTokenAddress: string;
  fromAmountBaseUnit: string;
  toChainId: string;
  toTokenAddress: string;
  status: BridgeTxStatus;
  txHash?: string;
  createdTimeMs?: number;
}

export interface BridgeStatusResponse {
  transactions: BridgeTransaction[];
}

export interface SupportedAsset {
  chainId: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  minimumDeposit: string;
}

// ---------------------------------------------------------------------------
// Geoblock Types
// ---------------------------------------------------------------------------

export interface GeoblockResponse {
  blocked: boolean;
  ip: string;
  country: string;
  region: string;
}

export interface GeoblockStatus {
  blocked: boolean;
  closeOnly: boolean;
  country: string;
  region: string;
}

// ---------------------------------------------------------------------------
// WebSocket Event Types
// Source: https://docs.polymarket.com/market-data/websocket/market-channel
// ---------------------------------------------------------------------------

export interface WssBookEvent {
  event_type: "book";
  asset_id: string;
  market: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: string;
  hash: string;
}

export interface WssPriceChangeEvent {
  event_type: "price_change";
  market: string;
  price_changes: Array<{
    asset_id: string;
    price: string;
    size: string;
    side: OrderSide;
    hash: string;
    best_bid: string;
    best_ask: string;
  }>;
  timestamp: string;
}

export interface WssLastTradePriceEvent {
  event_type: "last_trade_price";
  asset_id: string;
  market: string;
  price: string;
  side: OrderSide;
  size: string;
  fee_rate_bps: string;
  timestamp: string;
}

export interface WssTickSizeChangeEvent {
  event_type: "tick_size_change";
  asset_id: string;
  market: string;
  old_tick_size: string;
  new_tick_size: string;
  timestamp: string;
}

export interface WssBestBidAskEvent {
  event_type: "best_bid_ask";
  market: string;
  asset_id: string;
  best_bid: string;
  best_ask: string;
  spread: string;
  timestamp: string;
}

export interface WssNewMarketEvent {
  event_type: "new_market";
  id: string;
  question: string;
  market: string;
  slug: string;
  description: string;
  assets_ids: string[];
  outcomes: string[];
  event_message: {
    id: string;
    ticker: string;
    slug: string;
    title: string;
    description: string;
  };
  timestamp: string;
}

export interface WssMarketResolvedEvent {
  event_type: "market_resolved";
  id: string;
  question: string;
  market: string;
  slug: string;
  description: string;
  assets_ids: string[];
  outcomes: string[];
  winning_asset_id: string;
  winning_outcome: string;
  event_message: {
    id: string;
    ticker: string;
    slug: string;
    title: string;
    description: string;
  };
  timestamp: string;
}

export type WssMarketEvent =
  | WssBookEvent
  | WssPriceChangeEvent
  | WssLastTradePriceEvent
  | WssTickSizeChangeEvent
  | WssBestBidAskEvent
  | WssNewMarketEvent
  | WssMarketResolvedEvent;

// ---------------------------------------------------------------------------
// User Channel Event Types
// Source: https://docs.polymarket.com/market-data/websocket/user-channel
// ---------------------------------------------------------------------------

export interface WssUserTradeEvent {
  event_type: "trade";
  type: "TRADE";
  id: string;
  taker_order_id: string;
  asset_id: string;
  market: string;
  side: OrderSide;
  size: string;
  price: string;
  outcome: string;
  status: TradeStatus;
  owner: string;
  trade_owner: string;
  timestamp: string;
  matchtime: string;
  last_update: string;
  maker_orders: Array<{
    order_id: string;
    maker_address: string;
    matched_amount: string;
  }>;
}

export interface WssUserOrderEvent {
  event_type: "order";
  type: "PLACEMENT" | "UPDATE" | "CANCELLATION";
  id: string;
  asset_id: string;
  market: string;
  side: OrderSide;
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  owner: string;
  order_owner: string;
  timestamp: string;
  associate_trades?: string[];
}

export type WssUserEvent = WssUserTradeEvent | WssUserOrderEvent;

// ---------------------------------------------------------------------------
// Builder Types
// ---------------------------------------------------------------------------

export interface BuilderConfig {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface BuilderHeaders {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Artifact Payload Types (for emit_artifact)
// ---------------------------------------------------------------------------

export interface MarketListPayload {
  markets: Array<{
    conditionId: string;
    question: string;
    slug: string;
    outcomes: Array<{ name: string; tokenId: string; price: string }>;
    volume: string;
    liquidity: string;
    endDate?: string;
    negRisk: boolean;
    image?: string;
    tags?: string[];
  }>;
  total: number;
  hasMore: boolean;
}

export interface MarketDetailPayload {
  event: {
    id: string;
    title: string;
    description: string;
    slug: string;
  };
  market: {
    conditionId: string;
    question: string;
    slug: string;
    active: boolean;
    closed: boolean;
    negRisk: boolean;
    volume: string;
    liquidity: string;
    endDate?: string;
  };
  outcomes: Array<{
    name: string;
    tokenId: string;
    price: string;
    midpoint?: string;
  }>;
}

export interface OrderbookPayload {
  tokenId: string;
  market: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: string;
  midpoint: string;
  lastPrice?: string;
  hash: string;
  timestamp: string;
}

export interface PriceChartPayload {
  tokenId: string;
  prices: MarketPrice[];
  fidelity: string;
}

export interface PositionsPayload {
  positions: UserPosition[];
  totalValue: string;
  unrealizedPnl: string;
}

export interface TradesPayload {
  trades: UserTrade[];
  total: number;
}

export interface TradePreviewPayload {
  market: {
    conditionId: string;
    question: string;
  };
  order: {
    tokenId: string;
    side: OrderSide;
    price: number;
    size: number;
    orderType: PolymarketOrderType;
    tickSize: PolymarketTickSize;
    negRisk: boolean;
  };
  estimate: {
    cost: string;
    fees: string;
    total: string;
    potentialPayout: string;
  };
  approvalToken: string;
}

export interface OrderStatusPayload {
  orderId: string;
  status: string;
  side: OrderSide;
  price: string;
  size: string;
  sizeMatched: string;
  txHashes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BridgeStatusPayload {
  depositAddress: string;
  transactions: BridgeTransaction[];
}

export interface DepositInfoPayload {
  addresses: DepositAddressResponse;
  supportedAssets: SupportedAsset[];
}

export interface GeoBlockedPayload {
  blocked: boolean;
  closeOnly: boolean;
  country: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationPayload<T> {
  data: T[];
  next_cursor: string;
  limit: number;
  count: number;
}
