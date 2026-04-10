import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import {
  enforceToolRateLimit,
  toolErrorResponse,
} from "@/app/api/tools/_utils";
import { getSolanaTokenPricesBatch } from "@/server/moralis/solana/price";
import { normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const bodySchema = z.object({
  network: z.string().optional(),
  addresses: z.array(z.string().min(1)).min(1).max(100),
  currency: z.string().optional(),
});

export async function POST(request: Request) {
  return timeApiRoute("tools.sol.token.prices.POST", async () => {
    const rl = await enforceToolRateLimit({
      request,
      route: "sol.token.prices",
    });
    if (!rl.ok) return rl.response;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object")
      return apiResponse.badRequest("Invalid JSON body");

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    try {
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const requestedCurrency = parsed.data.currency?.toLowerCase();
      const currency: "usd" | "eur" | "sol" =
        requestedCurrency === "eur" || requestedCurrency === "sol"
          ? requestedCurrency
          : "usd";
      const prices = await getSolanaTokenPricesBatch({
        network,
        addresses: parsed.data.addresses,
        currency,
      });

      const response = apiResponse.success({ network, prices });
      response.headers.set(
        "Cache-Control",
        "public, max-age=10, stale-while-revalidate=60",
      );
      return response;
    } catch (error) {
      return toolErrorResponse(error);
    }
  });
}
