import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildSimplePriceSubscriptionIdentifier,
  CoinGeckoWebSocketClient,
  isCoinGeckoWsAuthFailureClose,
  isCoinGeckoWsPingPayload,
  normalizeCoinGeckoWsTickerMessage,
  shouldWarnCoinGeckoWsClose,
} from "@/server/market/coingecko-ws";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("normalizeCoinGeckoWsTickerMessage", () => {
  it("maps ticker payload into route-consumable structure", () => {
    const payload = {
      c: "C1",
      i: "bitcoin",
      p: "100000.05",
      pp: "2.5",
      m: "1900000000000",
      v: "34000000000",
      t: 1771643007,
    };

    expect(normalizeCoinGeckoWsTickerMessage(payload)).toEqual({
      bitcoin: {
        price: 100000.05,
        change24hPct: 2.5,
        marketCapUsd: 1900000000000,
        volume24hUsd: 34000000000,
        lastUpdatedAt: 1771643007000,
      },
    });
  });

  it("returns null for non-ticker payloads", () => {
    expect(normalizeCoinGeckoWsTickerMessage({ type: "welcome" })).toBeNull();
    expect(normalizeCoinGeckoWsTickerMessage({ c: "bitcoin" })).toBeNull();
  });
});

describe("buildSimplePriceSubscriptionIdentifier", () => {
  it("builds CoinGecko CGSimplePrice identifier JSON", () => {
    const identifier = buildSimplePriceSubscriptionIdentifier(" Bitcoin ", "USD");
    expect(identifier).not.toBeNull();

    expect(JSON.parse(String(identifier))).toEqual({
      channel: "CGSimplePrice",
      coin_id: "bitcoin",
      action: "set_tokens",
      currency: "usd",
    });
  });

  it("returns null for empty coin ids", () => {
    expect(buildSimplePriceSubscriptionIdentifier("   ", "usd")).toBeNull();
  });
});

describe("isCoinGeckoWsPingPayload", () => {
  it("detects ping string payloads", () => {
    expect(isCoinGeckoWsPingPayload("ping")).toBe(true);
    expect(isCoinGeckoWsPingPayload(" PING ")).toBe(true);
  });

  it("detects ping object payloads", () => {
    expect(isCoinGeckoWsPingPayload({ type: "ping" })).toBe(true);
    expect(isCoinGeckoWsPingPayload({ event: "ping" })).toBe(true);
    expect(isCoinGeckoWsPingPayload({ command: "ping" })).toBe(true);
    expect(isCoinGeckoWsPingPayload({ type: "welcome" })).toBe(false);
  });
});

describe("shouldWarnCoinGeckoWsClose", () => {
  it("does not warn on clean no-pong closures", () => {
    expect(shouldWarnCoinGeckoWsClose(1000, "No Pong")).toBe(false);
  });

  it("warns for unexpected closures", () => {
    expect(shouldWarnCoinGeckoWsClose(1006, "abnormal closure")).toBe(true);
    expect(shouldWarnCoinGeckoWsClose(1000, "normal")).toBe(true);
  });
});

describe("isCoinGeckoWsAuthFailureClose", () => {
  it("detects auth failures reported as normal closures", () => {
    expect(isCoinGeckoWsAuthFailureClose(1000, "Auth Failed")).toBe(true);
    expect(isCoinGeckoWsAuthFailureClose(1000, "auth failed")).toBe(true);
  });

  it("ignores other close reasons and codes", () => {
    expect(isCoinGeckoWsAuthFailureClose(1000, "No Pong")).toBe(false);
    expect(isCoinGeckoWsAuthFailureClose(1006, "Auth Failed")).toBe(false);
  });
});

describe("CoinGeckoWebSocketClient auth failure handling", () => {
  it("skips websocket startup when the feature flag is disabled", async () => {
    vi.resetModules();
    vi.stubEnv("COINGECKO_WS_ENABLED", "false");

    const connectSpy = vi.fn();
    const originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = class {
      constructor() {
        connectSpy();
      }
    } as unknown as typeof WebSocket;

    try {
      const { CoinGeckoWebSocketClient: DisabledClient } = await import("@/server/market/coingecko-ws");
      const client = new DisabledClient();
      const internals = client as unknown as {
        activeCoinIds: Set<string>;
        isConnecting: boolean;
      };

      internals.activeCoinIds = new Set(["ethereum"]);
      client.connect();

      expect(connectSpy).not.toHaveBeenCalled();
      expect(internals.isConnecting).toBe(false);
    } finally {
      globalThis.WebSocket = originalWebSocket;
    }
  });

  it("cooldowns after repeated auth failures even when the socket briefly opens", () => {
    const client = new CoinGeckoWebSocketClient();
    const internals = client as unknown as {
      activeCoinIds: Set<string>;
      authFailureCount: number;
      disabledUntilMs: number;
      wsAuthQueryIndex: number;
      reconnectAttempt: number;
      reconnectTimeout: NodeJS.Timeout | null;
      onOpen: () => void;
      onClose: (event: CloseEvent) => void;
    };

    internals.activeCoinIds = new Set(["ethereum"]);

    internals.onOpen();
    internals.onClose({ code: 1000, reason: "Auth Failed" } as CloseEvent);
    expect(internals.authFailureCount).toBe(1);
    expect(internals.disabledUntilMs).toBe(0);

    internals.reconnectTimeout = null;
    internals.onOpen();
    internals.onClose({ code: 1000, reason: "Auth Failed" } as CloseEvent);
    expect(internals.authFailureCount).toBe(2);
    expect(internals.disabledUntilMs).toBeGreaterThan(Date.now());
    expect(internals.wsAuthQueryIndex).toBe(0);
    expect(internals.reconnectAttempt).toBe(1);
  });

  it("resets auth failures after receiving a valid ticker update", () => {
    const client = new CoinGeckoWebSocketClient();
    const internals = client as unknown as {
      authFailureCount: number;
      onMessage: (event: MessageEvent) => void;
    };

    internals.authFailureCount = 1;
    internals.onMessage({
      data: JSON.stringify({
        i: "ethereum",
        p: "3200.45",
        pp: "1.12",
        m: "100",
        v: "50",
        t: 1771643007,
      }),
    } as MessageEvent);

    expect(internals.authFailureCount).toBe(0);
  });
});
