import "server-only";

import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import type {
  DeveloperBillingPlanId,
  DeveloperApiKeyLookup,
  DeveloperApiLogInsert,
  DeveloperProjectUsageSnapshot,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

function startOfCurrentDay(): string {
  const current = new Date();
  current.setUTCHours(0, 0, 0, 0);
  return current.toISOString().slice(0, 10);
}

function startOfCurrentMonth(): string {
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  return current.toISOString().slice(0, 10);
}

export async function findApiKeyByHashedSecret(
  hashedSecret: string,
): Promise<DeveloperApiKeyLookup | null> {
  const supabase = createServiceRoleClient();
  const { data: apiKey, error } = await supabase
    .from("api_key")
    .select(
      "id,owner_type,owner_id,name,tier,project_id,last_used_at,expires_at,revoked_at,metadata,rate_limit_requests,rate_limit_window_seconds,daily_quota,monthly_quota,allowed_products",
    )
    .eq("hashed_secret", hashedSecret)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!apiKey) {
    return null;
  }

  const projectId = (apiKey.project_id as string | null) ?? null;
  const allowedProducts = Array.isArray(apiKey.allowed_products)
    ? (apiKey.allowed_products as PublicDeveloperProductId[])
    : null;

  if (!projectId) {
    return {
      id: apiKey.id as string,
      ownerType: apiKey.owner_type as "user" | "organization",
      ownerId: apiKey.owner_id as string,
      projectId: null,
      billingAccountId: null,
      name: (apiKey.name as string | null) ?? null,
      tier: (apiKey.tier as string) ?? "free",
      rateLimitRequests: Number(apiKey.rate_limit_requests ?? 60),
      rateLimitWindowSeconds: Number(apiKey.rate_limit_window_seconds ?? 60),
      dailyQuota: apiKey.daily_quota as number | null,
      monthlyQuota: apiKey.monthly_quota as number | null,
      allowedProducts,
      revokedAt: (apiKey.revoked_at as string | null) ?? null,
      expiresAt: (apiKey.expires_at as string | null) ?? null,
      metadata: (apiKey.metadata as Record<string, UntypedJson> | null) ?? null,
      project: null,
      billingAccount: null,
    };
  }

  const { data: project, error: projectError } = await supabase
    .from("api_project")
    .select(
      "id,name,owner_type,owner_id,billing_account_id,hard_cap_usd,soft_cap_usd,overage_enabled",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }

  const billingAccountId = (project?.billing_account_id as string | null) ?? null;
  const { data: billingAccount, error: billingError } = billingAccountId
    ? await supabase
        .from("api_billing_account")
        .select(
          "id,plan,included_credits,hard_spend_cap_usd,soft_spend_cap_usd,overage_enabled",
        )
        .eq("id", billingAccountId)
        .maybeSingle()
    : { data: null, error: null };

  if (billingError) {
    throw new Error(billingError.message);
  }

  return {
    id: apiKey.id as string,
    ownerType: apiKey.owner_type as "user" | "organization",
    ownerId: apiKey.owner_id as string,
    projectId,
    billingAccountId,
    name: (apiKey.name as string | null) ?? null,
    tier: (apiKey.tier as string) ?? "free",
    rateLimitRequests: Number(apiKey.rate_limit_requests ?? 60),
    rateLimitWindowSeconds: Number(apiKey.rate_limit_window_seconds ?? 60),
    dailyQuota: apiKey.daily_quota as number | null,
    monthlyQuota: apiKey.monthly_quota as number | null,
    allowedProducts,
    revokedAt: (apiKey.revoked_at as string | null) ?? null,
    expiresAt: (apiKey.expires_at as string | null) ?? null,
    metadata: (apiKey.metadata as Record<string, UntypedJson> | null) ?? null,
    project: project
      ? {
          id: project.id as string,
          name: project.name as string,
          ownerType: project.owner_type as "user" | "organization",
          ownerId: project.owner_id as string,
          billingAccountId,
          hardCapUsd: Number(project.hard_cap_usd ?? 0) || null,
          softCapUsd: Number(project.soft_cap_usd ?? 0) || null,
          overageEnabled: Boolean(project.overage_enabled ?? true),
        }
      : null,
    billingAccount: billingAccount
      ? {
          id: billingAccount.id as string,
          plan: billingAccount.plan as DeveloperBillingPlanId,
          includedCredits: billingAccount.included_credits as number | null,
          hardSpendCapUsd: Number(billingAccount.hard_spend_cap_usd ?? 0) || null,
          softSpendCapUsd: Number(billingAccount.soft_spend_cap_usd ?? 0) || null,
          overageEnabled: Boolean(billingAccount.overage_enabled ?? true),
        }
      : null,
  };
}

export async function getProjectUsageSnapshot(
  projectId: string,
): Promise<DeveloperProjectUsageSnapshot> {
  const supabase = createServiceRoleClient();
  const monthKey = startOfCurrentMonth();
  const dayKey = startOfCurrentDay();

  const [{ data: monthly }, { data: daily }] = await Promise.all([
    supabase
      .from("api_request_log_monthly_rollup")
      .select("total_requests,total_billed_credits,total_cost_usd")
      .eq("project_id", projectId)
      .eq("period_start", monthKey)
      .maybeSingle(),
    supabase
      .from("api_request_log_daily_rollup")
      .select("total_billed_credits,total_cost_usd")
      .eq("project_id", projectId)
      .eq("period_start", dayKey)
      .maybeSingle(),
  ]);

  return {
    dailyCreditsUsed: Number(daily?.total_billed_credits ?? 0),
    dailySpendUsd: Number(daily?.total_cost_usd ?? 0),
    monthlyCreditsUsed: Number(monthly?.total_billed_credits ?? 0),
    monthlySpendUsd: Number(monthly?.total_cost_usd ?? 0),
    monthlyRequestCount: Number(monthly?.total_requests ?? 0),
  };
}

export async function touchApiKeyUsage(apiKeyId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from("api_key")
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq("id", apiKeyId);
}

export async function insertApiRequestLog(
  payload: DeveloperApiLogInsert,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("api_request_log").insert({
    request_id: payload.requestId,
    api_key_id: payload.apiKeyId,
    project_id: payload.projectId,
    owner_type: payload.ownerType,
    owner_id: payload.ownerId,
    billing_account_id: payload.billingAccountId,
    product: payload.product,
    upstream_model: payload.upstreamModel,
    provider: payload.provider,
    request_kind: payload.requestKind,
    status: payload.status,
    input_tokens: payload.inputTokens,
    output_tokens: payload.outputTokens,
    reasoning_tokens: payload.reasoningTokens,
    cached_input_tokens: payload.cachedInputTokens,
    tool_names: payload.toolNames,
    provider_token_cost_usd: payload.providerTokenCostUsd,
    tool_cost_usd: payload.toolCostUsd,
    runtime_cost_usd: payload.runtimeCostUsd,
    total_cost_usd: payload.totalCostUsd,
    billed_credits: payload.billedCredits,
    response_latency_ms: payload.responseLatencyMs,
    error_code: payload.errorCode ?? null,
    error_message: payload.errorMessage ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}
