import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getSolanaTokenPairsByAddress } from "@/server/moralis/solana/dex";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  network: z.string().optional(),
  address: z.string().min(1),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.sol.pairs.byToken.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "sol.pairs.by_token" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      network: url.searchParams.get("network") ?? undefined,
      address: url.searchParams.get("address"),
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const address = normalizeSolanaAddress(parsed.data.address);
      const raw = await getSolanaTokenPairsByAddress({ network, address });

      const items = normalizePairs(raw);
      const response = apiResponse.success({ network, address, items });
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}

function normalizePairs(raw: UntypedJson) {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.pairs) ? (record?.pairs as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  return list
    .map((entry) => {
      const r = asRecord(entry) ?? {};
      return {
        pairAddress: toStringOrNull(r.pairAddress ?? r.address ?? r.pair_address) ?? null,
        dex: toStringOrNull(r.dex ?? r.exchange ?? r.dexId ?? r.dex_id) ?? null,
        baseToken: toStringOrNull(r.baseToken ?? r.base_token ?? r.baseMint ?? r.base_mint ?? r.token0) ?? null,
        quoteToken: toStringOrNull(r.quoteToken ?? r.quote_token ?? r.quoteMint ?? r.quote_mint ?? r.token1) ?? null,
        priceUsd: toNumber(r.priceUsd ?? r.price_usd ?? r.price) ?? null,
        liquidityUsd: toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? null,
        volume24hUsd: toNumber(r.volumeUsd24h ?? r.volume_24h_usd ?? r.volume_usd_24h) ?? null,
      };
    })
    .filter((p) => p.pairAddress || p.baseToken || p.quoteToken);
}
