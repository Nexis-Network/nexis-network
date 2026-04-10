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
  days: z.coerce.number().int().min(1).max(365).optional(),
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
  return timeApiRoute("tools.wallet.sol.pnl.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.pnl", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      network: url.searchParams.get("network") ?? undefined,
      days: url.searchParams.get("days") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeSolanaAddress(parsed.data.address);
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const chain = { kind: "solana" as const, network };
      const _days = parsed.data.days ?? 30;

      if (network !== "mainnet") {
        const response = apiResponse.success({
          address,
          pnl: {
            chain,
            mode: "approximation",
            calculationVersion: "nex-v1",
            asOf: new Date().toISOString(),
            currency: "usd",
            realizedUsd: null,
            unrealizedUsd: null,
            totalUsd: 0,
            costBasisUsd: null,
            roiPercent: null,
            confidence: "low",
            limitations: ["Devnet net worth/PnL is not supported by the upstream vendors."],
            raw: null,
          },
        });
        response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
        return auth.bridge.commit(response);
      }

      const summary = await fetchNexSolanaWalletSummary(address, {
        includeTokens: true,
        includeNfts: true,
      });

      const currentNetWorth = summary.tokens.reduce(
        (acc, token) => acc + readTokenUsdValue(token),
        0,
      );

      // Historical data is not currently available via Helius/CoinGecko combination in this service.
      // We return current net worth and nulls for changes/history for now.
      
      const response = apiResponse.success({
        address,
        pnl: {
          chain,
          mode: "approximation",
          calculationVersion: "nex-v1",
          asOf: new Date().toISOString(),
          currency: "usd",
          realizedUsd: null,
          unrealizedUsd: null,
          totalUsd: null, // No history to diff against
          costBasisUsd: null,
          roiPercent: null,
          confidence: "low",
          limitations: [
            "Computed from current portfolio value (Helius + CoinGecko).",
            "Historical PnL and net worth history are currently unavailable.",
          ],
          raw: { netWorth: currentNetWorth, history: [] },
        },
      });
      response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=900");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
