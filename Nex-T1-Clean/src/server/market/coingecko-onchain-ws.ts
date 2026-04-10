import { EventEmitter } from "events";

import { createLogger } from "@/server/logging/logging";
import { resolveCoingeckoCredentials, resolveCoingeckoWsAuthQuery } from "@/server/market/coingecko-base";

const logger = createLogger("coingecko-onchain-ws");

const DEFAULT_WS_ENDPOINT = "wss://stream.coingecko.com/v1";
const WS_ENDPOINT = process.env.COINGECKO_WS_ENDPOINT?.trim() || DEFAULT_WS_ENDPOINT;
const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;
const HEARTBEAT_PONG_INTERVAL_MS = 8_000;
const ONCHAIN_TRADE_CHANNEL_IDENTIFIER = JSON.stringify({ channel: "OnchainTrade" });
const MAX_RECENT_TRADES_PER_POOL = 200;

const CREDENTIALS = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});
const WS_AUTH_QUERY = resolveCoingeckoWsAuthQuery(CREDENTIALS);

// ─── Types ─────────────────────────────────────────────────────

export interface OnchainTradeEvent {
  channel: string;
  network: string;
  poolAddress: string;
  txHash: string;
  type: "buy" | "sell";
  tokenAmount: string;
  quoteAmount: string;
  volumeUsd: number;
  priceNative: number;
  priceUsd: number;
  timestamp: number;
}

// ─── Normalize raw WS message ──────────────────────────────────

function normalizeOnchainTradeMessage(payload: unknown): OnchainTradeEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  // The CoinGecko OnchainTrade channel wraps the data in a `message` field
  // or sends it directly depending on the frame type.
  const data = typeof record.message === "object" && record.message !== null
    ? (record.message as Record<string, unknown>)
    : record;

  const channel = typeof data.c === "string" ? data.c : "";
  if (channel && channel !== "OnchainTrade") return null;

  const network = typeof data.n === "string" ? data.n : "";
  const poolAddress = typeof data.pa === "string" ? data.pa : "";
  const txHash = typeof data.tx === "string" ? data.tx : "";
  const rawType = typeof data.ty === "string" ? data.ty.toLowerCase() : "";
  const type = rawType === "sell" ? "sell" as const : "buy" as const;

  const tokenAmount = typeof data.to === "string" ? data.to : String(data.to ?? "0");
  const quoteAmount = typeof data.toq === "string" ? data.toq : String(data.toq ?? "0");
  const volumeUsd = parseFloat(String(data.vo ?? 0)) || 0;
  const priceNative = parseFloat(String(data.pc ?? 0)) || 0;
  const priceUsd = parseFloat(String(data.pu ?? 0)) || 0;
  const timestamp = parseInt(String(data.t ?? 0), 10) || Date.now();

  // Require at minimum pool address and price
  if (!poolAddress || priceUsd === 0) return null;

  return {
    channel,
    network,
    poolAddress,
    txHash,
    type,
    tokenAmount,
    quoteAmount,
    volumeUsd,
    priceNative,
    priceUsd,
    timestamp,
  };
}

// ─── Build WS URL ──────────────────────────────────────────────

