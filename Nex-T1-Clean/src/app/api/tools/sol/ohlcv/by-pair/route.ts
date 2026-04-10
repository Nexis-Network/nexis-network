import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getSolanaOhlcvByPairAddress } from "@/server/moralis/solana/dex";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  network: z.string().optional(),
  pairAddress: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  timeframe: z.string().min(1),
  currency: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.sol.ohlcv.byPair.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "sol.ohlcv.by_pair" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      network: url.searchParams.get("network") ?? undefined,
      pairAddress: url.searchParams.get("pairAddress"),
      fromDate: url.searchParams.get("fromDate"),
      toDate: url.searchParams.get("toDate"),
      timeframe: url.searchParams.get("timeframe"),
      currency: url.searchParams.get("currency") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const pairAddress = normalizeSolanaAddress(parsed.data.pairAddress);
      const raw = await getSolanaOhlcvByPairAddress({
        network,
        pairAddress,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        timeframe: parsed.data.timeframe,
        currency: parsed.data.currency ?? "usd",
        limit: parsed.data.limit ?? 50,
      });

      const candles = normalizeOhlcv(raw);
      const response = apiResponse.success(
        {
          network,
          pairAddress,
          timeframe: parsed.data.timeframe,
          currency: parsed.data.currency ?? "usd",
          fromDate: parsed.data.fromDate,
          toDate: parsed.data.toDate,
          candles,
        }
      );
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}

function normalizeOhlcv(raw: UntypedJson) {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.ohlcv) ? (record?.ohlcv as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  return list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      const timestamp = toStringOrNull(r.timestamp ?? r.datetime ?? r.date ?? r.time) ?? null;
      return {
        timestamp,
        open: toNumber(r.open) ?? null,
        high: toNumber(r.high) ?? null,
        low: toNumber(r.low) ?? null,
        close: toNumber(r.close) ?? null,
        volume: toNumber(r.volume ?? r.volumeUsd ?? r.volume_usd) ?? null,
      };
    })
    .filter((c) => c.timestamp || c.open != null || c.close != null);
}
