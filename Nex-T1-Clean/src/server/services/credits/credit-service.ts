import { USAGE_CREDIT_LIMITS } from "@/lib/constants/billing-limits";
import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

export type CreditTier = "free" | "pro" | "trader" | "ultra" | "enterprise";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

const CREDIT_LIMITS: Record<CreditTier, number> = {
  free: USAGE_CREDIT_LIMITS.free,
  pro: USAGE_CREDIT_LIMITS.pro,
  trader: USAGE_CREDIT_LIMITS.trader,
  ultra: USAGE_CREDIT_LIMITS.ultra,
  enterprise: USAGE_CREDIT_LIMITS.enterprise,
};

type RpcClient = {
  rpc<T>(
    fn: string,
    params?: Record<string, UntypedJson>,
  ): Promise<{ data: T | null; error: { message: string; code?: string } | null }>;
};

type ConsumeFailureReason = "limit" | "service_unavailable";
type ConsumeSource = "rpc" | "fallback" | "profile" | "mixed";

type MonthlyConsumeResult = {
  ok: boolean;
  used: number;
  source: "rpc" | "fallback";
  failureReason?: ConsumeFailureReason;
};

type OverageConsumeResult = {
  ok: boolean;
  remaining: number;
  failureReason?: ConsumeFailureReason;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
};

const getRpcClient = (): RpcClient =>
  getSupabaseAdminClient() as unknown as RpcClient;

let hasWarnedAboutMissingOverageColumn = false;

const extractRow = <T>(data: T | T[] | null): T | null => {
  if (data == null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
};

const isMissingOverageCreditsColumnError = (
  error: SupabaseLikeError | null | undefined,
): boolean => {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") {
    return true;
  }

  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  return (
    message.includes("column") &&
    message.includes("credits") &&
    message.includes("user_profiles")
  );
};

const warnMissingOverageCreditsColumn = (
  userId: string,
  error: SupabaseLikeError | null | undefined,
) => {
  if (hasWarnedAboutMissingOverageColumn) {
    return;
  }

  hasWarnedAboutMissingOverageColumn = true;
  logger.warn("[credits] user_profiles.credits column missing; defaulting overage credits to zero", {
    userId,
    error,
  });
};

export type CreditBalance = {
  userId: string;
  plan: CreditTier;
  limit: number;
  used: number;
  monthlyRemaining: number;
  overageCredits: number;
  remaining: number;
  resetAt: Date;
};

export type ConsumeCreditsResult = CreditBalance & {
  ok: boolean;
  source: ConsumeSource;
  consumed: number;
  monthlyConsumed: number;
  overageConsumed: number;
  failureReason?: ConsumeFailureReason;
};

export type SettleCreditsResult = CreditBalance & {
  reservedCharge: number;
  finalCharge: number;
  refunded: number;
  additionalConsumed: number;
};

const getUtcBillingCycleReset = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
};

const getActiveBillingWindowStart = (resetAt: Date) =>
  new Date(
    Date.UTC(resetAt.getUTCFullYear(), resetAt.getUTCMonth() - 1, 1, 0, 0, 0, 0),
  );

const getActiveBillingWindowKey = (resetAt: Date) =>
  getActiveBillingWindowStart(resetAt).toISOString().slice(0, 10);

const normalizePlan = (value: string | null | undefined): CreditTier => {
  const normalized = (value ?? "").trim().toLowerCase();
  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);

  if (tokens.includes("enterprise")) {
    return "enterprise";
  }
  if (tokens.includes("ultra")) {
    return "ultra";
  }
  if (tokens.includes("trader")) {
    return "trader";
  }
  if (tokens.includes("pro")) {
    return "pro";
  }
  if (tokens.includes("free")) {
    return "free";
  }

  return "free";
};

const buildBalance = ({
  userId,
  plan,
  limit,
  used,
  overageCredits,
  resetAt,
}: {
  userId: string;
  plan: CreditTier;
  limit: number;
  used: number;
  overageCredits: number;
  resetAt: Date;
}): CreditBalance => {
  const monthlyRemaining = Math.max(limit - used, 0);
  const safeOverageCredits = Math.max(overageCredits, 0);
  return {
    userId,
    plan,
    limit,
    used,
    monthlyRemaining,
    overageCredits: safeOverageCredits,
    remaining: monthlyRemaining + safeOverageCredits,
    resetAt,
  };
};

const buildMockBalance = (userId: string): CreditBalance => {
  const resetAt = getUtcBillingCycleReset();
  return buildBalance({
    userId,
    plan: "free",
    limit: CREDIT_LIMITS.free,
    used: 0,
    overageCredits: 0,
    resetAt,
  });
};

