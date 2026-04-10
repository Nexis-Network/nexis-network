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

function readTokenUsdValue(token: Record<string, UntypedJson>): number {
  const raw = token.valueUsd;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.sol.net_worth.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.networth", userId: auth.userId });
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
      const chain = { kind: "solana" as const, network };

      const summary = await fetchNexSolanaWalletSummary(address, {
        includeTokens: true,
        includeNfts: true, // NFTs might have value if supported later, for now we sum tokens
      });
      
      const netWorthUsd = summary.tokens.reduce(
        (acc, token) => acc + readTokenUsdValue(token),
        0,
      );

      const response = apiResponse.success({ address, chain, netWorthUsd });
      response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
