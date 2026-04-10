/**
 * Trading Execution AI Tools
 *
 * Domain: ai/tools
 * Responsibility: AI tools for executing trades on connected CEXs
 * Depends on: trading service, credentials
 *
 * Uses project's createTool pattern for AI SDK v5 compatibility.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  numberProp,
  booleanProp,
  enumProp,
} from "./create-tool";
import { tradingService, getUserExchangeCredentials } from "@/server/services/trading";
import type { ExchangeId } from "@/server/services/trading/types";

// ============================================================================
// CONSTANTS
// ============================================================================

const EXCHANGE_IDS = [
  'binance',
  'coinbase',
  'kraken',
  'bybit',
  'okx',
  'bitfinex',
  'huobi',
  'kucoin',
  'gemini',
] as const;

const LIVE_TRADING_DISABLED_MESSAGE =
  "Live CEX execution is disabled in this build. Use preview-only approval flows before reattempting.";

function buildPreviewOnlyTradeResponse(
  requestedAction: "execute" | "cancel",
): {
  success: false;
  error: string;
  action: "PREVIEW_ONLY";
  previewOnly: true;
  message: string;
  requestedAction: "execute" | "cancel";
} {
  return {
    success: false,
    error: LIVE_TRADING_DISABLED_MESSAGE,
    action: "PREVIEW_ONLY",
    previewOnly: true,
    message:
      "Preview-only safety mode is active. Live order placement and cancellation are blocked.",
    requestedAction,
  };
}

// ============================================================================
// TRADING EXECUTION TOOL
// ============================================================================

type TradingExecutionInput = {
  exchangeId: string;
  symbol: string;
  side: string;
  type: string;
  amount: string;
  price?: string;
  leverage?: number;
  marginMode?: string;
  reduceOnly?: boolean;
  isPerpetual?: boolean;
};

const tradingExecutionSchema = createToolSchema(
  {
    exchangeId: enumProp(
      'Target exchange ID',
      EXCHANGE_IDS
    ),
    symbol: stringProp(
      'Trading pair in CCXT format (e.g., "BTC/USDT", "ETH/BTC")'
    ),
    side: enumProp(
      'Order direction: buy or sell',
      ['buy', 'sell']
    ),
    type: enumProp(
      'Order type: market or limit',
      ['market', 'limit']
    ),
    amount: stringProp(
      'Order quantity as string for precision (e.g., "0.5", "100")'
    ),
    price: stringProp(
      'Limit price (REQUIRED for limit orders)'
    ),
    leverage: numberProp(
      'Leverage for perpetual orders (1-125)',
      { minimum: 1, maximum: 125 }
    ),
    marginMode: enumProp(
      'Margin mode for perpetuals',
      ['cross', 'isolated']
    ),
    reduceOnly: booleanProp(
      'Reduce-only order for perpetuals'
    ),
    isPerpetual: booleanProp(
      'Whether this is a perpetual/futures order'
    ),
  },
  ['exchangeId', 'symbol', 'side', 'type', 'amount']
);

export const tradingExecutionTool = createTool<TradingExecutionInput>({
  description: `Preview-only CEX trading helper.

IMPORTANT SAFETY RULES:
1. Live execution is disabled in this build
2. Use the approval/preview workflow before reattempting
3. Verify the user has connected the requested exchange first for read-only checks
4. For limit orders, price is REQUIRED
5. For perpetual orders, leverage must be within exchange limits (typically 1-125)

Supported exchanges: Binance, Coinbase Pro, Kraken, Bybit, OKX, Bitfinex, Huobi, KuCoin, Gemini

Usage examples:
- "Buy 0.5 BTC at market on Binance"
- "Place a limit sell order for 1 ETH at $3500 on Kraken"
- "Open a 10x long on BTC/USDT perpetual on Bybit"`,

  schema: tradingExecutionSchema,

  execute: async (_input, context) => {
    const userId = context?.userId;

    if (!userId) {
      return {
        success: false,
        error: "Authentication required. Please log in to execute trades.",
        action: "LOGIN_REQUIRED",
      };
    }

    return buildPreviewOnlyTradeResponse("execute");
  },
});

// ============================================================================
// CANCEL ORDER TOOL
// ============================================================================

type CancelOrderInput = {
  exchangeId: string;
  orderId: string;
  symbol: string;
};

const cancelOrderSchema = createToolSchema(
  {
    exchangeId: enumProp(
      'Target exchange ID',
      EXCHANGE_IDS
    ),
    orderId: stringProp('Order ID to cancel'),
    symbol: stringProp('Trading pair symbol (e.g., "BTC/USDT")'),
  },
  ['exchangeId', 'orderId', 'symbol']
);

export const tradingCancelOrderTool = createTool<CancelOrderInput>({
  description: `Preview-only CEX order cancellation helper.

Requires:
- Order ID from the exchange
- Trading pair symbol
- Connected exchange credentials for read-only verification only`,

  schema: cancelOrderSchema,

  execute: async (_input, context) => {
    const userId = context?.userId;

    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    return buildPreviewOnlyTradeResponse("cancel");
  },
});

// ============================================================================
// FETCH BALANCE TOOL
// ============================================================================

type FetchBalanceInput = {
  exchangeId: string;
};

const fetchBalanceSchema = createToolSchema(
  {
    exchangeId: enumProp(
      'Target exchange ID',
      EXCHANGE_IDS
    ),
  },
  ['exchangeId']
);

export const tradingFetchBalanceTool = createTool<FetchBalanceInput>({
  description: `Fetch current balances from a connected CEX exchange.

Returns:
- All non-zero balances
- Free (available) and used (in orders) amounts
- Total balance per asset`,

  schema: fetchBalanceSchema,

  execute: async (input, context) => {
    const userId = context?.userId;
    
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const credentials = await getUserExchangeCredentials(userId, input.exchangeId as ExchangeId);
      
      if (!credentials) {
        return {
          success: false,
          error: `No ${input.exchangeId} connection found`,
          action: 'CONNECT_EXCHANGE',
        };
      }

      const balances = await tradingService.fetchBalance(credentials);

      // Format for display
      const formattedBalances = Object.entries(balances)
        .filter(([_, b]) => parseFloat(b.total) > 0)
        .map(([currency, b]) => ({
          currency,
          free: b.free,
          used: b.used,
          total: b.total,
        }));

      return {
        success: true,
        exchangeId: input.exchangeId,
        balances: formattedBalances,
        count: formattedBalances.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      };
    }
  },
});

// ============================================================================
// FETCH OPEN ORDERS TOOL
// ============================================================================

type OpenOrdersInput = {
  exchangeId: string;
  symbol?: string;
};

const openOrdersSchema = createToolSchema(
  {
    exchangeId: enumProp(
      'Target exchange ID',
      EXCHANGE_IDS
    ),
    symbol: stringProp('Filter by trading pair (e.g., "BTC/USDT")'),
  },
  ['exchangeId']
);

export const tradingOpenOrdersTool = createTool<OpenOrdersInput>({
  description: `Fetch all open orders from a connected CEX exchange.

Optionally filter by trading pair symbol.`,

  schema: openOrdersSchema,

  execute: async (input, context) => {
    const userId = context?.userId;
    
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const credentials = await getUserExchangeCredentials(userId, input.exchangeId as ExchangeId);
      
      if (!credentials) {
        return {
          success: false,
          error: `No ${input.exchangeId} connection found`,
          action: 'CONNECT_EXCHANGE',
        };
      }

      const orders = await tradingService.fetchOpenOrders(credentials, input.symbol);

      return {
        success: true,
        exchangeId: input.exchangeId,
        orders: orders.map((o) => ({
          id: o.id,
          symbol: o.symbol,
          side: o.side,
          type: o.type,
          amount: o.amount,
          price: o.price,
          filled: o.filled,
          remaining: o.remaining,
          status: o.status,
          timestamp: o.datetime,
        })),
        count: orders.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch open orders',
      };
    }
  },
});
