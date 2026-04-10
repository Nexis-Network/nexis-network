import { connection, NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { coingeckoOnchainTradeWS, type OnchainTradeEvent } from "@/server/market/coingecko-onchain-ws";
import { createLogger } from "@/server/logging/logging";

const logger = createLogger("market-trades-stream");


/**
 * SSE endpoint for real-time on-chain trade events from CoinGecko OnchainTrade WS.
 *
 * Query params:
 *   pools - comma-separated "network:poolAddress" strings
 *           e.g. "eth:0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640,eth:0x11b815efb8f581194ae79006d24e0d814b7697f6"
 */
export async function GET(req: NextRequest) {
  await connection();
  const { searchParams } = new URL(req.url);
  const poolsParam = searchParams.get("pools");

  const requestedPools = poolsParam
    ? new Set(poolsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
    : new Set<string>();

  if (!requestedPools.size) {
    return NextResponse.json({ error: "Missing 'pools' query parameter" }, { status: 400 });
  }

  const subscriptionId = randomUUID();
  coingeckoOnchainTradeWS.upsertSubscription(subscriptionId, Array.from(requestedPools));

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      // Initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            timestamp: Date.now(),
            pools: Array.from(requestedPools),
          })}\n\n`,
        ),
      );

      const onTrade = (trade: OnchainTradeEvent) => {
        if (closed) return;

        // Only emit trades for pools this client subscribed to
        const poolKey = `${trade.network}:${trade.poolAddress}`.toLowerCase();
        if (!requestedPools.has(poolKey)) return;

        const payload = JSON.stringify({ type: "trade", data: trade });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      coingeckoOnchainTradeWS.on("trade", onTrade);

      const keepAlive = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        coingeckoOnchainTradeWS.off("trade", onTrade);
        coingeckoOnchainTradeWS.removeSubscription(subscriptionId);
      };

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      coingeckoOnchainTradeWS.removeSubscription(subscriptionId);
    },
  });

  logger.info("OnchainTrade SSE stream opened", { pools: Array.from(requestedPools) });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
