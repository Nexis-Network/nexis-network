/**
 * CCXT Trading Service
 *
 * Domain: trading
 * Responsibility: Execute trades on CEXs using CCXT Unified API
 * Depends on: ccxt, credentials, types
 *
 * Implements Authoritative Reference Index requirements:
 * - Unified API only (no exchange-specific methods)
 * - Rate limiting enabled
 * - Precision handling via amountToPrecision/priceToPrecision
 * - Network error retry with exponential backoff
 */

import ccxt, { Exchange, Order, Trade, Balances } from 'ccxt';
import { logger } from '@/lib/logger';
import type {
  CreateOrderParams,
  OrderResult,
  ExchangeCredentials,
  ExchangeId,
  TradeResult,
  PerpetualOrderParams,
} from './types';
import { TradingError, isPerpetualOrder } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const SUPPORTED_EXCHANGES: ExchangeId[] = [
  'binance',
  'coinbase',
  'kraken',
  'bybit',
  'okx',
  'bitfinex',
  'huobi',
  'kucoin',
  'gemini',
];

// Exchange class name mapping for CCXT (string keys)
const EXCHANGE_CLASS_MAP: Record<ExchangeId, string> = {
  binance: 'binance',
  coinbase: 'coinbase', // Updated from coinbasepro
  kraken: 'kraken',
  bybit: 'bybit',
  okx: 'okx',
  bitfinex: 'bitfinex',
  huobi: 'huobi',
  kucoin: 'kucoin',
  gemini: 'gemini',
};

