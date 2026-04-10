import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { getCoinMarketChart, getTokenMarketChartByContract } from "@/server/market/coingecko";
import { getSolanaOhlcvByPairAddress, getSolanaTokenPairsByAddress } from "@/server/moralis/solana/dex";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmAddress, normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  chainKind: z.enum(["evm", "solana", "stellar"]),
  chainId: z.coerce.number().int().positive().optional(),
  network: z.string().optional(),
  tokenAddress: z.string().optional(),
  coinId: z.string().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
});

const COINGECKO_PLATFORM_BY_CHAIN_ID: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  42161: "arbitrum-one",
  56: "binance-smart-chain",
  10: "optimistic-ethereum",
  137: "polygon-pos",
  59144: "linea",
};

function computeDirection(values: number[]): "positive" | "negative" | "neutral" {
  if (values.length < 2) return "neutral";
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === last) return "neutral";
  return last > first ? "positive" : "negative";
}

function pickNumberArrayFromMarketChart(chart: Awaited<ReturnType<typeof getCoinMarketChart>>["data"]): number[] {
  const prices = Array.isArray(chart?.prices) ? chart.prices : [];
  const out: number[] = [];
  for (const entry of prices) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const value = typeof entry[1] === "number" ? entry[1] : Number(entry[1]);
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

function parseSolanaPairAddress(payload: Record<string, UntypedJson>): string | null {
  const items =
    (payload.pairs ?? payload.result ?? payload.items ?? payload.data) as UntypedJson;
  if (!Array.isArray(items)) {
    return null;
  }
  // Prefer the first pair with the highest liquidity if present.
  let best: { addr: string; liq: number } | null = null;
  for (const raw of items) {
    const r = asRecord(raw) ?? {};
    const addr = toStringOrNull(r.pairAddress ?? r.pair_address ?? r.address);
    if (!addr) continue;
    const liq = toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? 0;
    if (!best || liq > best.liq) best = { addr, liq };
  }
  return best?.addr ?? null;
}

function parseSolanaOhlcvClose(payload: Record<string, UntypedJson>): number[] {
  const items = (payload.result ?? payload.items ?? payload.data) as UntypedJson;
  if (!Array.isArray(items)) return [];
  const out: number[] = [];
  for (const raw of items) {
    const r = asRecord(raw) ?? {};
    const close =
      toNumber(r.close ?? r.c ?? r.closeUsd ?? r.close_usd ?? r.value ?? r.v) ??
      null;
    if (typeof close === "number" && Number.isFinite(close)) out.push(close);
  }
  return out;
}

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("assets.sparkline.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "assets.sparkline", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      chainKind: url.searchParams.get("chainKind"),
      chainId: url.searchParams.get("chainId") ?? undefined,
      network: url.searchParams.get("network") ?? undefined,
      tokenAddress: url.searchParams.get("tokenAddress") ?? undefined,
      coinId: url.searchParams.get("coinId") ?? undefined,
      days: url.searchParams.get("days") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    const days = parsed.data.days ?? 1;

    try {
      if (parsed.data.chainKind === "stellar") {
        const coinId = (parsed.data.coinId ?? "stellar").trim().toLowerCase();
        const chart = await getCoinMarketChart(coinId, { vsCurrency: "usd", days, interval: "hourly" });
        const values = pickNumberArrayFromMarketChart(chart.data);
        const response = apiResponse.success({ values, direction: computeDirection(values) });
        response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=3600");
        return auth.bridge.commit(response);
      }

      if (parsed.data.chainKind === "evm") {
        const tokenAddress = parsed.data.tokenAddress?.trim();
        if (tokenAddress) {
          const chainId = parsed.data.chainId ?? 1;
          const platform = COINGECKO_PLATFORM_BY_CHAIN_ID[chainId] ?? "ethereum";
          const addr = normalizeEvmAddress(tokenAddress);
          const chart = await getTokenMarketChartByContract({ platform, contractAddress: addr, vsCurrency: "usd", days });
          const values = pickNumberArrayFromMarketChart(chart.data);
          const response = apiResponse.success({ values, direction: computeDirection(values) });
          response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=3600");
          return auth.bridge.commit(response);
        }

        const coinId = (parsed.data.coinId ?? "").trim().toLowerCase();
        if (!coinId) {
          return auth.bridge.commit(apiResponse.badRequest("coinId_or_tokenAddress_required"));
        }
        const chart = await getCoinMarketChart(coinId, { vsCurrency: "usd", days, interval: "hourly" });
        const values = pickNumberArrayFromMarketChart(chart.data);
        const response = apiResponse.success({ values, direction: computeDirection(values) });
        response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=3600");
        return auth.bridge.commit(response);
      }

      // Solana
      const tokenAddress = parsed.data.tokenAddress?.trim();
      if (!tokenAddress) {
        const coinId = (parsed.data.coinId ?? "solana").trim().toLowerCase();
        const chart = await getCoinMarketChart(coinId, { vsCurrency: "usd", days, interval: "hourly" });
        const values = pickNumberArrayFromMarketChart(chart.data);
        const response = apiResponse.success({ values, direction: computeDirection(values) });
        response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=3600");
        return auth.bridge.commit(response);
      }

      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const mint = normalizeSolanaAddress(tokenAddress);
      const pairsPayload = await getSolanaTokenPairsByAddress({ network, address: mint });
      const pairAddress = parseSolanaPairAddress(asRecord(pairsPayload) ?? {});
      if (!pairAddress) {
        const response = apiResponse.success({ values: [], direction: "neutral" as const });
        response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
        return auth.bridge.commit(response);
      }

      const now = new Date();
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const timeframe = days <= 1 ? "1h" : days <= 7 ? "4h" : "1d";
      const limit = timeframe === "1h" ? 48 : timeframe === "4h" ? 84 : 60;

      const ohlcvPayload = await getSolanaOhlcvByPairAddress({
        network,
        pairAddress,
        fromDate: from.toISOString(),
        toDate: now.toISOString(),
        timeframe,
        currency: "usd",
        limit,
      });

      const values = parseSolanaOhlcvClose(asRecord(ohlcvPayload) ?? {});
      const response = apiResponse.success({ values, direction: computeDirection(values), pairAddress, network });
      response.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=900");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
