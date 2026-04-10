import { createTool, createToolSchema, stringProp, enumProp, numberProp } from "./create-tool";
import { fetchCdpBalances } from "@/server/services/cdp/balance-service";
import { logger } from "@/lib/logger";

type CdpWalletBalanceInput = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number;
};

const cdpWalletBalanceSchema = createToolSchema(
  {
    address: stringProp("The Nex Wallet address to check balance for."),
    platform: enumProp("The blockchain platform.", ["evm", "solana"]),
    chainId: numberProp("Optional chain ID (e.g. 8453 for Base). Defaults to Base for EVM."),
  },
  ["address", "platform"],
);

export const cdpWalletBalanceTool = createTool<CdpWalletBalanceInput>({
  description:
    "Get the balance of a user's Nex Wallet including native currency and token holdings with USD values. Use this when the user asks about their wallet balance or holdings.",
  schema: cdpWalletBalanceSchema,
  execute: async (input, context) => {
    // Security: if userId is available, verify the address belongs to this user
    if (context?.userId) {
      try {
        const { getSupabaseAdminClient } = await import(
          "@/server/services/supabase/supabase-admin"
        );
        const supabase = getSupabaseAdminClient();
        const { count } = await supabase
          .from("wallet_accounts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", context.userId)
          .ilike("address", input.address);

        if (!count || count === 0) {
          throw new Error(
            "Wallet address does not belong to the authenticated user",
          );
        }
      } catch (err) {
        // Re-throw ownership errors; swallow infra errors with a warning
        if (
          err instanceof Error &&
          err.message.includes("does not belong")
        ) {
          throw err;
        }
        logger.warn(
          { err, address: input.address },
          "CDP balance ownership check failed — proceeding with caution",
        );
      }
    }

    const result = await fetchCdpBalances(input.address, {
      platform: input.platform,
      chainId: input.chainId,
    });

    return {
      address: result.address,
      platform: result.platform,
      chainId: result.chainId,
      native: result.native,
      tokens: result.tokens,
      totalUsdValue: result.totalUsdValue,
    };
  },
});
