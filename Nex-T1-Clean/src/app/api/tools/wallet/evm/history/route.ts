import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { mapEvmHistoryToUnified, toUnifiedEvmChain } from "@/server/moralis/evm/wallet";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeInternalTransactions: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
  includeDecoded: z
    .string()
    .optional()
    .transform((v) => (v == null ? undefined : v === "1" || v.toLowerCase() === "true")),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.history.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.history", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      chain: url.searchParams.get("chain") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      includeInternalTransactions: url.searchParams.get("includeInternalTransactions") ?? undefined,
      includeDecoded: url.searchParams.get("includeDecoded") ?? undefined,
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
        includeNfts: false,
        includeTransactions: true,
        transactionLimit: parsed.data.limit ?? 25,
        chainIds: [chainId],
        skipCache: false
      });

      // summary.txs are raw Moralis items.
      const transactions = mapEvmHistoryToUnified(summary.txs, address, chain);
      const cursor = null; // Unified service does not strictly support history cursor yet
      const response = apiResponse.success({ address, chain, transactions, cursor });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
