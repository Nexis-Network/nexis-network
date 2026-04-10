import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createLogger } from "@/server/logging/logging";
import { coingeckoWS } from "@/server/market/coingecko-ws";

import {
  getCachedSimplePriceSnapshot,
  normalizeIncomingUpdate,
  normalizeWsSnapshot,
  type StreamUpdatePayload,
} from "./route.snapshot";

type UnknownJson = Record<string, unknown>;

const logger = createLogger("market-stream");
const KEEPALIVE_INTERVAL_MS = 10_000;
const FALLBACK_SNAPSHOT_INTERVAL_MS = 15_000;

type RateLimitSnapshot = {
  remaining: number;
  resetAt: number;
};

export function createMarketStreamResponse(params: {
  rateLimit: RateLimitSnapshot;
  req: NextRequest;
  requestedCoinList: string[];
  resolvedMapping: Record<string, string>;
}): NextResponse {
  const { rateLimit, req, requestedCoinList, resolvedMapping } = params;
  const requestedCoinSet = new Set(requestedCoinList);
  const subscriptionId = randomUUID();
  coingeckoWS.upsertSubscription(subscriptionId, requestedCoinList);
  let cleanupStream: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const emitSsePayload = (payload: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const emitPriceUpdate = (payload: StreamUpdatePayload) => {
        if (!Object.keys(payload).length) {
          return;
        }

        emitSsePayload({ type: "update", data: payload });
      };

      const onPriceUpdate = (data: UnknownJson) => {
        if (closed) {
          return;
        }

        const normalized: StreamUpdatePayload = {};
        for (const [key, value] of Object.entries(data)) {
          if (!requestedCoinSet.has(key)) {
            continue;
          }

          const parsed = normalizeIncomingUpdate(value);
          if (parsed) {
            normalized[key] = parsed;
          }
        }

        emitPriceUpdate(normalized);
      };

      const sendSnapshot = async () => {
        if (closed) {
          return;
        }

        try {
          const wsSnapshot = coingeckoWS.getLatestPrices(requestedCoinList);
          const normalized: StreamUpdatePayload = {};

          for (const coinId of requestedCoinList) {
            const snapshot = wsSnapshot[coinId];
            if (snapshot) {
              normalized[coinId] = normalizeWsSnapshot(snapshot);
            }
          }

          if (Object.keys(normalized).length < requestedCoinList.length) {
            const restSnapshot = await getCachedSimplePriceSnapshot(requestedCoinList);
            for (const [coinId, snapshot] of Object.entries(restSnapshot)) {
              if (!normalized[coinId]) {
                normalized[coinId] = snapshot;
              }
            }
          }

          emitPriceUpdate(normalized);
        } catch (error) {
          logger.warn("Failed to send initial market stream snapshot", {
            error: error instanceof Error ? error.message : String(error),
            coins: requestedCoinList,
          });
        }
      };

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(keepAlive);
        if (fallbackSnapshotInterval) {
          clearInterval(fallbackSnapshotInterval);
        }
        coingeckoWS.off("price_update", onPriceUpdate);
        coingeckoWS.removeSubscription(subscriptionId);
      };

      emitSsePayload({
        type: "connected",
        timestamp: Date.now(),
        mapping: resolvedMapping,
        coins: requestedCoinList,
      });

      void sendSnapshot();
      coingeckoWS.on("price_update", onPriceUpdate);

      const keepAlive = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
      }, KEEPALIVE_INTERVAL_MS);

      let fallbackSnapshotInterval: NodeJS.Timeout | null = null;
      if (coingeckoWS.isTemporarilyDisabled() || !coingeckoWS.isConnected()) {
        fallbackSnapshotInterval = setInterval(() => {
          if (!coingeckoWS.isTemporarilyDisabled() && coingeckoWS.isConnected()) {
            if (fallbackSnapshotInterval) {
              clearInterval(fallbackSnapshotInterval);
              fallbackSnapshotInterval = null;
            }
            return;
          }

          void sendSnapshot();
        }, FALLBACK_SNAPSHOT_INTERVAL_MS);
      }

      cleanupStream = cleanup;
      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      if (cleanupStream) {
        cleanupStream();
        cleanupStream = null;
      } else {
        coingeckoWS.removeSubscription(subscriptionId);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetAt),
    },
  });
}
