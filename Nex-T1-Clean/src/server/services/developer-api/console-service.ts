import "server-only";

import { getDeveloperBillingPlan } from "@/server/services/developer-api/plan-registry";

type JsonRow = Record<string, UntypedJson>;

/** Shape returned by a query that resolves to an array of rows. */
interface SupabaseListResult {
  data: JsonRow[] | null;
  error: { message: string } | null;
}

/** Shape returned by `.single()` / `.maybeSingle()` terminators. */
interface SupabaseSingleResult {
  data: JsonRow | null;
  error: { message: string } | null;
}

/** Chainable query-builder subset used by console-service. */
interface SupabaseQueryBuilder extends PromiseLike<SupabaseListResult> {
  select: (query: string) => SupabaseQueryBuilder;
  eq: (column: string, value: UntypedJson) => SupabaseQueryBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  single: () => PromiseLike<SupabaseSingleResult>;
  maybeSingle: () => PromiseLike<SupabaseSingleResult>;
}

export type DeveloperConsoleSupabaseClient = {
  from: (table: string) => {
    select: (query: string) => SupabaseQueryBuilder;
    insert: (payload: Record<string, UntypedJson>) => SupabaseQueryBuilder;
  };
};

function startOfDayKey(): string {
  const current = new Date();
  current.setUTCHours(0, 0, 0, 0);
  return current.toISOString().slice(0, 10);
}

function startOfMonthKey(): string {
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  return current.toISOString().slice(0, 10);
}

function safeNumber(value: UntypedJson): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listDeveloperProjectsForConsole(
  supabase: DeveloperConsoleSupabaseClient,
) {
  const { data, error } = await supabase
    .from("api_project")
    .select(
      "id,name,owner_type,owner_id,billing_account_id,hard_cap_usd,soft_cap_usd,overage_enabled,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((project: Record<string, UntypedJson>) => ({
    id: project.id,
    name: project.name,
    ownerType: project.owner_type,
    ownerId: project.owner_id,
    billingAccountId: project.billing_account_id,
    hardCapUsd: safeNumber(project.hard_cap_usd) || null,
    softCapUsd: safeNumber(project.soft_cap_usd) || null,
    overageEnabled: Boolean(project.overage_enabled ?? true),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));
}

