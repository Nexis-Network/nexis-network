import { type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { checkRateLimit, walletBootstrapRateLimit } from "@/server/security/rate-limit";
import { triggerUserWalletBootstrap } from "@/server/services/wallets/bootstrap";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return apiResponse.serviceUnavailable("Service unavailable");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiResponse.unauthorized("Unauthorized");
  }

  const rl = await checkRateLimit(user.id, walletBootstrapRateLimit);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many wallet bootstrap requests", 429);
  }

  triggerUserWalletBootstrap({
    userId: user.id,
    email: user.email,
    source: "api.wallets.bootstrap",
  });

  return apiResponse.success({
    accepted: true,
  });
}