const isDevMockUser = (userId: string) =>
  userId === MOCK_USER_ID && process.env.NODE_ENV === "development";

function buildConsumeResult(
  base: CreditBalance,
  ok: boolean,
  source: ConsumeSource,
  {
    consumed = 0,
    monthlyConsumed = 0,
    overageConsumed = 0,
    failureReason,
  }: {
    consumed?: number;
    monthlyConsumed?: number;
    overageConsumed?: number;
    failureReason?: ConsumeFailureReason;
  } = {},
): ConsumeCreditsResult {
  return {
    ...base,
    ok,
    source,
    consumed,
    monthlyConsumed,
    overageConsumed,
    ...(failureReason ? { failureReason } : {}),
  };
}

async function upsertProfilePlan(userId: string): Promise<CreditTier> {
  const readPlanFromProfileFallback = async (): Promise<CreditTier> => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("user_profiles")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error("[credits] direct user profile read failed", { error, userId });
      throw new Error("Failed to resolve user profile");
    }

    if (typeof data?.plan === "string" && data.plan.trim().length > 0) {
      return normalizePlan(data.plan);
    }

    const { data: created, error: upsertError } = await admin
      .from("user_profiles")
      .upsert({ user_id: userId, plan: "free" }, { onConflict: "user_id" })
      .select("plan")
      .maybeSingle();

    if (upsertError) {
      logger.error("[credits] direct user profile upsert failed", {
        error: upsertError,
        userId,
      });
      throw new Error("Failed to resolve user profile");
    }

    return normalizePlan(
      typeof created?.plan === "string" ? created.plan : "free",
    );
  };

  try {
    const rpc = getRpcClient();
    const { data, error } = await rpc.rpc<string>("ensure_user_profile", {
      p_user_id: userId,
    });

    if (!error) {
      return normalizePlan(data ?? "free");
    }

    logger.warn("[credits] ensure_user_profile failed, using profile fallback", {
      error,
      userId,
    });
  } catch (error) {
    logger.warn("[credits] ensure_user_profile threw, using profile fallback", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
  }

  return readPlanFromProfileFallback();
}

async function fetchUsage(userId: string, resetAt: Date): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_credit_usage")
    .select("used")
    .eq("user_id", userId)
    .eq("window_start", getActiveBillingWindowKey(resetAt))
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    logger.error("[credits] fetchUsage failed", { error, userId });
    throw new Error("Failed to fetch credit usage");
  }

  return typeof data?.used === "number" ? data.used : 0;
}

async function fetchOverageCredits(userId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    if (isMissingOverageCreditsColumnError(error)) {
      warnMissingOverageCreditsColumn(userId, error);
      return 0;
    }

    logger.error("[credits] fetchOverageCredits failed", { error, userId });
    throw new Error("Failed to fetch overage credits");
  }

  return typeof data?.credits === "number" ? data.credits : 0;
}

async function consumeCreditsFromUsageFallback(args: {
  userId: string;
  amount: number;
  limit: number;
  resetAt: Date;
}): Promise<MonthlyConsumeResult> {
  const { userId, amount, limit, resetAt } = args;
  const admin = getSupabaseAdminClient();
  const windowStart = getActiveBillingWindowKey(resetAt);
  const updatedAt = new Date().toISOString();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await admin
      .from("user_credit_usage")
      .select("used")
      .eq("user_id", userId)
      .eq("window_start", windowStart)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error("[credits] fallback monthly read failed", {
        error,
        userId,
        attempt,
      });
      return {
        ok: false,
        used: 0,
        source: "fallback",
        failureReason: "service_unavailable",
      };
    }

    const currentUsed = typeof data?.used === "number" ? data.used : 0;
    const nextUsed = currentUsed + amount;

    if (nextUsed > limit) {
      return {
        ok: false,
        used: currentUsed,
        source: "fallback",
        failureReason: "limit",
      };
    }

    if (data) {
      const { data: updated, error: updateError } = await admin
        .from("user_credit_usage")
        .update({ used: nextUsed, updated_at: updatedAt })
        .eq("user_id", userId)
        .eq("window_start", windowStart)
        .eq("used", currentUsed)
        .select("used")
        .maybeSingle();

      if (!updateError && typeof updated?.used === "number") {
        return { ok: true, used: updated.used, source: "fallback" };
      }

      if (updateError && updateError.code !== "PGRST116") {
        logger.error("[credits] fallback monthly update failed", {
          error: updateError,
          userId,
          attempt,
        });
        return {
          ok: false,
          used: currentUsed,
          source: "fallback",
          failureReason: "service_unavailable",
        };
      }

      continue;
    }

    const { data: inserted, error: insertError } = await admin
      .from("user_credit_usage")
      .upsert(
        {
          user_id: userId,
          window_start: windowStart,
          used: amount,
          updated_at: updatedAt,
        },
        { onConflict: "user_id,window_start" },
      )
      .select("used")
      .maybeSingle();

    if (!insertError && typeof inserted?.used === "number") {
      return { ok: true, used: inserted.used, source: "fallback" };
    }

    if (insertError && insertError.code !== "23505") {
      logger.error("[credits] fallback monthly insert failed", {
        error: insertError,
        userId,
        attempt,
      });
      return {
        ok: false,
        used: currentUsed,
        source: "fallback",
        failureReason: "service_unavailable",
      };
    }
  }

  return {
    ok: false,
    used: 0,
    source: "fallback",
    failureReason: "service_unavailable",
  };
}

