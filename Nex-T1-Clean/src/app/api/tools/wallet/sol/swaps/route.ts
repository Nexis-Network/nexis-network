import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { getSolanaWalletSwapTxs, mapSolanaSwapsToUnified, toUnifiedSolanaChain } from "@/server/moralis/solana/wallet";
import { asRecord } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  network: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  order: z.enum(["ASC", "DESC"]).optional(),
  transactionTypes: z.string().optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.sol.swaps.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.swaps", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      network: url.searchParams.get("network") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      transactionTypes: url.searchParams.get("transactionTypes") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeSolanaAddress(parsed.data.address);
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const chain = toUnifiedSolanaChain(network);
      const transactionTypes = parsed.data.transactionTypes
        ? parsed.data.transactionTypes
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];

      const raw = await getSolanaWalletSwapTxs({
        address,
        network,
        limit: parsed.data.limit ?? 25,
        cursor: parsed.data.cursor ?? null,
        order: parsed.data.order,
        transactionTypes,
      });

      const swaps = mapSolanaSwapsToUnified(raw, address, chain);
      const record = asRecord(raw) ?? {};
      const cursor =
        typeof record.cursor === "string" && record.cursor.trim().length > 0
          ? record.cursor.trim()
          : null;
      const response = apiResponse.success({ address, chain, swaps, cursor });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
