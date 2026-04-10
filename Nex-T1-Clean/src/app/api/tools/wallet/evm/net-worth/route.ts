import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";
import { toUnifiedEvmChain } from "@/server/moralis/evm/wallet";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.net_worth.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.networth", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      chain: url.searchParams.get("chain") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeEvmAddress(parsed.data.address);
      const chain = toUnifiedEvmChain(parsed.data.chain ?? null);
      const chainId = Number.parseInt(chain.chain, 16);
      const summary = await fetchNexEvmWalletSummary(address, {
        includeTokens: true,
        includeNfts: false,
        includeTransactions: false,
        chainIds: [chainId],
        skipCache: false,
      });
      const netWorthUsd = summary.tokens.reduce(
        (total, token) => total + (token.valueUsd ?? 0),
        0,
      );

      const response = apiResponse.success({
        address,
        chain,
        netWorthUsd,
        raw: {
          source: "nex-summary",
          tokenCount: summary.tokens.length,
          fetchedAt: summary.fetchedAt,
        },
      });
      response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