async function consumeMonthlyCredits(args: {
  userId: string;
  amount: number;
  limit: number;
  resetAt: Date;
}): Promise<MonthlyConsumeResult> {
  const { userId, amount, limit, resetAt } = args;

  if (amount <= 0) {
    return { ok: true, used: await fetchUsage(userId, resetAt), source: "rpc" };
  }

  try {
    const rpc = getRpcClient();
    const { data: rawData, error } = await rpc.rpc<{ ok: boolean; used: number }>(
      "consume_credits",
      { p_user_id: userId, p_amount: amount, p_limit: limit },
    );

    if (error) {
      logger.error("[credits] consume_credits RPC error, using fallback", {
        error,
        userId,
        amount,
        limit,
      });
      return consumeCreditsFromUsageFallback({ userId, amount, limit, resetAt });
    }

    const row = extractRow(rawData);
    const used = typeof row?.used === "number" ? row.used : 0;
    const ok = Boolean(row?.ok);

    return {
      ok,
      used,
      source: "rpc",
      ...(ok ? {} : { failureReason: "limit" as const }),
    };
  } catch (error) {
    logger.error("[credits] consume_credits RPC exception, using fallback", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      amount,
      limit,
    });
    return consumeCreditsFromUsageFallback({ userId, amount, limit, resetAt });
  }
}

async function consumeOverageCredits(
  userId: string,
  amount: number,
): Promise<OverageConsumeResult> {
  if (amount <= 0) {
    return {
      ok: true,
      remaining: await fetchOverageCredits(userId),
    };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    if (isMissingOverageCreditsColumnError(error)) {
      warnMissingOverageCreditsColumn(userId, error);
      return { ok: false, remaining: 0, failureReason: "limit" };
    }

    logger.error("[credits] consumeOverageCredits read failed", { error, userId });
    return { ok: false, remaining: 0, failureReason: "service_unavailable" };
  }

  const currentCredits = typeof data?.credits === "number" ? data.credits : 0;
  if (currentCredits < amount) {
    return { ok: false, remaining: currentCredits, failureReason: "limit" };
  }

  const { data: updated, error: updateError } = await admin
    .from("user_profiles")
    .update({ credits: currentCredits - amount })
    .eq("user_id", userId)
    .gte("credits", amount)
    .select("credits")
    .maybeSingle();

  if (updateError) {
    if (isMissingOverageCreditsColumnError(updateError)) {
      warnMissingOverageCreditsColumn(userId, updateError);
      return { ok: false, remaining: 0, failureReason: "limit" };
    }

    logger.error("[credits] consumeOverageCredits update failed", {
      error: updateError,
      userId,
      amount,
    });
    return {
      ok: false,
      remaining: currentCredits,
      failureReason:
        updateError.code === "PGRST116" ? "limit" : "service_unavailable",
    };
  }

  const remaining =
    typeof updated?.credits === "number"
      ? updated.credits
      : Math.max(currentCredits - amount, 0);

  return { ok: true, remaining };
}

async function addOverageCredits(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    return fetchOverageCredits(userId);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    if (isMissingOverageCreditsColumnError(error)) {
      warnMissingOverageCreditsColumn(userId, error);
      return 0;
    }

    logger.error("[credits] addOverageCredits read failed", { error, userId });
    throw new Error("Failed to read overage credits");
  }

  const currentCredits = typeof data?.credits === "number" ? data.credits : 0;
  const nextCredits = currentCredits + amount;

  const { data: updated, error: upsertError } = await admin
    .from("user_profiles")
    .upsert({ user_id: userId, credits: nextCredits }, { onConflict: "user_id" })
    .select("credits")
    .maybeSingle();

  if (upsertError) {
    if (isMissingOverageCreditsColumnError(upsertError)) {
      warnMissingOverageCreditsColumn(userId, upsertError);
      return 0;
    }

    logger.error("[credits] addOverageCredits upsert failed", {
      error: upsertError,
      userId,
      amount,
    });
    throw new Error("Failed to restore overage credits");
  }

  return typeof updated?.credits === "number" ? updated.credits : nextCredits;
}