function buildWsUrl(): string | null {
  if (!WS_AUTH_QUERY) return null;

  try {
    const url = new URL(WS_ENDPOINT);
    url.searchParams.set(WS_AUTH_QUERY.name, WS_AUTH_QUERY.value);
    return url.toString();
  } catch (error) {
    logger.error("Invalid CoinGecko WS endpoint for OnchainTrade", {
      endpoint: WS_ENDPOINT,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ─── WebSocket Client ──────────────────────────────────────────

export class CoinGeckoOnchainTradeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private forcedClose = false;
  private reconnectAttempt = 0;

  /** Maps clientId → Set of "network:poolAddress" strings */
  private clientSubscriptions = new Map<string, Set<string>>();
  /** Active pool subscriptions as "network:poolAddress" */
  private activePools = new Set<string>();
  private serverSubscribedPools = new Set<string>();
  /** Recently seen trades keyed by "network:poolAddress" */
  private recentTradesByPool = new Map<string, OnchainTradeEvent[]>();

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    if (!this.activePools.size) return;
    if (!WS_AUTH_QUERY) {
      logger.warnOnce(
        "onchain_ws_auth_missing",
        "Skipping CoinGecko OnchainTrade WS: no API key available.",
      );
      return;
    }
    if (typeof WebSocket === "undefined") {
      logger.error("Skipping CoinGecko OnchainTrade WS: WebSocket runtime unavailable.");
      return;
    }

    const url = buildWsUrl();
    if (!url) return;

    this.forcedClose = false;
    this.isConnecting = true;
    logger.info("Connecting to CoinGecko OnchainTrade WS...", { endpoint: WS_ENDPOINT });

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
    } catch (error) {
      this.isConnecting = false;
      logger.error("Failed to create OnchainTrade WebSocket", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.forcedClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isConnecting = false;
    this.reconnectAttempt = 0;
    this.serverSubscribedPools.clear();
  }

  /**
   * Subscribe to onchain trade events for specific pools.
   * @param clientId Unique client identifier
   * @param pools Array of "network:poolAddress" strings, e.g. ["eth:0x1234..."]
   */
  public upsertSubscription(clientId: string, pools: string[]) {
    const normalized = new Set(
      pools.map((p) => p.trim().toLowerCase()).filter(Boolean),
    );

    if (!normalized.size) {
      this.removeSubscription(clientId);
      return;
    }

    this.clientSubscriptions.set(clientId, normalized);
    this.refreshActiveSubscriptions();
  }

  public removeSubscription(clientId: string) {
    const removed = this.clientSubscriptions.delete(clientId);
    if (!removed) return;
    this.refreshActiveSubscriptions();
  }

  public getRecentTrades(pools: string[], limit = 100): OnchainTradeEvent[] {
    const normalizedPools = pools
      .map((pool) => pool.trim().toLowerCase())
      .filter(Boolean);

    const rows = normalizedPools.flatMap((pool) => this.recentTradesByPool.get(pool) ?? []);
    rows.sort((left, right) => right.timestamp - left.timestamp);
    return rows.slice(0, Math.max(0, limit));
  }

  private refreshActiveSubscriptions() {
    const nextActive = new Set<string>();
    for (const pools of this.clientSubscriptions.values()) {
      for (const pool of pools) {
        nextActive.add(pool);
      }
    }

    this.activePools = nextActive;

    if (!this.activePools.size) {
      this.serverSubscribedPools.clear();
      this.disconnect();
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.syncServerSubscription();
      return;
    }

    this.connect();
  }

  private syncServerSubscription() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Build the pool list grouped by network
    const poolsByNetwork = new Map<string, string[]>();
    for (const entry of this.activePools) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx < 1) continue;
      const network = entry.slice(0, colonIdx);
      const address = entry.slice(colonIdx + 1);
      if (!poolsByNetwork.has(network)) {
        poolsByNetwork.set(network, []);
      }
      poolsByNetwork.get(network)!.push(address);
    }

    // Build the "network_id:pool_addresses" array for the set_pools message
    const poolEntries: string[] = [];
    for (const [network, addresses] of poolsByNetwork) {
      for (const addr of addresses) {
        poolEntries.push(`${network}:${addr}`);
      }
    }

    if (poolEntries.length === 0) return;

    // Send set_pools command
    this.ws.send(
      JSON.stringify({
        command: "message",
        identifier: ONCHAIN_TRADE_CHANNEL_IDENTIFIER,
        data: JSON.stringify({
          "network_id:pool_addresses": poolEntries,
          action: "set_pools",
        }),
      }),
    );

    this.serverSubscribedPools = new Set(this.activePools);
  }

  private onOpen() {
    this.isConnecting = false;
    this.reconnectAttempt = 0;
    this.serverSubscribedPools.clear();
    this.startHeartbeat();
    logger.info("CoinGecko OnchainTrade WS connected");

    // Subscribe to the OnchainTrade channel
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          command: "subscribe",
          identifier: ONCHAIN_TRADE_CHANNEL_IDENTIFIER,
        }),
      );
    }

    // Send set_pools after a small delay to ensure channel subscription is confirmed
    setTimeout(() => {
      if (this.activePools.size > 0) {
        this.syncServerSubscription();
      }
    }, 500);
  }

  private onMessage(event: MessageEvent) {
    const rawPayload = String(event.data ?? "").trim();

    // Handle ping
    if (rawPayload.toLowerCase() === "ping") {
      this.sendPong();
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      return;
    }

    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;

      // Handle ping messages
      if (record.type === "ping" || record.event === "ping" || record.command === "ping") {
        this.sendPong();
        return;
      }

      // Handle confirm_subscription messages
      if (record.type === "confirm_subscription") {
        logger.info("OnchainTrade channel subscription confirmed");
        return;
      }
    }

    const trade = normalizeOnchainTradeMessage(parsed);
    if (trade) {
      this.storeRecentTrade(trade);
      this.emit("trade", trade);
    }
  }

  private storeRecentTrade(trade: OnchainTradeEvent) {
    const poolKey = `${trade.network}:${trade.poolAddress}`.toLowerCase();
    const existing = this.recentTradesByPool.get(poolKey) ?? [];
    const next = [trade, ...existing].slice(0, MAX_RECENT_TRADES_PER_POOL);
    this.recentTradesByPool.set(poolKey, next);
  }

  private onClose(event: CloseEvent) {
    this.isConnecting = false;
    this.ws = null;
    this.serverSubscribedPools.clear();
    this.stopHeartbeat();
    logger.warn(`CoinGecko OnchainTrade WS closed: ${event.code} ${event.reason || "no reason"}`);

    if (!this.forcedClose) {
      this.scheduleReconnect();
    }
  }

  private onError() {
    logger.error("CoinGecko OnchainTrade WS error");
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.forcedClose || !this.activePools.size) return;

    const delay = Math.min(
      RECONNECT_MAX_MS,
      Math.round(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt),
    );
    this.reconnectAttempt += 1;

    logger.info(`CoinGecko OnchainTrade WS reconnecting in ${delay}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendPong();
    }, HEARTBEAT_PONG_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendPong() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send('{"type":"pong"}');
      this.ws.send('{"command":"pong"}');
    } catch {
      // Silently fail
    }
  }
}

export const coingeckoOnchainTradeWS = new CoinGeckoOnchainTradeClient();
