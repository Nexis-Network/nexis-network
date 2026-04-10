import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { fetchMemecoinCandidates, enrichMemecoinRows } from "@/server/market/solana/memecoin-discovery";
import { memecoinAutotradeParamsSchema, scoreMemecoin } from "@/server/market/solana/memecoin-scoring";


const querySchema = z.object({
  cluster: z.enum(["mainnet-beta", "devnet"]).optional(),
  universe: z.enum(["pumpfun_bonding", "pumpfun_new", "pumpfun_graduated", "birdeye_meme_list"]).optional(),
  limit: z.coerce.number().int().min(5).max(200).optional(),
  enrichTopN: z.coerce.number().int().min(5).max(80).optional(),
  heliusSignatureLimit: z.coerce.number().int().min(0).max(200).optional(),
  heliusTxDetailLimit: z.coerce.number().int().min(0).max(60).optional(),
});

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("tools.sol.discover.GET", async () => {
    const rl = await enforceToolRateLimit({ request, route: "sol.discover" });
    if (!rl.ok) return rl.response;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      cluster: url.searchParams.get("cluster") ?? undefined,
      universe: url.searchParams.get("universe") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      enrichTopN: url.searchParams.get("enrichTopN") ?? undefined,
      heliusSignatureLimit: url.searchParams.get("heliusSignatureLimit") ?? undefined,
      heliusTxDetailLimit: url.searchParams.get("heliusTxDetailLimit") ?? undefined,
    });
    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    const cluster = parsed.data.cluster ?? "mainnet-beta";
    const universe = parsed.data.universe ?? "pumpfun_bonding";
    const limit = parsed.data.limit ?? 80;
    const enrichTopN = parsed.data.enrichTopN ?? 40;
    const heliusSignatureLimit = parsed.data.heliusSignatureLimit ?? 80;
    const heliusTxDetailLimit = parsed.data.heliusTxDetailLimit ?? 25;

    const params = memecoinAutotradeParamsSchema.parse({
      kind: "solana_memecoin_autotrade",
      cluster,
      universe,
      candidateLimit: limit,
      enrichTopN,
      heliusSignatureLimit,
      heliusTxDetailLimit,
    });

    try {
      const candidates = await fetchMemecoinCandidates({ universe, cluster, limit });
      const rows = await enrichMemecoinRows({
        cluster,
        candidates: candidates.slice(0, params.enrichTopN),
        heliusSignatureLimit: params.heliusSignatureLimit,
        heliusTxDetailLimit: params.heliusTxDetailLimit,
      });

      const scored = rows
        .map((row) => {
          const result = scoreMemecoin(row, params);
          return {
            mint: row.candidate.mint,
            name: row.candidate.name,
            symbol: row.candidate.symbol,
            imageUrl: row.candidate.imageUrl,
            universe: row.candidate.universe,
            candidate: row.candidate,
            enrichment: row.enrichment,
            score: result.score,
            reasons: result.reasons,
            hardRejectReasons: result.hardRejectReasons,
          };
        })
        .sort((a, b) => b.score - a.score);

      const response = apiResponse.success({
        cluster,
        universe,
        generatedAt: new Date().toISOString(),
        items: scored,
      });
      response.headers.set("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}
