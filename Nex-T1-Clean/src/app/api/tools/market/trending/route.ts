import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getEvmTrendingTokens } from "@/server/moralis/evm/market";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeMoralisChainFilter } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.market.trending.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "market.trending" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      chain: url.searchParams.get("chain") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const chain = normalizeMoralisChainFilter(parsed.data.chain ?? undefined);
      const limit = parsed.data.limit ?? 20;

      const raw = await getEvmTrendingTokens({ chain, limit });
      const items = normalizeTokenList(raw, chain).slice(0, limit);

      const response = apiResponse.success({ chain, items });
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}

function normalizeTokenList(raw: UntypedJson, chain: `0x${string}` | "solana") {
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
      const rawAddress = toStringOrNull(r.contract_address ?? r.token_address ?? r.address);
      const address = rawAddress ? (chain === "solana" ? rawAddress : rawAddress.toLowerCase()) : null;
      return {
        rank: toNumber(r.rank ?? r.position) ?? null,
        address,
        symbol: toStringOrNull(r.token_symbol ?? r.symbol) ?? null,
        name: toStringOrNull(r.token_name ?? r.name) ?? null,
        logoUrl: toStringOrNull(r.token_logo ?? r.logo ?? r.image) ?? null,
        priceUsd: toNumber(r.price_usd ?? r.usd_price ?? r.priceUsd) ?? null,
        priceChange24hPercent: toNumber(r.price_24h_percent_change ?? r.priceChange24hPercent ?? r.usd_price_24hr_percent_change) ?? null,
        marketCapUsd: toNumber(r.market_cap_usd ?? r.marketCapUsd) ?? null,
        volume24hUsd: toNumber(r.volume_usd ?? r.volumeUsd24h ?? r.volume_24h_usd) ?? null,
      };
    })
    .filter((t) => t.address || t.symbol || t.name);
}
