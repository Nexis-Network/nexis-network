import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { mapEvmNftsToUnified, toUnifiedEvmChain } from "@/server/moralis/evm/wallet";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  excludeSpam: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.nfts.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.nfts", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      chain: url.searchParams.get("chain") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      excludeSpam: url.searchParams.get("excludeSpam") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeEvmAddress(parsed.data.address);
      const chain = toUnifiedEvmChain(parsed.data.chain ?? null);

      const chainId = chain.chain ? parseInt(chain.chain, 16) : 1;
      
      const summary = await fetchNexEvmWalletSummary(address, {
        includeTokens: false,
        includeNfts: true,
        chainIds: [chainId],
        limit: parsed.data.limit ?? 25,
        nftsCursor: parsed.data.cursor ? Number(parsed.data.cursor) : 0, // Converting string/number logic
        skipCache: false
      });

      // summary.nfts are Raw items + chain property. valid for map.
      const nfts = mapEvmNftsToUnified(summary.nfts, chain);
      const cursor = summary.nextNftsCursor?.toString() ?? null;
      const response = apiResponse.success({ address, chain, nfts, cursor });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=600");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
