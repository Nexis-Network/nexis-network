import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { enforceToolRateLimit, toolErrorResponse } from "@/app/api/tools/_utils";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
});

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("tools.wallet.evm.balances.GET", async () => {
    return withAuthedSupabase(async ({ cookieBridge, userId }) => {
        // Note: withAuthedSupabase already checked auth, but we still need rate limit
        const rl = await enforceToolRateLimit({ request, route: "wallet.evm.balances", userId });
        if (!rl.ok) return cookieBridge.commit(rl.response);

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
            address: url.searchParams.get("address"),
            chain: url.searchParams.get("chain") ?? undefined,
        });

        if (!parsed.success) {
            return cookieBridge.commit(apiResponse.validationError(parsed.error));
        }

        try {
            const address = parsed.data.address;
            const chainStr = parsed.data.chain; 
            const chainId = chainStr ? parseInt(chainStr, 16) : 1; 

            const summary = await fetchNexEvmWalletSummary(address, {
                includeTokens: true,
                includeNfts: false,
                chainIds: [chainId],
                skipCache: false
            });

            const assets = summary.tokens.map((t) => ({
                token_address: t.contract,
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                balance_formatted: t.balance.toString(),
                usd_price: t.priceUsd,
                usd_value: t.valueUsd,
                usd_price_24hr_percent_change: t.priceChange24h,
                logo: t.logoURI,
                chain_id: t.chainId,
            }));

            const response = apiResponse.success({ address, chain: chainId, assets });
            response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
            return cookieBridge.commit(response);
        } catch (error) {
            return cookieBridge.commit(toolErrorResponse(error));
        }
    });
  });
}
