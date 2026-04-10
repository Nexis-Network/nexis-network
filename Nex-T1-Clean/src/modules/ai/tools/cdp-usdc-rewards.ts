import { createTool, createToolSchema, stringProp } from "./create-tool";
import { getUsdcRewards } from "@/server/services/cdp/usdc-rewards";
import { logger } from "@/lib/logger";

type CdpUsdcRewardsInput = {
  address: string;
};

const cdpUsdcRewardsSchema = createToolSchema(
  {
    address: stringProp(
      "The EVM wallet address to check USDC rewards for (0x-prefixed, 40 hex chars).",
    ),
  },
  ["address"],
);

/**
 * AI tool for fetching USDC rewards information for a Nex Wallet address.
 *
 * Read-only operation, no HITL approval required.
 * Returns current APY, total estimated earnings, eligible balance,
 * and per-network breakdown.
 */
export const cdpUsdcRewardsTool = createTool<CdpUsdcRewardsInput>({
  description:
    "Get USDC rewards information for a Nex Wallet address. Shows current APY, total earned, and eligible balance. Use when the user asks about USDC yield, earnings, or rewards.",
  schema: cdpUsdcRewardsSchema,
  execute: async (input, context) => {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(input.address)) {
      throw new Error(`Invalid EVM address: ${input.address}`);
    }

    // Security: verify address ownership if userId is available
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
          "USDC rewards ownership check failed — proceeding with caution",
        );
      }
    }

    const userId = context?.userId ?? "ai-tool";
    const rewards = await getUsdcRewards(input.address, userId);

    return {
      address: input.address,
      currentApy: rewards.currentApy,
      totalEarned: rewards.totalEarned,
      balance: rewards.balance,
      lastAccrual: rewards.lastAccrual,
      networks: rewards.networks,
    };
  },
});
