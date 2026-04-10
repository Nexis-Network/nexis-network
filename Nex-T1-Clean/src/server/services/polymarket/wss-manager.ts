/**
 * Polymarket WebSocket Manager
 *
 * Manages WebSocket connections to Polymarket's market and user channels.
 * Handles reconnection with exponential backoff, heartbeat ping/pong,
 * and message routing to subscribers.
 *
 * Market Channel (public): wss://ws-subscriptions-clob.polymarket.com/ws/market
 * User Channel (authenticated): wss://ws-subscriptions-clob.polymarket.com/ws/user
 *
 * Source: https://docs.polymarket.com/market-data/websocket/overview
 */

import { logger } from "@/lib/logger";
import {
  POLYMARKET_WSS_MARKET,
  POLYMARKET_WSS_USER,
} from "./constants";
import type {
  WssMarketEvent,
  WssUserEvent,
  ClobApiKeyCreds,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MarketEventHandler = (event: WssMarketEvent) => void;
type UserEventHandler = (event: WssUserEvent) => void;
type CredentialResolver = () => Promise<ClobApiKeyCreds | null> | ClobApiKeyCreds | null;

interface WssConnectionState {
  ws: WebSocket | null;
  reconnectAttempts: number;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  isClosing: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 10_000; // Send PING every 10 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const MESSAGE_DEBOUNCE_MS = 100; // Debounce orderbook updates

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

class WssManager {
  private marketConn: WssConnectionState = this.createEmptyState();
  private userConn: WssConnectionState = this.createEmptyState();

  private marketSubscribers = new Map<string, Set<MarketEventHandler>>();
  private userSubscribers = new Map<string, Set<UserEventHandler>>();

  /** Credential resolver for user channel — avoids holding raw secrets in closure */
  private userCredResolver: CredentialResolver | null = null;

  private lastMarketEvent = new Map<string, number>(); // tokenId -> timestamp

  // ── Market Channel (Public) ─────────────────────────────────────────────

  /**
   * Subscribe to real-time market updates for specific token IDs.
   * Automatically connects to the WebSocket if not already connected.
   */
  subscribeMarket(tokenIds: string[], handler: MarketEventHandler): () => void {
    for (const tokenId of tokenIds) {
      if (!this.marketSubscribers.has(tokenId)) {
        this.marketSubscribers.set(tokenId, new Set());
      }
      this.marketSubscribers.get(tokenId)!.add(handler);
    }

    // Connect if not already connected
    if (!this.marketConn.ws || this.marketConn.ws.readyState !== WebSocket.OPEN) {
      this.connectMarket(tokenIds);
    } else {
      // Dynamic subscription without reconnecting
      this.sendMarketSubscription(tokenIds, "subscribe");
    }

    // Return unsubscribe function
    return () => {
      for (const tokenId of tokenIds) {
        this.marketSubscribers.get(tokenId)?.delete(handler);
        if (this.marketSubscribers.get(tokenId)?.size === 0) {
          this.marketSubscribers.delete(tokenId);
          this.sendMarketSubscription([tokenId], "unsubscribe");
        }
      }

      // Disconnect if no more subscribers
      if (this.marketSubscribers.size === 0) {
        this.disconnectMarket();
      }
    };
  }

  /**
   * Subscribe to real-time user order/trade updates.
   *
   * Accepts a credential resolver callback instead of raw credentials
   * so secrets are not held in memory via closures. The resolver is
   * called at connection time and on each reconnection to fetch fresh
   * credentials on demand.
   */
  subscribeUser(
    conditionIds: string[],
    credResolver: CredentialResolver,
    handler: UserEventHandler,
  ): () => void {
    this.userCredResolver = credResolver;

    for (const condId of conditionIds) {
      if (!this.userSubscribers.has(condId)) {
        this.userSubscribers.set(condId, new Set());
      }
      this.userSubscribers.get(condId)!.add(handler);
    }

    if (!this.userConn.ws || this.userConn.ws.readyState !== WebSocket.OPEN) {
      this.connectUser(conditionIds);
    }

    return () => {
      for (const condId of conditionIds) {
        this.userSubscribers.get(condId)?.delete(handler);
        if (this.userSubscribers.get(condId)?.size === 0) {
          this.userSubscribers.delete(condId);
        }
      }

      if (this.userSubscribers.size === 0) {
        this.disconnectUser();
      }
    };
  }

  /**
   * Disconnect all WebSocket connections and clean up.
   */
  disconnectAll(): void {
    this.disconnectMarket();
    this.disconnectUser();
  }

  // ── Connection Management ───────────────────────────────────────────────

  private connectMarket(tokenIds: string[]): void {
    if (typeof WebSocket === "undefined") {
      logger.warn("[polymarket:wss] WebSocket not available in this environment");
      return;
    }

    try {
      this.marketConn.isClosing = false;
      const ws = new WebSocket(POLYMARKET_WSS_MARKET);

      ws.onopen = () => {
        logger.info("[polymarket:wss] Market channel connected");
        this.marketConn.reconnectAttempts = 0;
        this.sendMarketSubscription(tokenIds, "subscribe");
        this.startHeartbeat(this.marketConn, ws);
      };

      ws.onmessage = (event) => {
        this.handleMarketMessage(event.data);
      };

      ws.onclose = () => {
        this.stopHeartbeat(this.marketConn);
        if (!this.marketConn.isClosing && this.marketSubscribers.size > 0) {
          this.scheduleReconnect(this.marketConn, () => {
            this.connectMarket(Array.from(this.marketSubscribers.keys()));
          });
        }
      };

      ws.onerror = (err) => {
        logger.error("[polymarket:wss] Market channel error", err);
      };

      this.marketConn.ws = ws;
    } catch (err) {
      logger.error("[polymarket:wss] Failed to connect market channel", err);
    }
  }

  private connectUser(conditionIds: string[]): void {
    if (typeof WebSocket === "undefined") {
      logger.warn("[polymarket:wss] WebSocket not available in this environment");
      return;
    }

    try {
      this.userConn.isClosing = false;
      const ws = new WebSocket(POLYMARKET_WSS_USER);

      ws.onopen = async () => {
        logger.info("[polymarket:wss] User channel connected");
        this.userConn.reconnectAttempts = 0;

        // Resolve credentials on-demand (never stored in closure)
        const creds = await this.userCredResolver?.();
        if (!creds) {
          logger.error("[polymarket:wss] User channel credential resolver returned null — closing");
          ws.close();
          return;
        }

        // User channel requires auth in subscription message
        const subscribeMsg = JSON.stringify({
          auth: {
            apiKey: creds.apiKey,
            secret: creds.secret,
            passphrase: creds.passphrase,
          },
          markets: conditionIds,
          type: "user",
        });
        ws.send(subscribeMsg);

        this.startHeartbeat(this.userConn, ws);
      };

      ws.onmessage = (event) => {
        this.handleUserMessage(event.data);
      };

      ws.onclose = () => {
        this.stopHeartbeat(this.userConn);
        if (!this.userConn.isClosing && this.userSubscribers.size > 0) {
          this.scheduleReconnect(this.userConn, () => {
            this.connectUser(Array.from(this.userSubscribers.keys()));
          });
        }
      };

      ws.onerror = (err) => {
        logger.error("[polymarket:wss] User channel error", err);
      };

      this.userConn.ws = ws;
    } catch (err) {
      logger.error("[polymarket:wss] Failed to connect user channel", err);
    }
  }

  private disconnectMarket(): void {
    this.marketConn.isClosing = true;
    this.stopHeartbeat(this.marketConn);
    if (this.marketConn.reconnectTimeout) {
      clearTimeout(this.marketConn.reconnectTimeout);
    }
    if (this.marketConn.ws) {
      this.marketConn.ws.close();
      this.marketConn.ws = null;
    }
    this.marketSubscribers.clear();
  }

  private disconnectUser(): void {
    this.userConn.isClosing = true;
    this.stopHeartbeat(this.userConn);
    if (this.userConn.reconnectTimeout) {
      clearTimeout(this.userConn.reconnectTimeout);
    }
    if (this.userConn.ws) {
      this.userConn.ws.close();
      this.userConn.ws = null;
    }
    this.userSubscribers.clear();
    this.userCredResolver = null; // Release credential resolver reference
  }

  // ── Message Handling ────────────────────────────────────────────────────

  private handleMarketMessage(rawData: string): void {
    if (rawData === "PONG") return; // Heartbeat response

    try {
      const events: WssMarketEvent[] = JSON.parse(rawData);
      const eventsArray = Array.isArray(events) ? events : [events];

      for (const event of eventsArray) {
        const tokenId = "asset_id" in event ? event.asset_id : undefined;
        if (!tokenId) continue;

        // Debounce: skip if we got an event for this token too recently
        const lastTime = this.lastMarketEvent.get(tokenId) ?? 0;
        const now = Date.now();
        if (now - lastTime < MESSAGE_DEBOUNCE_MS) continue;
        this.lastMarketEvent.set(tokenId, now);

        const handlers = this.marketSubscribers.get(tokenId);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(event);
            } catch (err) {
              logger.error("[polymarket:wss] Market handler error", err);
            }
          }
        }
      }
    } catch {
      // Non-JSON message (e.g., connection ack), ignore
    }
  }

  private handleUserMessage(rawData: string): void {
    if (rawData === "PONG") return;

    try {
      const events: WssUserEvent[] = JSON.parse(rawData);
      const eventsArray = Array.isArray(events) ? events : [events];

      for (const event of eventsArray) {
        const market = "market" in event ? event.market : undefined;
        if (!market) continue;

        const handlers = this.userSubscribers.get(market);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(event);
            } catch (err) {
              logger.error("[polymarket:wss] User handler error", err);
            }
          }
        }
      }
    } catch {
      // Non-JSON message, ignore
    }
  }

  // ── Heartbeat ───────────────────────────────────────────────────────────

  private startHeartbeat(conn: WssConnectionState, ws: WebSocket): void {
    this.stopHeartbeat(conn);
    conn.heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("PING");
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(conn: WssConnectionState): void {
    if (conn.heartbeatInterval) {
      clearInterval(conn.heartbeatInterval);
      conn.heartbeatInterval = null;
    }
  }

  // ── Reconnection ────────────────────────────────────────────────────────

  private scheduleReconnect(conn: WssConnectionState, connectFn: () => void): void {
    if (conn.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error("[polymarket:wss] Max reconnection attempts reached");
      return;
    }

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, conn.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS,
    );

    // Add jitter (0-25% of delay)
    const jitter = Math.random() * delay * 0.25;

    logger.info(`[polymarket:wss] Reconnecting in ${delay + jitter}ms (attempt ${conn.reconnectAttempts + 1})`);

    conn.reconnectTimeout = setTimeout(() => {
      conn.reconnectAttempts++;
      connectFn();
    }, delay + jitter);
  }

  // ── Subscription Messages ───────────────────────────────────────────────

  private sendMarketSubscription(tokenIds: string[], operation: "subscribe" | "unsubscribe"): void {
    if (this.marketConn.ws?.readyState !== WebSocket.OPEN) return;

    const msg = JSON.stringify({
      assets_ids: tokenIds,
      type: "market",
      ...(operation === "subscribe" ? { custom_feature_enabled: true } : {}),
      operation,
    });

    this.marketConn.ws.send(msg);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private createEmptyState(): WssConnectionState {
    return {
      ws: null,
      reconnectAttempts: 0,
      heartbeatInterval: null,
      reconnectTimeout: null,
      isClosing: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const wssManager = new WssManager();
export { WssManager };