// Testnet endpoints (reserved for future use)
const _TESTNET_URLS: Partial<Record<ExchangeId, { apiUrl: string }>> = {
  binance: { apiUrl: 'https://testnet.binance.vision' },
  bybit: { apiUrl: 'https://api-testnet.bybit.com' },
  okx: { apiUrl: 'https://www.okx.com' }, // OKX uses same URL with sandbox mode
  kucoin: { apiUrl: 'https://openapi-sandbox.kucoin.com' },
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class CCXTTradingService {
  private exchangeInstances = new Map<string, Exchange>();

  /**
   * Get or create exchange instance with rate limiting enabled
   * (Authoritative Reference: enableRateLimit = true)
   */
  private async getExchange(credentials: ExchangeCredentials): Promise<Exchange> {
    const key = `${credentials.exchangeId}:${credentials.apiKey.slice(0, 8)}`;

    if (this.exchangeInstances.has(key)) {
      return this.exchangeInstances.get(key)!;
    }

    if (!SUPPORTED_EXCHANGES.includes(credentials.exchangeId)) {
      throw new TradingError(
        'EXCHANGE_ERROR',
        `Unsupported exchange: ${credentials.exchangeId}`,
        credentials.exchangeId
      );
    }

    const exchangeClassName = EXCHANGE_CLASS_MAP[credentials.exchangeId];
    
    // Dynamic exchange instantiation
    const ccxtLib = ccxt as Record<string, UntypedJson>;
    const ExchangeClass = ccxtLib[exchangeClassName] as new (config: Record<string, UntypedJson>) => Exchange;

    if (!ExchangeClass || typeof ExchangeClass !== 'function') {
      throw new TradingError(
        'EXCHANGE_ERROR',
        `Exchange class not found: ${exchangeClassName}`,
        credentials.exchangeId
      );
    }

    const config: Record<string, UntypedJson> = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      password: credentials.passphrase, // For exchanges that require it
      enableRateLimit: true, // REQUIRED per Authoritative Reference
      sandbox: credentials.isTestnet,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true,
        recvWindow: 10000,
      },
    };

    const exchange = new ExchangeClass(config);

    try {
      await exchange.loadMarkets();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load markets';
      throw new TradingError('EXCHANGE_ERROR', message, credentials.exchangeId);
    }

    this.exchangeInstances.set(key, exchange);
    return exchange;
  }

  /**
   * Create order using Unified API
   * (Authoritative Reference: exchange.createOrder)
   */
  async createOrder(
    credentials: ExchangeCredentials,
    params: CreateOrderParams
  ): Promise<OrderResult> {
    const exchange = await this.getExchange(credentials);
    const { symbol, type, side, amount, price, clientOrderId } = params;

    // Validate market exists
    if (!exchange.markets[symbol]) {
      throw new TradingError(
        'INVALID_ORDER',
        `Symbol ${symbol} not found on ${credentials.exchangeId}`,
        credentials.exchangeId
      );
    }

    // Apply precision (Authoritative Reference)
    const preciseAmount = exchange.amountToPrecision(symbol, amount);
    const precisePrice = price ? exchange.priceToPrecision(symbol, price) : undefined;

    // Build order params
    const orderParams: Record<string, UntypedJson> = {};
    if (clientOrderId) orderParams.clientOrderId = clientOrderId;

    // Perpetual-specific params
    if (isPerpetualOrder(params)) {
      const perp = params as PerpetualOrderParams;
      if (perp.leverage) orderParams.leverage = perp.leverage;
      if (perp.marginMode) orderParams.marginMode = perp.marginMode;
      if (perp.reduceOnly) orderParams.reduceOnly = perp.reduceOnly;
      if (perp.positionSide) orderParams.positionSide = perp.positionSide;
      if (perp.stopPrice) orderParams.stopPrice = parseFloat(perp.stopPrice);
    }

    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        const order = await exchange.createOrder(
          symbol,
          type,
          side,
          parseFloat(preciseAmount),
          precisePrice ? parseFloat(precisePrice) : undefined,
          orderParams
        );

        logger.info('[trading] Order created', {
          exchangeId: credentials.exchangeId,
          orderId: order.id,
          symbol,
          side,
          type,
          amount: preciseAmount,
        });

        return this.normalizeOrder(order, credentials.exchangeId);
      } catch (error) {
        // Handle network errors with retry
        if (this.isNetworkError(error) && attempts < MAX_RETRIES - 1) {
          attempts++;
          const delay = RETRY_DELAY_MS * Math.pow(2, attempts);
          logger.warn(`[trading] NetworkError, retry ${attempts}/${MAX_RETRIES} in ${delay}ms`, {
            exchangeId: credentials.exchangeId,
            symbol,
          });
          await this.sleep(delay);
          continue;
        }

        // Transform to TradingError
        throw this.handleExchangeError(error, credentials.exchangeId);
      }
    }

    throw new TradingError(
      'NETWORK_ERROR',
      'Max retries exceeded',
      credentials.exchangeId
    );
  }

  /**
   * Cancel order using Unified API
   */
  async cancelOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<OrderResult> {
    const exchange = await this.getExchange(credentials);

    try {
      const order = await exchange.cancelOrder(orderId, symbol);
      logger.info('[trading] Order canceled', {
        exchangeId: credentials.exchangeId,
        orderId,
        symbol,
      });
      return this.normalizeOrder(order, credentials.exchangeId);
    } catch (error) {
      throw this.handleExchangeError(error, credentials.exchangeId);
    }
  }

  /**
   * Fetch open orders
   */
  async fetchOpenOrders(
    credentials: ExchangeCredentials,
    symbol?: string
  ): Promise<OrderResult[]> {
    const exchange = await this.getExchange(credentials);

    try {
      const orders = await exchange.fetchOpenOrders(symbol);
      return orders.map((o: Order) => this.normalizeOrder(o, credentials.exchangeId));
    } catch (error) {
      throw this.handleExchangeError(error, credentials.exchangeId);
    }
  }

  /**
   * Fetch order by ID
   */
  async fetchOrder(
    credentials: ExchangeCredentials,
    orderId: string,
    symbol: string
  ): Promise<OrderResult> {
    const exchange = await this.getExchange(credentials);

    try {
      const order = await exchange.fetchOrder(orderId, symbol);
      return this.normalizeOrder(order, credentials.exchangeId);
    } catch (error) {
      throw this.handleExchangeError(error, credentials.exchangeId);
    }
  }

  /**
   * Fetch balance
   */
  async fetchBalance(
    credentials: ExchangeCredentials
  ): Promise<Record<string, { free: string; used: string; total: string }>> {
    const exchange = await this.getExchange(credentials);

    try {
      const balance: Balances = await exchange.fetchBalance();
      const result: Record<string, { free: string; used: string; total: string }> = {};

      // Type-safe balance iteration - cast through unknown for CCXT Balance type
      const totalObj = balance.total as UntypedJson as Record<string, number>;
      const freeObj = balance.free as UntypedJson as Record<string, number>;
      const usedObj = balance.used as UntypedJson as Record<string, number>;

      if (totalObj && typeof totalObj === 'object') {
        for (const currency of Object.keys(totalObj)) {
          const total = totalObj[currency];
          if (total && total > 0) {
            result[currency] = {
              free: String(freeObj[currency] ?? 0),
              used: String(usedObj[currency] ?? 0),
              total: String(total),
            };
          }
        }
      }

      return result;
    } catch (error) {
      throw this.handleExchangeError(error, credentials.exchangeId);
    }
  }

  /**
   * Fetch recent trades
   */
  async fetchMyTrades(
    credentials: ExchangeCredentials,
    symbol: string,
    limit = 50
  ): Promise<TradeResult[]> {
    const exchange = await this.getExchange(credentials);

    try {
      const trades = await exchange.fetchMyTrades(symbol, undefined, limit);
      return trades.map((t: Trade) => this.normalizeTrade(t));
    } catch (error) {
      throw this.handleExchangeError(error, credentials.exchangeId);
    }
  }

  /**
   * Validate exchange connection
   */
  async validateConnection(credentials: ExchangeCredentials): Promise<boolean> {
    try {
      const exchange = await this.getExchange(credentials);
      await exchange.fetchBalance();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup exchange instances
   */
  dispose(): void {
    this.exchangeInstances.clear();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private normalizeOrder(order: Order, exchangeId: ExchangeId): OrderResult {
    return {
      id: order.id,
      clientOrderId: order.clientOrderId ?? undefined,
      exchangeId,
      symbol: order.symbol,
      side: order.side as 'buy' | 'sell',
      type: order.type as OrderResult['type'],
      amount: String(order.amount ?? 0),
      price: order.price ? String(order.price) : undefined,
      averagePrice: order.average ? String(order.average) : undefined,
      filled: String(order.filled ?? 0),
      remaining: String(order.remaining ?? 0),
      cost: String(order.cost ?? 0),
      status: order.status as OrderResult['status'],
      timestamp: order.timestamp ?? Date.now(),
      datetime: order.datetime ?? new Date().toISOString(),
      fee: order.fee
        ? {
            cost: String(order.fee.cost),
            currency: String(order.fee.currency ?? 'UNKNOWN'),
            rate: typeof order.fee.rate === 'number' ? order.fee.rate : undefined,
          }
        : undefined,
      info: order,
    };
  }

  private normalizeTrade(trade: Trade): TradeResult {
    return {
      id: String(trade.id ?? ''),
      orderId: String(trade.order ?? ''),
      symbol: String(trade.symbol ?? ''),
      side: trade.side as 'buy' | 'sell',
      price: String(trade.price),
      amount: String(trade.amount),
      cost: String(trade.cost),
      fee: trade.fee
        ? {
            cost: String(trade.fee.cost),
            currency: String(trade.fee.currency ?? 'UNKNOWN'),
          }
        : undefined,
      timestamp: trade.timestamp ?? Date.now(),
    };
  }

  private isNetworkError(error: UntypedJson): boolean {
    if (error instanceof ccxt.NetworkError) return true;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset');
    }
    return false;
  }

  private handleExchangeError(error: UntypedJson, exchangeId: ExchangeId): TradingError {
    if (error instanceof TradingError) return error;

    if (error instanceof ccxt.InsufficientFunds) {
      return new TradingError('INSUFFICIENT_BALANCE', error.message, exchangeId);
    }
    if (error instanceof ccxt.InvalidOrder) {
      return new TradingError('INVALID_ORDER', error.message, exchangeId);
    }
    if (error instanceof ccxt.OrderNotFound) {
      return new TradingError('ORDER_NOT_FOUND', error.message, exchangeId);
    }
    if (error instanceof ccxt.AuthenticationError) {
      return new TradingError('INVALID_CREDENTIALS', error.message, exchangeId);
    }
    if (error instanceof ccxt.PermissionDenied) {
      return new TradingError('PERMISSION_DENIED', error.message, exchangeId);
    }
    if (error instanceof ccxt.RateLimitExceeded) {
      return new TradingError('RATE_LIMITED', error.message, exchangeId);
    }
    if (error instanceof ccxt.NetworkError) {
      return new TradingError('NETWORK_ERROR', error.message, exchangeId);
    }
    if (error instanceof ccxt.ExchangeError) {
      return new TradingError('EXCHANGE_ERROR', error.message, exchangeId);
    }

    const message = error instanceof Error ? error.message : 'Unknown trading error';
    return new TradingError('EXCHANGE_ERROR', message, exchangeId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const tradingService = new CCXTTradingService();