export async function createDeveloperProjectForConsole(
  supabase: DeveloperConsoleSupabaseClient,
  input: {
    ownerType: "user" | "organization";
    ownerId: string;
    name: string;
    description?: string | null;
    hardCapUsd?: number | null;
    softCapUsd?: number | null;
    overageEnabled?: boolean;
  },
) {
  const { data, error } = await supabase
    .from("api_project")
    .insert({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      name: input.name,
      description: input.description ?? null,
      hard_cap_usd: input.hardCapUsd ?? null,
      soft_cap_usd: input.softCapUsd ?? null,
      overage_enabled: input.overageEnabled ?? true,
    })
    .select(
      "id,name,owner_type,owner_id,billing_account_id,hard_cap_usd,soft_cap_usd,overage_enabled,created_at,updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No data returned");
  }

  const row = data as JsonRow;

  return {
    id: row.id,
    name: row.name,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    billingAccountId: row.billing_account_id,
    hardCapUsd: safeNumber(row.hard_cap_usd) || null,
    softCapUsd: safeNumber(row.soft_cap_usd) || null,
    overageEnabled: Boolean(row.overage_enabled ?? true),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDeveloperConsoleUsage(
  supabase: DeveloperConsoleSupabaseClient,
  projectId?: string | null,
) {
  const monthKey = startOfMonthKey();
  const dayKey = startOfDayKey();

  const monthQuery = supabase
    .from("api_request_log_monthly_rollup")
    .select("project_id,total_requests,total_billed_credits,total_cost_usd")
    .eq("period_start", monthKey);
  const dayQuery = supabase
    .from("api_request_log_daily_rollup")
    .select("project_id,total_billed_credits,total_cost_usd")
    .eq("period_start", dayKey);

  if (projectId) {
    monthQuery.eq("project_id", projectId);
    dayQuery.eq("project_id", projectId);
  }

  const [{ data: monthly, error: monthlyError }, { data: daily, error: dailyError }] =
    await Promise.all([monthQuery, dayQuery]);

  if (monthlyError) {
    throw new Error(monthlyError.message);
  }
  if (dailyError) {
    throw new Error(dailyError.message);
  }

  const monthlyRows = (monthly ?? []) as Array<Record<string, UntypedJson>>;
  const dailyRows = (daily ?? []) as Array<Record<string, UntypedJson>>;

  return {
    monthly: {
      requests: monthlyRows.reduce(
        (total, row) => total + safeNumber(row.total_requests),
        0,
      ),
      billedCredits: monthlyRows.reduce(
        (total, row) => total + safeNumber(row.total_billed_credits),
        0,
      ),
      spendUsd: monthlyRows.reduce(
        (total, row) => total + safeNumber(row.total_cost_usd),
        0,
      ),
    },
    daily: {
      billedCredits: dailyRows.reduce(
        (total, row) => total + safeNumber(row.total_billed_credits),
        0,
      ),
      spendUsd: dailyRows.reduce(
        (total, row) => total + safeNumber(row.total_cost_usd),
        0,
      ),
    },
  };
}

export async function getDeveloperConsoleBilling(
  supabase: DeveloperConsoleSupabaseClient,
  projectId?: string | null,
) {
  const usage = await getDeveloperConsoleUsage(supabase, projectId);
  const projectQuery = supabase
    .from("api_project")
    .select("id,name,billing_account_id")
    .order("created_at", { ascending: false });

  if (projectId) {
    projectQuery.eq("id", projectId);
  }

  const { data: projects, error: projectError } = await projectQuery.limit(1);
  if (projectError) {
    throw new Error(projectError.message);
  }

  const projectRows = (projects ?? []) as JsonRow[];
  const activeProject: JsonRow | null = projectRows[0] ?? null;
  const billingAccountId = typeof activeProject?.billing_account_id === "string"
    ? activeProject.billing_account_id
    : null;

  const { data: rawBillingAccount, error: billingError } = billingAccountId
    ? await supabase
        .from("api_billing_account")
        .select(
          "id,plan,included_credits,overage_price_per_thousand_credits_usd,hard_spend_cap_usd,soft_spend_cap_usd,overage_enabled",
        )
        .eq("id", billingAccountId)
        .maybeSingle()
    : { data: null, error: null };

  const billingAccount = rawBillingAccount as JsonRow | null;

  if (billingError) {
    throw new Error(billingError.message);
  }

  const plan = getDeveloperBillingPlan(
    typeof billingAccount?.plan === "string" ? billingAccount.plan : null,
  );
  const includedCredits = safeNumber(billingAccount?.included_credits) || plan.includedCredits;

  return {
    projectId: typeof activeProject?.id === "string" ? activeProject.id : null,
    projectName: typeof activeProject?.name === "string" ? activeProject.name : null,
    plan,
    includedCredits,
    spendUsd: usage.monthly.spendUsd,
    billedCredits: usage.monthly.billedCredits,
    overageCredits: Math.max(usage.monthly.billedCredits - includedCredits, 0),
    hardSpendCapUsd: safeNumber(billingAccount?.hard_spend_cap_usd) || null,
    softSpendCapUsd: safeNumber(billingAccount?.soft_spend_cap_usd) || null,
    overageEnabled: Boolean(billingAccount?.overage_enabled ?? true),
  };
}

export async function listDeveloperConsoleRequestLogs(
  supabase: DeveloperConsoleSupabaseClient,
  options: { projectId?: string | null; limit?: number },
) {
  const query = supabase
    .from("api_request_log")
    .select(
      "id,request_id,project_id,product,upstream_model,provider,status,input_tokens,output_tokens,billed_credits,total_cost_usd,tool_names,response_latency_ms,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (options.projectId) {
    query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: Record<string, UntypedJson>) => ({
    id: row.id,
    requestId: row.request_id,
    projectId: row.project_id,
    product: row.product,
    upstreamModel: row.upstream_model,
    provider: row.provider,
    status: row.status,
    inputTokens: safeNumber(row.input_tokens),
    outputTokens: safeNumber(row.output_tokens),
    billedCredits: safeNumber(row.billed_credits),
    totalCostUsd: safeNumber(row.total_cost_usd),
    toolNames: Array.isArray(row.tool_names) ? row.tool_names : [],
    responseLatencyMs: safeNumber(row.response_latency_ms) || null,
    createdAt: row.created_at,
  }));
}
