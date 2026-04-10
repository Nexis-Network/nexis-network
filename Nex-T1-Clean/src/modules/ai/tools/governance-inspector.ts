
import { createTool, createToolSchema, stringProp } from "./create-tool";
import { getAgentSecurityPolicy } from "@/server/actions/governance";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

const governanceInspectorSchema = createToolSchema(
  {
    userId: stringProp("Optional User ID to inspect (defaults to authenticated user)"),
  },
  []
);

export const governanceInspectorTool = createTool({
  description:
    "Inspect the security policy, spending limits, and remaining daily budget for the current agent/user.",
  schema: governanceInspectorSchema,
  execute: async ({ userId }: { userId?: string }) => {
    let targetUserId = userId;

    if (!targetUserId) {
        const supabase = await getSupabaseServerClient();
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) targetUserId = user.id;
        }
    }

    if (!targetUserId) {
        return { error: "No user context found. Cannot inspect governance." };
    }

    try {
        const policy = await getAgentSecurityPolicy(targetUserId);
        const remainingBudget = Math.max(0, policy.globalSpendingLimitUsd - policy.dailySpendAccumulatorUsd);

        return {
            policy,
            status: {
                remainingDailyBudgetUsd: remainingBudget,
                isLimitExceeded: remainingBudget <= 0,
                isStrictWhitelist: policy.whitelistedAddresses.length > 0
            }
        };
    } catch (error) {
        return { error: `Failed to fetch governance policy: ${error}` };
    }
  },
});