async function refundMonthlyCredits(
  userId: string,
  amount: number,
  resetAt: Date,
): Promise<number> {
  if (amount <= 0) {
    return fetchUsage(userId, resetAt);
  }

  try {
    const rpc = getRpcClient();
    const { data, error } = await rpc.rpc<number>("refund_credits", {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) {
      logger.error("[credits] refund_credits RPC error", { error, userId, amount });
      throw new Error("refund_credits_failed");
    }

    return typeof data === "number" ? data : fetchUsage(userId, resetAt);
  } catch (error) {
    logger.error("[credits] refundMonthlyCredits failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      amount,
    });
    throw error;
  }
}

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const resetAt = getUtcBillingCycleReset();

  if (!userId) {
    logger.warn("[credits] getCreditBalance called without userId");
    return buildBalance({
      userId: "anonymous",
      plan: "free",
      limit: 0,
      used: 0,
      overageCredits: 0,
      resetAt,
    });
  }

  if (isDevMockUser(userId)) {
    return buildMockBalance(userId);
  }

  try {
    const plan = await upsertProfilePlan(userId);
    const [used, overageCredits] = await Promise.all([
      fetchUsage(userId, resetAt),
      fetchOverageCredits(userId),
    ]);

    return buildBalance({
      userId,
      plan,
      limit: CREDIT_LIMITS[plan],
      used,
      overageCredits,
      resetAt,
    });
  } catch (error) {
    logger.error("[credits] getCreditBalance failed; failing closed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return buildBalance({
      userId,
      plan: "free",
      limit: 0,
      used: 0,
      overageCredits: 0,
      resetAt,
    });
  }
}

export async function consumeCredits(
  userId: string,
  amount: number,
): Promise<ConsumeCreditsResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be positive");
  }

  if (!userId) {
    return buildConsumeResult(
      buildBalance({
        userId: "anonymous",
        plan: "free",
        limit: 0,
        used: 0,
        overageCredits: 0,
        resetAt: getUtcBillingCycleReset(),
      }),
      false,
      "profile",
      { failureReason: "service_unavailable" },
    );
  }

  if (isDevMockUser(userId)) {
    return buildConsumeResult(buildMockBalance(userId), true, "fallback");
  }

  const resetAt = getUtcBillingCycleReset();

  try {
    const plan = await upsertProfilePlan(userId);
    const limit = CREDIT_LIMITS[plan];
    const [used, overageCredits] = await Promise.all([
      fetchUsage(userId, resetAt),
      fetchOverageCredits(userId),
    ]);

    const balanceBefore = buildBalance({
      userId,
      plan,
      limit,
      used,
      overageCredits,
      resetAt,
    });

    if (balanceBefore.remaining < amount) {
      return buildConsumeResult(balanceBefore, false, "mixed", {
        failureReason: "limit",
      });
    }

    const monthlyConsumed = Math.min(amount, balanceBefore.monthlyRemaining);
    const overageConsumed = amount - monthlyConsumed;

    let finalUsed = used;
    let finalOverageCredits = overageCredits;
    let monthlySource: "rpc" | "fallback" = "rpc";

    if (monthlyConsumed > 0) {
      const monthlyResult = await consumeMonthlyCredits({
        userId,
        amount: monthlyConsumed,
        limit,
        resetAt,
      });

      if (!monthlyResult.ok) {
        return buildConsumeResult(balanceBefore, false, monthlyResult.source, {
          failureReason: monthlyResult.failureReason ?? "service_unavailable",
        });
      }

      finalUsed = monthlyResult.used;
      monthlySource = monthlyResult.source;
    }

    if (overageConsumed > 0) {
      const overageResult = await consumeOverageCredits(userId, overageConsumed);

      if (!overageResult.ok) {
        if (monthlyConsumed > 0) {
          try {
            await refundMonthlyCredits(userId, monthlyConsumed, resetAt);
          } catch (refundError) {
            logger.error("[credits] failed to compensate monthly credits", {
              error:
                refundError instanceof Error
                  ? refundError.message
                  : String(refundError),
              userId,
              monthlyConsumed,
            });
          }
        }

        const balanceAfterFailure = await getCreditBalance(userId);
        return buildConsumeResult(balanceAfterFailure, false, "mixed", {
          failureReason: overageResult.failureReason ?? "service_unavailable",
        });
      }

      finalOverageCredits = overageResult.remaining;
    }

    const finalBalance = buildBalance({
      userId,
      plan,
      limit,
      used: finalUsed,
      overageCredits: finalOverageCredits,
      resetAt,
    });

    const source: ConsumeSource =
      monthlyConsumed > 0 && overageConsumed > 0
        ? "mixed"
        : overageConsumed > 0
          ? "profile"
          : monthlySource;

    return buildConsumeResult(finalBalance, true, source, {
      consumed: amount,
      monthlyConsumed,
      overageConsumed,
    });
  } catch (error) {
    logger.error("[credits] consumeCredits failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      amount,
    });

    return buildConsumeResult(
      buildBalance({
        userId,
        plan: "free",
        limit: 0,
        used: 0,
        overageCredits: 0,
        resetAt,
      }),
      false,
      "fallback",
      { failureReason: "service_unavailable" },
    );
  }
}

