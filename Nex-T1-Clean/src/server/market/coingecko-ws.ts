import { EventEmitter } from "events";

import { createLogger } from "@/server/logging/logging";
import { resolveCoingeckoCredentials, resolveCoingeckoWsAuthQuery } from "@/server/market/coingecko-base";

const logger = createLogger("coingecko-ws");

const DEFAULT_WS_ENDPOINT = "wss://stream.coingecko.com/v1";
const WS_ENDPOINT = process.env.COINGECKO_WS_ENDPOINT?.trim() || DEFAULT_WS_ENDPOINT;
const WS_ENABLED = (process.env.COINGECKO_WS_ENABLED ?? "true").trim().toLowerCase() !== "false";
const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;
const LEGACY_SUBSCRIPTION_ID = "__legacy__";
const SIMPLE_PRICE_CHANNEL_IDENTIFIER = JSON.stringify({ channel: "CGSimplePrice" });
const HEARTBEAT_PONG_INTERVAL_MS = 8_000;
const NO_PONG_REASON = "no pong";
const AUTH_FAILURE_REASON_TOKEN = "auth failed";
const AUTH_FAILURE_COOLDOWN_MS = 5 * 60_000;
const AUTH_FAILURE_COOLDOWN_TRIGGER_COUNT = 2;
const MAX_LATEST_PRICE_CACHE_SIZE = 512;

const CREDENTIALS = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});

type CoinGeckoWsAuthQuery = NonNullable<ReturnType<typeof resolveCoingeckoWsAuthQuery>>;

function resolveCoingeckoWsAuthQueries(): CoinGeckoWsAuthQuery[] {
  const primary = resolveCoingeckoWsAuthQuery(CREDENTIALS);
  if (!primary) {
    return [];
  }

  const candidates: CoinGeckoWsAuthQuery[] = [primary];
  if (CREDENTIALS.demoApiKey && primary.name !== "x_cg_demo_api_key") {
    candidates.push({ name: "x_cg_demo_api_key", value: CREDENTIALS.demoApiKey });
  } else if (CREDENTIALS.proApiKey && primary.name !== "x_cg_pro_api_key") {
    candidates.push({ name: "x_cg_pro_api_key", value: CREDENTIALS.proApiKey });
  } else if (candidates.length === 1) {
    // Fallback for deployments where a key exists but its type (pro/demo) is misconfigured.
    candidates.push({
      name: primary.name === "x_cg_pro_api_key" ? "x_cg_demo_api_key" : "x_cg_pro_api_key",
      value: primary.value,
    });
  }

  const deduped = new Map<string, CoinGeckoWsAuthQuery>();
  for (const candidate of candidates) {
    deduped.set(`${candidate.name}:${candidate.value}`, candidate);
  }
  return Array.from(deduped.values());
}

const WS_AUTH_QUERIES = resolveCoingeckoWsAuthQueries();

export type CoinGeckoWsPriceUpdate = {
  price: number;
  change24hPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  lastUpdatedAt: number | null;
};

export function isCoinGeckoWsPingPayload(payload: unknown): boolean {
  if (typeof payload === "string") {
    return payload.trim().toLowerCase() === "ping";
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type.trim().toLowerCase() : "";
  const event = typeof record.event === "string" ? record.event.trim().toLowerCase() : "";
  const command = typeof record.command === "string" ? record.command.trim().toLowerCase() : "";

  return type === "ping" || event === "ping" || command === "ping";
}

export function shouldWarnCoinGeckoWsClose(code: number, reason: string | null | undefined): boolean {
  const normalizedReason = (reason ?? "").trim().toLowerCase();
  return !(code === 1000 && normalizedReason.includes(NO_PONG_REASON));
}

export function isCoinGeckoWsAuthFailureClose(
  code: number,
  reason: string | null | undefined,
): boolean {
  const normalizedReason = (reason ?? "").trim().toLowerCase();
  return code === 1000 && normalizedReason.includes(AUTH_FAILURE_REASON_TOKEN);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTimestampMs(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return null;
  }
  if (numeric < 1_000_000_000_000) {
    return Math.round(numeric * 1000);
  }
  return Math.round(numeric);
}

export function normalizeCoinGeckoWsTickerMessage(
  payload: unknown,
): Record<string, CoinGeckoWsPriceUpdate> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const coinId =
    typeof record.i === "string"
      ? record.i.trim().toLowerCase()
      : typeof record.c === "string"
        ? record.c.trim().toLowerCase()
        : "";
  const price = toFiniteNumber(record.p);
  if (!coinId || price == null) {
    return null;
  }

  return {
    [coinId]: {
      price,
      change24hPct: toFiniteNumber(record.pp),
      marketCapUsd: toFiniteNumber(record.m),
      volume24hUsd: toFiniteNumber(record.v),
      lastUpdatedAt: normalizeTimestampMs(record.t),
    },
  };
}

