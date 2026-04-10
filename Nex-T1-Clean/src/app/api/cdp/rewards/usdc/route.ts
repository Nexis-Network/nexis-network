import "server-only";

import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsdcRewards } from "@/server/services/cdp/usdc-rewards";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { checkRateLimit, cdpBalanceRateLimit } from "@/server/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * CDP USDC Rewards API
 *
 * GET /api/cdp/rewards/usdc?address=0x...
 *
 * Returns USDC rewards information for a given wallet address including
 * current APY, total estimated earnings, eligible balance, and per-network
 * breakdown.
 *
 * Auth required: yes (rewards are user-specific data).
 */

const querySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
});

export async function GET(request: NextRequest) {
  await connection();
  // 1. Authenticate
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  // 2. Validate query params
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    address: searchParams.get("address"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      },
      { status: 400 },
    );
  }

  // 3. Rate limit (reuse CDP balance limiter)
  const rl = await checkRateLimit(session.user.id, cdpBalanceRateLimit);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rl.headers },
    );
  }

  // 4. Verify address ownership
  const ownsAddress = await verifyAddressOwnership(
    session.user.id,
    parsed.data.address,
  );
  if (!ownsAddress) {
    return NextResponse.json(
      { success: false, error: { message: "Address not linked to your account" } },
      { status: 403 },
    );
  }

  // 5. Fetch rewards data
  try {
    const rewards = await getUsdcRewards(parsed.data.address, session.user.id);

    return NextResponse.json({
      success: true,
      data: rewards,
    });
  } catch (err) {
    logger.error("usdc_rewards_api_error", {
      error: err instanceof Error ? err.message : String(err),
      address: parsed.data.address,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch USDC rewards" } },
      { status: 502 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function verifyAddressOwnership(
  userId: string,
  address: string,
): Promise<boolean> {
  try {
    const { createClient } = await import("@/server/services/supabase/server");
    const supabase = await createClient();
    if (!supabase) return false;

    const { count } = await supabase
      .from("wallet_accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .ilike("address", address);

    return (count ?? 0) > 0;
  } catch (err) {
    logger.warn("usdc_rewards_ownership_check_failed", {
      userId,
      address,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
