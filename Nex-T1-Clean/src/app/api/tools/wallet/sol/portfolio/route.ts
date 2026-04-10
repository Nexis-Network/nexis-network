import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  network: z.string().optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.sol.portfolio.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.portfolio", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      network: url.searchParams.get("network") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeSolanaAddress(parsed.data.address);
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      
      const summary = await fetchNexSolanaWalletSummary(address, {
        includeTokens: true,
        includeNfts: true,
        skipCache: false
      });

      // Map to Unified Asset format expected by tools
      const assets = [
        ...summary.tokens.map(t => ({
          platform: "solana",
          contract: t.mint,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          balance: t.amount,
          balanceRaw: t.amount, // Approximate since we don't have raw handy here without calc
          priceUsd: t.priceUsd,
          valueUsd: t.valueUsd,
          change24hPercent: typeof t.priceChange24h === "number" ? t.priceChange24h : null,
          logo: t.logo,
          isNative: t.mint === "So11111111111111111111111111111111111111112"
        })),
        ...summary.nfts.map(n => ({
          platform: "solana",
          contract: (n).id,
          name: (n).content?.metadata?.name,
          symbol: (n).content?.metadata?.symbol,
          decimals: 0,
          balance: 1,
          isNft: true
        }))
      ];

      const response = apiResponse.success({ 
        address, 
        chain: { 
            name: "Solana", 
            type: network === "mainnet" ? "mainnet" : "testnet" 
        }, 
        assets 
      });
      
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
