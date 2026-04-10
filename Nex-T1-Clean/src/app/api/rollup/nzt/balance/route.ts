import { z } from "zod";
import { createPublicClient, formatUnits, http, isAddress } from "viem";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  buildNztRollupChain,
  getNztRollupConfig,
} from "@/lib/networks/capabilities";
import {
  resolveAuthenticatedSupabaseUser,
  toStandardErrorResponse,
} from "@/server/api/helpers/auth-guard";

const querySchema = z.object({
  address: z.string().refine((value) => isAddress(value), "A valid EVM address is required."),
});

export async function GET(request: Request) {
  const authResult = await resolveAuthenticatedSupabaseUser(request);
  if (!authResult.ok) {
    return toStandardErrorResponse(authResult);
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    address: searchParams.get("address"),
  });

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const { address } = parsed.data;
  const { supabase, userId } = authResult.auth;

  const { count, error } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .ilike("address", address);

  if (error) {
    logger.error("nzt_rollup_balance_ownership_check_failed", {
      userId,
      address,
      error: error.message,
    });
    return apiResponse.internalError("Failed to verify wallet ownership");
  }

  if ((count ?? 0) === 0) {
    return apiResponse.forbidden("Address not linked to your account");
  }

  const config = getNztRollupConfig();
  const chain = buildNztRollupChain();

  if (!config.configured || !config.chainId || !config.rpcUrl || !chain) {
    return apiResponse.serviceUnavailable(
      "NZT rollup is not configured",
      "ROLLUP_NOT_CONFIGURED",
    );
  }

  try {
    const client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    const balance = await client.getBalance({
      address: address as `0x${string}`,
    });

    return apiResponse.success({
      address,
      platform: "evm" as const,
      chainId: config.chainId,
      native: {
        symbol: config.nativeSymbol,
        balance: formatUnits(balance, 18),
        rawBalance: balance.toString(),
        usdValue: null,
      },
      tokens: [],
      totalUsdValue: null,
    });
  } catch (error) {
    logger.error("nzt_rollup_balance_failed", {
      userId,
      address,
      chainId: config.chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiResponse.internalError("Failed to fetch NZT rollup balance");
  }
}
