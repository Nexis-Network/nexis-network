import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getEvmFilteredTokens } from "@/server/moralis/evm/market";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const primitiveSchema = z.union([z.string(), z.number(), z.boolean()]);
const valueSchema = z.union([primitiveSchema, z.array(primitiveSchema)]);

export async function POST(request: Request) {
  return timeApiRoute("tools.market.filteredTokens.POST", async () => {
    const rl = await enforceToolRateLimit({ request, route: "market.filtered_tokens" });
    if (!rl.ok) return rl.response;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return apiResponse.badRequest("Invalid JSON body");

    const parsedBody = z.record(valueSchema).safeParse(body);
    if (!parsedBody.success) {
      return apiResponse.validationError(parsedBody.error);
    }

    const params = parsedBody.data as Record<string, UntypedJson>;
    try {
      const raw = await getEvmFilteredTokens(params);
      const items = normalizeTokenList(raw);

      const response = apiResponse.success({ items });
      response.headers.set("Cache-Control", "public, max-age=45, stale-while-revalidate=600");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}

function normalizeTokenList(raw: UntypedJson) {
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
      return {
        address: toStringOrNull(r.contract_address ?? r.token_address ?? r.address)?.toLowerCase() ?? null,
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
