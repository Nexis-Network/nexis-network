import { createClient } from "@/server/services/supabase/server";
import { recordRewardIdentitySignal } from "@/server/services/rewards/reward-signal";
import { extractClientIP } from "@/lib/request-utils";

export async function recordAuthenticatedRewardIdentity(params: {
  request: Request;
  deviceId?: string | null;
}) {
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { authenticated: false as const };
  }

  await recordRewardIdentitySignal({
    userId: user.id,
    ipAddress: extractClientIP(params.request),
    deviceId: params.deviceId ?? null,
    metadata: {
      source: "api.auth.reward-identity",
    },
  });

  return { authenticated: true as const };
}
