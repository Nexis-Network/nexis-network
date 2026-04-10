import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { getEvmWalletErc20Transfers, toUnifiedEvmChain } from "@/server/moralis/evm/wallet";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.transfers.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.transfers", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      chain: url.searchParams.get("chain") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      fromDate: url.searchParams.get("fromDate") ?? undefined,
      toDate: url.searchParams.get("toDate") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeEvmAddress(parsed.data.address);
      const chain = toUnifiedEvmChain(parsed.data.chain ?? null);

      const { items, cursor } = await getEvmWalletErc20Transfers({
        address,
        chain: chain.chain,
        limit: parsed.data.limit ?? 25,
        cursor: parsed.data.cursor ?? null,
        fromDate: parsed.data.fromDate ?? null,
        toDate: parsed.data.toDate ?? null,
      });

      const transfers = items.map((raw) => {
        const r = asRecord(raw) ?? {};
        return {
          hash: toStringOrNull(r.transaction_hash ?? r.hash),
          timestamp: toStringOrNull(r.block_timestamp ?? r.blockTimestamp),
          from: toStringOrNull(r.from_address ?? r.fromAddress),
          to: toStringOrNull(r.to_address ?? r.toAddress),
          tokenAddress: toStringOrNull(r.address ?? r.token_address ?? r.contract_address)?.toLowerCase() ?? null,
          tokenSymbol: toStringOrNull(r.token_symbol ?? r.symbol),
          tokenName: toStringOrNull(r.token_name ?? r.name),
          value: toStringOrNull(r.value),
          valueUsd: toNumber(r.value_usd ?? r.usd_value ?? r.total_price_usd),
        };
      });

      const response = apiResponse.success({ address, chain, transfers, cursor });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