export function buildSimplePriceSubscriptionIdentifier(coinId: string, currency: string): string | null {
  const normalizedCoinId = coinId.trim().toLowerCase();
  if (!normalizedCoinId) {
    return null;
  }

  const normalizedCurrency = currency.trim().toLowerCase() || "usd";
  return JSON.stringify({
    channel: "CGSimplePrice",
    coin_id: normalizedCoinId,
    action: "set_tokens",
    currency: normalizedCurrency,
  });
}

function buildWsUrl(authQuery: CoinGeckoWsAuthQuery | null): string | null {
  if (!authQuery) {
    return null;
  }

  try {
    const url = new URL(WS_ENDPOINT);
    url.searchParams.set(authQuery.name, authQuery.value);
    return url.toString();
  } catch (error) {
    logger.error("Invalid CoinGecko WS endpoint", {
      endpoint: WS_ENDPOINT,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export class CoinGeckoWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private forcedClose = false;
  private reconnectAttempt = 0;
  private currency = "usd";
  private authFailureCount = 0;
  private disabledUntilMs = 0;
  private wsAuthQueryIndex = 0;
  private latestPrices = new Map<string, CoinGeckoWsPriceUpdate>();

  private clientSubscriptions = new Map<string, Set<string>>();
  private activeCoinIds = new Set<string>();
  private serverSubscribedCoinIds = new Set<string>();

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }
    if (!this.activeCoinIds.size) {
      return;
    }
    if (!WS_ENABLED) {
      logger.warnOnce(
        "ws_disabled",
        "Skipping CoinGecko WS connection: websocket feed is disabled via COINGECKO_WS_ENABLED.",
      );
      return;
    }
    if (!WS_AUTH_QUERIES.length) {
      logger.warnOnce(
        "ws_auth_missing",
        "Skipping CoinGecko WS connection: no API key available for websocket auth.",
      );
      return;
    }
    if (typeof WebSocket === "undefined") {
      logger.error("Skipping CoinGecko WS connection: WebSocket runtime is unavailable.");
      return;
    }

    const disabledMs = this.getDisabledMsRemaining();
    if (disabledMs > 0) {
      this.scheduleReconnect(disabledMs, false);
      return;
    }

    const authQuery = this.getCurrentAuthQuery();
    const url = buildWsUrl(authQuery);
    if (!url) {
      return;
    }

    this.forcedClose = false;
    this.isConnecting = true;
    logger.info("Connecting to CoinGecko WS...", {
      endpoint: WS_ENDPOINT,
      authKeyType: authQuery?.name,
    });

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onclose = this.onClose.bind(this);
      this.ws.onerror = this.onError.bind(this);
    } catch (error) {
      this.isConnecting = false;
      logger.error("Failed to create CoinGecko WebSocket instance", {
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
    this.serverSubscribedCoinIds.clear();
  }

  public getLatestPrices(coinIds: string[]): Record<string, CoinGeckoWsPriceUpdate> {
    const result: Record<string, CoinGeckoWsPriceUpdate> = {};

    for (const coinId of coinIds) {
      const normalized = coinId.trim().toLowerCase();
      if (!normalized) {
        continue;
      }

      const snapshot = this.latestPrices.get(normalized);
      if (!snapshot) {
        continue;
      }

      result[normalized] = { ...snapshot };
    }

    return result;
  }

  public isTemporarilyDisabled(): boolean {
    return this.getDisabledMsRemaining() > 0;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getDisabledUntilMs(): number | null {
    const remaining = this.getDisabledMsRemaining();
    if (remaining <= 0) {
      return null;
    }
    return Date.now() + remaining;
  }

  public upsertSubscription(clientId: string, coinIds: string[], currency = "usd") {
    const normalized = new Set(
      coinIds
        .map((coinId) => coinId.trim().toLowerCase())
        .filter(Boolean),
    );

    if (!normalized.size) {
      this.removeSubscription(clientId);
      return;
    }

    const previousCurrency = this.currency;
    this.currency = currency || "usd";
    this.clientSubscriptions.set(clientId, normalized);

    const forceResubscribe = previousCurrency !== this.currency;
    this.refreshActiveSubscriptions(forceResubscribe);
  }

  public removeSubscription(clientId: string) {
    const removed = this.clientSubscriptions.delete(clientId);
    if (!removed) {
      return;
    }
    this.refreshActiveSubscriptions(false);
  }

  // Backward-compatibility for existing call sites.
  public subscribe(coinIds: string[], currency = "usd") {
    this.upsertSubscription(LEGACY_SUBSCRIPTION_ID, coinIds, currency);
  }

  // Backward-compatibility for existing call sites.
  public unsubscribe(coinIds: string[]) {
    const existing = this.clientSubscriptions.get(LEGACY_SUBSCRIPTION_ID);
    if (!existing) {
      return;
    }
    const next = new Set(existing);
    for (const coinId of coinIds) {
      next.delete(coinId.trim().toLowerCase());
    }
    if (!next.size) {
      this.removeSubscription(LEGACY_SUBSCRIPTION_ID);
      return;
    }
    this.upsertSubscription(LEGACY_SUBSCRIPTION_ID, Array.from(next), this.currency);
  }

  private refreshActiveSubscriptions(forceResubscribe: boolean) {
    const nextActive = new Set<string>();
    for (const ids of this.clientSubscriptions.values()) {
      for (const id of ids) {
        nextActive.add(id);
      }
    }

    const previousActive = new Set(this.activeCoinIds);
    this.activeCoinIds = nextActive;

    if (!this.activeCoinIds.size) {
      this.serverSubscribedCoinIds.clear();
      this.disconnect();
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      if (forceResubscribe) {
        this.serverSubscribedCoinIds.clear();
      }
      void this.syncServerSubscription(previousActive);
      return;
    }

    this.connect();
  }

  private async syncServerSubscription(previousActive: Set<string>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const added = new Set<string>();
    for (const id of this.activeCoinIds) {
      if (!this.serverSubscribedCoinIds.has(id)) {
        added.add(id);
      }
    }

    const removed = new Set<string>();
    for (const id of previousActive) {
      if (!this.activeCoinIds.has(id) && this.serverSubscribedCoinIds.has(id)) {
        removed.add(id);
      }
    }

    // CoinGecko simple price stream uses channel-level subscriptions + set_tokens messages.
    // Removing tokens is most reliable via channel resubscribe then re-applying the active token list.
    if (removed.size > 0) {
      this.sendChannelCommand("unsubscribe");
      this.sendChannelCommand("subscribe");
      this.sendSetTokens(this.activeCoinIds);
      this.serverSubscribedCoinIds = new Set(this.activeCoinIds);
      return;
    }

    if (added.size > 0) {
      this.sendSetTokens(added);
      for (const id of added) {
        this.serverSubscribedCoinIds.add(id);
      }
    }
  }

  private sendChannelCommand(command: "subscribe" | "unsubscribe") {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        command,
        identifier: SIMPLE_PRICE_CHANNEL_IDENTIFIER,
      }),
    );
  }

  private sendSetTokens(coinIds: Set<string>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!coinIds || !coinIds.size) {
      return;
    }

    const normalizedCoinIds = Array.from(coinIds)
      .map((coinId) => coinId.trim().toLowerCase())
      .filter(Boolean)
      .sort();

    for (const coinId of normalizedCoinIds) {
      const identifier = buildSimplePriceSubscriptionIdentifier(coinId, this.currency);
      if (!identifier) {
        continue;
      }

      this.ws.send(
        JSON.stringify({
          command: "message",
          identifier: SIMPLE_PRICE_CHANNEL_IDENTIFIER,
          data: identifier,
        }),
      );
    }
  }

  private onOpen() {
    this.isConnecting = false;
    this.reconnectAttempt = 0;
    this.disabledUntilMs = 0;
    this.serverSubscribedCoinIds.clear();
    this.startHeartbeat();
    logger.info("CoinGecko WS connected");

    if (this.activeCoinIds.size > 0) {
      this.sendChannelCommand("subscribe");
      this.sendSetTokens(this.activeCoinIds);
      this.serverSubscribedCoinIds = new Set(this.activeCoinIds);
    }
  }

  private onMessage(event: MessageEvent) {
    const rawPayload = String(event.data ?? "").trim();
    if (isCoinGeckoWsPingPayload(rawPayload)) {
      this.sendPong();
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawPayload);
    } catch (error) {
      logger.warn("CoinGecko WS message parse failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (isCoinGeckoWsPingPayload(parsed)) {
      this.sendPong();
      return;
    }

    const normalized = normalizeCoinGeckoWsTickerMessage(parsed);
    if (normalized) {
      this.authFailureCount = 0;
      this.cacheLatestPrices(normalized);
      this.emit("price_update", normalized);
    }
  }

  private onClose(event: CloseEvent) {
    this.isConnecting = false;
    this.ws = null;
    this.serverSubscribedCoinIds.clear();
    this.stopHeartbeat();
    const closeMessage = `CoinGecko WS closed: ${event.code} ${event.reason || "no reason"}`;
    if (shouldWarnCoinGeckoWsClose(event.code, event.reason)) {
      logger.warn(closeMessage);
    } else {
      logger.info(closeMessage);
    }

    if (isCoinGeckoWsAuthFailureClose(event.code, event.reason)) {
      this.handleAuthFailureClose();
    } else if (event.code !== 1000) {
      this.authFailureCount = 0;
    }

    if (!this.forcedClose) {
      this.scheduleReconnect();
    }
  }

  private onError(_event: Event) {
    logger.error("CoinGecko WS error");
  }

  private scheduleReconnect(minDelayMs = 0, incrementAttempt = true) {
    if (this.reconnectTimeout || this.forcedClose || !this.activeCoinIds.size) {
      return;
    }

    const backoffDelay = Math.min(
      RECONNECT_MAX_MS,
      Math.round(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt),
    );
    const delay = Math.max(backoffDelay, Math.max(0, Math.round(minDelayMs)));
    if (incrementAttempt) {
      this.reconnectAttempt += 1;
    }

    logger.info(`CoinGecko WS reconnecting in ${delay}ms...`);
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const payloads = ['{"type":"pong"}', '{"command":"pong"}'];
    for (const payload of payloads) {
      try {
        this.ws.send(payload);
      } catch (error) {
        logger.debug("CoinGecko WS pong send failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
    }
  }

  private cacheLatestPrices(prices: Record<string, CoinGeckoWsPriceUpdate>) {
    for (const [coinId, update] of Object.entries(prices)) {
      const normalizedCoinId = coinId.trim().toLowerCase();
      if (!normalizedCoinId) {
        continue;
      }

      if (this.latestPrices.has(normalizedCoinId)) {
        this.latestPrices.delete(normalizedCoinId);
      }
      this.latestPrices.set(normalizedCoinId, update);
    }

    while (this.latestPrices.size > MAX_LATEST_PRICE_CACHE_SIZE) {
      const oldestKey = this.latestPrices.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.latestPrices.delete(oldestKey);
    }
  }

  private getCurrentAuthQuery(): CoinGeckoWsAuthQuery | null {
    if (!WS_AUTH_QUERIES.length) {
      return null;
    }

    const index = Math.min(this.wsAuthQueryIndex, WS_AUTH_QUERIES.length - 1);
    return WS_AUTH_QUERIES[index] ?? null;
  }

  private getDisabledMsRemaining(): number {
    if (!this.disabledUntilMs) {
      return 0;
    }

    const remaining = this.disabledUntilMs - Date.now();
    if (remaining <= 0) {
      this.disabledUntilMs = 0;
      return 0;
    }

    return remaining;
  }

  private handleAuthFailureClose() {
    this.authFailureCount += 1;
    const nextAuthIndex = this.wsAuthQueryIndex + 1;
    if (nextAuthIndex < WS_AUTH_QUERIES.length) {
      this.wsAuthQueryIndex = nextAuthIndex;
      this.reconnectAttempt = 0;
      logger.warn("CoinGecko WS auth failed; retrying with alternate auth key type", {
        authKeyType: this.getCurrentAuthQuery()?.name,
      });
      return;
    }

    if (this.authFailureCount < AUTH_FAILURE_COOLDOWN_TRIGGER_COUNT) {
      return;
    }

    this.wsAuthQueryIndex = 0;
    this.reconnectAttempt = 0;
    this.disabledUntilMs = Date.now() + AUTH_FAILURE_COOLDOWN_MS;
    logger.warn("CoinGecko WS auth failed repeatedly; pausing reconnect attempts", {
      cooldownMs: AUTH_FAILURE_COOLDOWN_MS,
      retryAt: this.disabledUntilMs,
    });
  }
}

export const coingeckoWS = new CoinGeckoWebSocketClient();
