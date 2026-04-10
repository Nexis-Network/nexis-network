import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { getSolanaTokenPairStats } from "@/server/moralis/solana/dex";
import { asRecord, toNumber } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  network: z.string().optional(),
  pairAddress: z.string().min(1),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.sol.pairs.stats.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "sol.pairs.stats" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      network: url.searchParams.get("network") ?? undefined,
      pairAddress: url.searchParams.get("pairAddress"),
    });

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const pairAddress = normalizeSolanaAddress(parsed.data.pairAddress);
      const raw = await getSolanaTokenPairStats({ network, pairAddress });

      const record = asRecord(raw) ?? {};
      const stats = {
        priceUsd: toNumber(record.priceUsd ?? record.price_usd ?? record.price) ?? null,
        liquidityUsd: toNumber(record.liquidityUsd ?? record.liquidity_usd ?? record.liquidity) ?? null,
        volume24hUsd: toNumber(record.volumeUsd24h ?? record.volume_24h_usd ?? record.volume_usd_24h) ?? null,
        fdvUsd: toNumber(record.fdvUsd ?? record.fdv_usd ?? record.fdv) ?? null,
        marketCapUsd: toNumber(record.marketCapUsd ?? record.market_cap_usd ?? record.market_cap) ?? null,
      };

      const response = apiResponse.success({ network, pairAddress, stats });
      response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}
