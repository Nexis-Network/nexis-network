/**
 * AgentKit-backed Wallet Balance Tool
 *
 * Drop-in replacement for cdp-wallet-balance.ts.
 * Same tool ID, same schema. Routes through AgentKit's
 * get_wallet_details / get_balance actions with CDP fallback.
 */
import { createTool, createToolSchema, stringProp, enumProp, numberProp } from "../create-tool";
import { getAgentKitInstance } from "@/server/services/agentkit";
import { parseAgentKitResult, sanitizeToolError } from "@/server/services/agentkit/result-parser";
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
    // Security: verify address belongs to user
    if (context?.userId) {
      try {
        const { getSupabaseAdminClient } = await import(
          "@/server/services/supabase/supabase-admin"
        );
        const supabase = getSupabaseAdminClient();
        // Use eq() with normalized lowercase — ilike is vulnerable to
        // wildcard injection (%, _) and wrong for EVM checksummed addresses.
        const normalizedAddress = input.address.toLowerCase().replace(/[^a-f0-9x]/g, "");
        const { count } = await supabase
          .from("wallet_accounts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", context.userId)
          .eq("address", normalizedAddress);

        if (!count || count === 0) {
          throw new Error("Wallet address does not belong to the authenticated user");
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("does not belong")) {
          throw err;
        }
        logger.warn(
          { err, address: input.address },
          "CDP balance ownership check failed — proceeding with caution",
        );
      }
    }

    try {
      const instance = await getAgentKitInstance();
      if (!instance) {
        // Fallback to CDP direct
        const { fetchCdpBalances } = await import("@/server/services/cdp/balance-service");
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
          backend: "cdp-direct",
        };
      }

      // Route through AgentKit
      const actions = instance.getActions() as Array<{ name: string; invoke: (i: unknown, a: unknown) => Promise<string> }>;
      const balanceAction = actions.find((a) => a.name === "get_balance");

      if (!balanceAction) {
        logger.warn("agentkit_balance_action_not_found", { available: actions.map((a) => a.name) });
        const { fetchCdpBalances } = await import("@/server/services/cdp/balance-service");
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
          backend: "cdp-direct-fallback",
        };
      }

      const rawResult = await balanceAction.invoke(instance, { address: input.address });
      const parsed = parseAgentKitResult(rawResult, "get_balance");

      return {
        address: input.address,
        platform: input.platform,
        chainId: input.chainId,
        message: parsed.message,
        balance: parsed.data?.balance,
        success: parsed.success,
        backend: "agentkit",
      };
    } catch (error: unknown) {
      const rawErr = error instanceof Error ? error.message : "Unknown error fetching balance";
      logger.error("ak_wallet_balance_failed", { error: rawErr, address: input.address });
      return { error: sanitizeToolError(error), success: false };
    }
  },
});
