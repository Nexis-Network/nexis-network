import { z } from "zod";
import type { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { createClient } from "@/server/services/supabase/server";
import { checkRateLimit, walletProvisionRateLimit } from "@/server/security/rate-limit";
import { provisionCrossmintWalletForUser } from "@/server/services/crossmint/wallets";

const RequestSchema = z.object({
  chainType: z.enum(["solana", "stellar"]),
});

function isCrossmintEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_ENABLE_CROSSMINT_WALLETS ??
    process.env.ENABLE_CROSSMINT_WALLETS ??
    "";
  return raw.trim().toLowerCase() === "true";
}

export async function POST(request: NextRequest) {
  if (!isCrossmintEnabled()) {
    return apiResponse.notFound("Crossmint wallets are not enabled.");
  }

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

  const rl = await checkRateLimit(user.id, walletProvisionRateLimit);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many wallet provision requests", 429);
  }

  let parsed: z.infer<typeof RequestSchema>;
  try {
    parsed = RequestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }
    return apiResponse.badRequest("Invalid request body");
  }

  try {
    const result = await provisionCrossmintWalletForUser({
      userId: user.id,
      email: user.email,
      chainType: parsed.chainType,
    });

    return apiResponse.success({
      walletId: result.walletId,
      chainType: result.chainType,
      address: result.address,
      provider: "crossmint",
      custody: "non-custodial",
      signerType: "email",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("crossmint_wallet_provision_failed", { userId: user.id, message });
    const status =
      message.includes("missing_crossmint_api_key") ? 503 : message.includes("already in progress") ? 409 : 400;
    return apiResponse.error("CROSSMINT_PROVISION_FAILED", message || "Failed to provision Crossmint wallet", status);
  }
}
