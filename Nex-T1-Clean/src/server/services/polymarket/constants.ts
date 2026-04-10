/**
 * Polymarket Integration Constants
 *
 * All URLs and contract addresses are from official Polymarket documentation:
 * https://docs.polymarket.com/resources/contract-addresses
 * https://docs.polymarket.com/api-reference/rate-limits
 */

// ---------------------------------------------------------------------------
// API Base URLs
// ---------------------------------------------------------------------------

export const POLYMARKET_GAMMA_URL =
  process.env.POLYMARKET_GAMMA_URL ?? "https://gamma-api.polymarket.com";

export const POLYMARKET_CLOB_URL =
  process.env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com";

export const POLYMARKET_DATA_URL =
  process.env.POLYMARKET_DATA_URL ?? "https://data-api.polymarket.com";

export const POLYMARKET_BRIDGE_URL =
  process.env.POLYMARKET_BRIDGE_URL ?? "https://bridge.polymarket.com";

export const POLYMARKET_GEOBLOCK_URL = "https://polymarket.com/api/geoblock";

// ---------------------------------------------------------------------------
// WebSocket URLs
// ---------------------------------------------------------------------------

export const POLYMARKET_WSS_MARKET =
  process.env.POLYMARKET_WSS_URL
    ? `${process.env.POLYMARKET_WSS_URL}/market`
    : "wss://ws-subscriptions-clob.polymarket.com/ws/market";

export const POLYMARKET_WSS_USER =
  process.env.POLYMARKET_WSS_URL
    ? `${process.env.POLYMARKET_WSS_URL}/user`
    : "wss://ws-subscriptions-clob.polymarket.com/ws/user";

// ---------------------------------------------------------------------------
// Chain & Contract Addresses (Polygon mainnet, Chain ID 137)
// Source: https://docs.polymarket.com/resources/contract-addresses
// ---------------------------------------------------------------------------

export const POLYMARKET_CHAIN_ID = Number(process.env.POLYMARKET_CHAIN_ID ?? 137);

export const POLYMARKET_CONTRACTS = {
  /** Standard market order matching and settlement */
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  /** Order matching for negative risk (multi-outcome) markets */
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
  /** Converts No tokens across outcomes in multi-outcome markets */
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
  /** ERC1155 token storage — split, merge, and redeem operations */
  CONDITIONAL_TOKENS: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
  /** Collateral token (6 decimals) */
  USDC_E: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  /** Deploys Safe wallets */
  GNOSIS_SAFE_FACTORY: "0xaacfeea03eb1561c4e67d661e40682bd20e3541b",
  /** Deploys proxy wallets */
  PROXY_FACTORY: "0xaB45c5A4B0c941a2F231C04C3f49182e1A254052",
} as const;

// ---------------------------------------------------------------------------
// Signature Types
// Source: https://docs.polymarket.com/api-reference/authentication
// ---------------------------------------------------------------------------

export const POLYMARKET_SIGNATURE_TYPE = {
  /** EOA — user pays gas, must manually set allowances */
  EOA: 0,
  /** Polymarket Proxy Wallet — Magic/email login, auto-deploy */
  POLY_PROXY: 1,
  /** Gnosis Safe — explicit deploy via relayer, recommended for builders */
  GNOSIS_SAFE: 2,
} as const;

export type PolymarketSignatureType =
  (typeof POLYMARKET_SIGNATURE_TYPE)[keyof typeof POLYMARKET_SIGNATURE_TYPE];

// ---------------------------------------------------------------------------
// Order Types
// Source: https://docs.polymarket.com/trading/orders/create
// ---------------------------------------------------------------------------

export const POLYMARKET_ORDER_TYPE = {
  /** Good-Til-Cancelled — rests on book until filled or cancelled */
  GTC: "GTC",
  /** Good-Til-Date — active until a specified expiration time */
  GTD: "GTD",
  /** Fill-Or-Kill — must fill immediately and entirely, or cancel */
  FOK: "FOK",
  /** Fill-And-Kill — fills what's available, cancels the rest */
  FAK: "FAK",
} as const;

export type PolymarketOrderType =
  (typeof POLYMARKET_ORDER_TYPE)[keyof typeof POLYMARKET_ORDER_TYPE];

// ---------------------------------------------------------------------------
// Tick Sizes
// ---------------------------------------------------------------------------

