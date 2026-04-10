import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getCoinGeckoMarketMovers } from "@/app/api/tools/market/_coingecko-movers";
import { MoralisConfigError, MoralisError } from "@/server/moralis/client";
import { getEvmTopGainers } from "@/server/moralis/evm/market";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmChain } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  timeFrame: z.enum(["1h", "24h", "7d", "30d"]).optional(),
  minMarketCap: z.coerce.number().min(0).optional(),
  securityScore: z.coerce.number().min(0).max(100).optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.market.gainers.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "market.gainers" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      chain: url.searchParams.get("chain") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      timeFrame: url.searchParams.get("timeFrame") ?? url.searchParams.get("time_frame") ?? undefined,
      minMarketCap: url.searchParams.get("minMarketCap") ?? url.searchParams.get("min_market_cap") ?? undefined,
      securityScore: url.searchParams.get("securityScore") ?? url.searchParams.get("security_score") ?? undefined,
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const chain = normalizeEvmChain(parsed.data.chain ?? undefined, "0x1");
      const limit = parsed.data.limit ?? 20;
      const timeFrame = parsed.data.timeFrame ?? "24h";

      const raw = await getEvmTopGainers({
        chain,
        limit,
        timeFrame,
        minMarketCap: parsed.data.minMarketCap,
        securityScore: parsed.data.securityScore,
        fallbackToTopMovers: false,
      });
      const items = normalizeTokenList(raw, chain).slice(0, limit);

      const response = apiResponse.success({ chain, timeFrame, items });
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
      return response;
    } catch (error) {
      if (error instanceof MoralisConfigError || error instanceof MoralisError) {
        const chain = normalizeEvmChain(parsed.data.chain ?? undefined, "0x1");
        const limit = parsed.data.limit ?? 20;
        const timeFrame = parsed.data.timeFrame ?? "24h";
        const fallbackReason =
          error instanceof MoralisConfigError
            ? "not_configured"
            : error.errorType === "rate_limit"
              ? "rate_limited"
              : error.errorType === "network"
                ? "upstream_network"
                : "upstream_error";

        try {
          const fallbackItems = await getCoinGeckoMarketMovers({
            chain,
            direction: "gainers",
            limit,
            timeFrame,
            minMarketCap: parsed.data.minMarketCap,
          });

          const response = apiResponse.success({ chain, timeFrame, items: fallbackItems });
          response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
          response.headers.set("X-Market-Fallback", "coingecko");
          response.headers.set("X-Market-Fallback-Reason", fallbackReason);
          if (error instanceof MoralisError) {
            if (typeof error.meta.status === "number") {
              response.headers.set("X-Upstream-Status", String(error.meta.status));
            }
            if (error.errorType) {
              response.headers.set("X-Upstream-Error-Type", error.errorType);
            }
          }
          return response;
        } catch {
          const response = apiResponse.success({
            chain,
            timeFrame,
            items: [],
          });
          response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
          response.headers.set("X-Market-Fallback", "upstream-empty");
          response.headers.set("X-Market-Fallback-Reason", "upstream_error");
          return response;
        }
      }
      return toolErrorResponse(error);
    }
  });
}

function normalizeTokenList(raw: UntypedJson, chain: `0x${string}`) {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.tokens) ? (record?.tokens as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  return list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      const address = toStringOrNull(r.contract_address ?? r.token_address ?? r.address)?.toLowerCase() ?? null;
      const symbol = toStringOrNull(r.token_symbol ?? r.symbol) ?? null;
      const name = toStringOrNull(r.token_name ?? r.name) ?? null;
      return {
        id: address ? `${chain}:${address}` : `${chain}:${symbol ?? name ?? "token"}`,
        chain,
        address,
        symbol,
        name,
        logoUrl: toStringOrNull(r.token_logo ?? r.logo ?? r.image) ?? null,
        priceUsd: toNumber(r.price_usd ?? r.usd_price ?? r.priceUsd) ?? null,
        priceChange24hPercent: toNumber(r.price_24h_percent_change ?? r.priceChange24hPercent ?? r.usd_price_24hr_percent_change) ?? null,
        marketCapUsd: toNumber(r.market_cap_usd ?? r.marketCapUsd) ?? null,
        volume24hUsd: toNumber(r.volume_usd ?? r.volumeUsd24h ?? r.volume_24h_usd) ?? null,
        securityScore: toNumber(r.security_score ?? r.securityScore) ?? null,
      };
    })
    .filter((t) => t.address || t.symbol || t.name);
}