export async function refundCredits(
  userId: string,
  amount: number,
): Promise<CreditBalance> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return getCreditBalance(userId);
  }

  if (isDevMockUser(userId)) {
    return buildMockBalance(userId);
  }

  const resetAt = getUtcBillingCycleReset();
  const balanceBefore = await getCreditBalance(userId);
  const monthlyRefund = Math.min(amount, balanceBefore.used);
  const overageRefund = amount - monthlyRefund;

  try {
    if (monthlyRefund > 0) {
      await refundMonthlyCredits(userId, monthlyRefund, resetAt);
    }

    if (overageRefund > 0) {
      await addOverageCredits(userId, overageRefund);
    }
  } catch (error) {
    logger.error("[credits] refundCredits failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      amount,
    });
  }

  return getCreditBalance(userId);
}

export async function settleCredits(
  userId: string,
  reservation: ConsumeCreditsResult | null,
  finalAmount: number,
): Promise<SettleCreditsResult> {
  const finalCharge =
    Number.isFinite(finalAmount) && finalAmount > 0 ? Math.ceil(finalAmount) : 0;
  const reservedCharge = reservation?.consumed ?? 0;

  if (!userId || !reservation || !reservation.ok) {
    const balance = await getCreditBalance(userId);
    return {
      ...balance,
      reservedCharge,
      finalCharge,
      refunded: 0,
      additionalConsumed: 0,
    };
  }

  if (isDevMockUser(userId)) {
    return {
      ...buildMockBalance(userId),
      reservedCharge,
      finalCharge,
      refunded: Math.max(reservedCharge - finalCharge, 0),
      additionalConsumed: Math.max(finalCharge - reservedCharge, 0),
    };
  }

  const resetAt = getUtcBillingCycleReset();

  if (finalCharge === reservedCharge) {
    return {
      ...reservation,
      reservedCharge,
      finalCharge,
      refunded: 0,
      additionalConsumed: 0,
    };
  }

  if (finalCharge > reservedCharge) {
    const additionalAmount = finalCharge - reservedCharge;
    const additionalResult = await consumeCredits(userId, additionalAmount);
    const balance = additionalResult.ok
      ? additionalResult
      : await getCreditBalance(userId);

    if (!additionalResult.ok) {
      logger.warn("[credits] failed to settle additional credits", {
        userId,
        reservedCharge,
        finalCharge,
        additionalAmount,
        failureReason: additionalResult.failureReason,
      });
    }

    return {
      ...balance,
      reservedCharge,
      finalCharge,
      refunded: 0,
      additionalConsumed: additionalResult.ok ? additionalAmount : 0,
    };
  }

  const refundAmount = reservedCharge - finalCharge;
  const overageRefund = Math.min(refundAmount, reservation.overageConsumed);
  const monthlyRefund = Math.min(
    refundAmount - overageRefund,
    reservation.monthlyConsumed,
  );

  try {
    if (overageRefund > 0) {
      await addOverageCredits(userId, overageRefund);
    }

    if (monthlyRefund > 0) {
      await refundMonthlyCredits(userId, monthlyRefund, resetAt);
    }
  } catch (error) {
    logger.error("[credits] failed to refund reserved credits during settlement", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      refundAmount,
    });
  }

  const balance = await getCreditBalance(userId);
  return {
    ...balance,
    reservedCharge,
    finalCharge,
    refunded: refundAmount,
    additionalConsumed: 0,
  };
}