export const POLYMARKET_TICK_SIZES = ["0.1", "0.01", "0.001", "0.0001"] as const;
export type PolymarketTickSize = (typeof POLYMARKET_TICK_SIZES)[number];

// ---------------------------------------------------------------------------
// Rate Limit Budgets (requests per 10s unless noted)
// Source: https://docs.polymarket.com/api-reference/rate-limits
// ---------------------------------------------------------------------------

export const POLYMARKET_RATE_LIMITS = {
  GAMMA_GENERAL: 4_000,
  GAMMA_EVENTS: 500,
  GAMMA_MARKETS: 300,
  CLOB_GENERAL: 9_000,
  CLOB_BOOK: 1_500,
  CLOB_ORDER_BURST: 3_500,
  CLOB_ORDER_SUSTAINED: 36_000, // per 10 min
  CLOB_CANCEL_BURST: 3_000,
  DATA_GENERAL: 1_000,
  DATA_TRADES: 200,
  DATA_POSITIONS: 150,
  /** Relayer submit: 25 req per 1 minute */
  RELAYER_SUBMIT: 25,
} as const;

// ---------------------------------------------------------------------------
// Cache TTLs (seconds)
// ---------------------------------------------------------------------------

export const POLYMARKET_CACHE_TTL = {
  /** Market list / trending — 60 seconds */
  MARKETS: 60,
  /** Market detail — 30 seconds */
  MARKET_DETAIL: 30,
  /** Orderbook snapshot — 5 seconds */
  ORDERBOOK: 5,
  /** Price / midpoint / spread — 5 seconds */
  PRICE: 5,
  /** Geoblock result — 5 minutes */
  GEOBLOCK: 300,
  /** User positions — 15 seconds */
  POSITIONS: 15,
  /** Bridge supported assets — 1 hour */
  BRIDGE_ASSETS: 3_600,
} as const;

// ---------------------------------------------------------------------------
// L1 Auth (EIP-712)
// Source: https://docs.polymarket.com/api-reference/authentication
// ---------------------------------------------------------------------------

export const POLYMARKET_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1",
  chainId: POLYMARKET_CHAIN_ID,
} as const;

export const POLYMARKET_AUTH_MESSAGE =
  "This message attests that I control the given wallet";

// ---------------------------------------------------------------------------
// L2 Auth Headers
// ---------------------------------------------------------------------------

export const POLY_HEADERS = {
  ADDRESS: "POLY_ADDRESS",
  SIGNATURE: "POLY_SIGNATURE",
  TIMESTAMP: "POLY_TIMESTAMP",
  NONCE: "POLY_NONCE",
  API_KEY: "POLY_API_KEY",
  PASSPHRASE: "POLY_PASSPHRASE",
} as const;

export const POLY_BUILDER_HEADERS = {
  API_KEY: "POLY_BUILDER_API_KEY",
  SIGNATURE: "POLY_BUILDER_SIGNATURE",
  TIMESTAMP: "POLY_BUILDER_TIMESTAMP",
  PASSPHRASE: "POLY_BUILDER_PASSPHRASE",
} as const;

// ---------------------------------------------------------------------------
// Bridge Transaction Statuses
// Source: https://docs.polymarket.com/trading/bridge/status
// ---------------------------------------------------------------------------

export const BRIDGE_TX_STATUS = {
  DEPOSIT_DETECTED: "DEPOSIT_DETECTED",
  PROCESSING: "PROCESSING",
  ORIGIN_TX_CONFIRMED: "ORIGIN_TX_CONFIRMED",
  SUBMITTED: "SUBMITTED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type BridgeTxStatus =
  (typeof BRIDGE_TX_STATUS)[keyof typeof BRIDGE_TX_STATUS];

// ---------------------------------------------------------------------------
// WSS Event Types
// Source: https://docs.polymarket.com/market-data/websocket/market-channel
// ---------------------------------------------------------------------------

export const WSS_MARKET_EVENT_TYPES = [
  "book",
  "price_change",
  "tick_size_change",
  "last_trade_price",
  "best_bid_ask",
  "new_market",
  "market_resolved",
] as const;

export const WSS_USER_EVENT_TYPES = ["trade", "order"] as const;

// ---------------------------------------------------------------------------
// Geoblock
// Source: https://docs.polymarket.com/api-reference/geoblock
// ---------------------------------------------------------------------------

export const POLYMARKET_CLOSE_ONLY_COUNTRIES = ["PL", "SG", "TH", "TW"] as const;
