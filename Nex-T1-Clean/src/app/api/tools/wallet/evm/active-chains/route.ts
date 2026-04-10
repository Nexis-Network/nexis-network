import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { getEvmWalletActiveChains } from "@/server/moralis/evm/wallet";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.active_chains.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.active_chains", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ address: url.searchParams.get("address") });
    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeEvmAddress(parsed.data.address);
      const chains = await getEvmWalletActiveChains(address);
      const response = apiResponse.success({ address, activeChains: chains.active_chains ?? [] });
      response.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=1800");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}

