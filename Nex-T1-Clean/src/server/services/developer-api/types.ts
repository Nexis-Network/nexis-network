import "server-only";

export type PublicDeveloperProductId =
  | "nex-t1"
  | "nex-t1-instant"
  | "nex-1-code";

export type DeveloperBillingPlanId =
  | "launch"
  | "build"
  | "scale"
  | "enterprise";

export type DeveloperToolCostClass =
  | { kind: "free" }
  | { kind: "fixed_usd"; usdPerCall: number }
  | { kind: "metered_runtime"; runtimeKind: "e2b" }
  | { kind: "external_quota_contract"; contractKey: string };

export type DeveloperToolCallUsage = {
  toolName: string;
  callCount?: number;
  runtimeMinutes?: number | null;
};

export type DeveloperApiBill = {
  billedCredits: number;
  productFloorCredits: number;
  includedCreditsBilled: number;
  overageCreditsBilled: number;
  providerTokenCostUsd: number;
  toolCostUsd: number;
  runtimeCostUsd: number;
  totalCostUsd: number;
  includedRevenueUsd: number;
  overageRevenueUsd: number;
  billedRevenueUsd: number;
  grossMarginUsd: number;
  toolBreakdown: Array<{
    toolName: string;
    kind: DeveloperToolCostClass["kind"] | "unknown";
    costUsd: number;
    runtimeMinutes: number;
  }>;
};

export type DeveloperBillingPlan = {
  id: DeveloperBillingPlanId;
  label: string;
  monthlyPriceUsd: number;
  includedCredits: number;
  requestsPerMinute: number;
  overagePricePerThousandCreditsUsd: number;
  notes?: string;
};

export type ProviderPricing = {
  provider: "openai" | "xai" | "anthropic";
  model: string;
  inputCostPer1kUsd: number;
  outputCostPer1kUsd: number;
  reasoningCostPer1kUsd?: number;
  cachedInputCostPer1kUsd?: number;
};

export type PublicDeveloperProduct = {
  id: PublicDeveloperProductId;
  label: string;
  summary: string;
  upstreamModel: string;
  provider: "openai" | "xai";
  promptProfileId: "balanced" | "research" | "builder";
  promptBaseline: string;
  toolBaseline: string[];
  minimumCredits: number;
  defaultMaxOutputTokens: number;
  defaultRuntimeMinutes: number;
  docs: {
    endpoint: string;
    aliasEndpoint: string;
  };
};

export type DeveloperApiRequest = {
  model: PublicDeveloperProductId;
  input: string;
  instructions?: string | null;
  maxOutputTokens?: number | null;
  temperature?: number | null;
  metadata?: Record<string, UntypedJson> | null;
  tools?: {
    enabled?: boolean;
    allow?: string[];
  } | null;
};

export type DeveloperApiKeyProjectRecord = {
  id: string;
  name: string;
  ownerType: "user" | "organization";
  ownerId: string;
  billingAccountId: string | null;
  hardCapUsd: number | null;
  softCapUsd: number | null;
  overageEnabled: boolean;
};

export type DeveloperApiBillingAccountRecord = {
  id: string;
  plan: DeveloperBillingPlanId;
  includedCredits: number | null;
  hardSpendCapUsd: number | null;
  softSpendCapUsd: number | null;
  overageEnabled: boolean;
};

export type DeveloperApiKeyLookup = {
  id: string;
  ownerType: "user" | "organization";
  ownerId: string;
  projectId: string | null;
  billingAccountId: string | null;
  name: string | null;
  tier: string;
  rateLimitRequests: number;
  rateLimitWindowSeconds: number;
  dailyQuota: number | null;
  monthlyQuota: number | null;
  allowedProducts: PublicDeveloperProductId[] | null;
  revokedAt: string | null;
  expiresAt: string | null;
  metadata: Record<string, UntypedJson> | null;
  project: DeveloperApiKeyProjectRecord | null;
  billingAccount: DeveloperApiBillingAccountRecord | null;
};

export type DeveloperProjectUsageSnapshot = {
  dailyCreditsUsed: number;
  dailySpendUsd: number;
  monthlyCreditsUsed: number;
  monthlySpendUsd: number;
  monthlyRequestCount: number;
};

export type DeveloperApiAuthContext = {
  apiKeyId: string;
  ownerType: "user" | "organization";
  ownerId: string;
  projectId: string;
  billingAccountId: string | null;
  allowedProducts: PublicDeveloperProductId[];
  rateLimit: {
    requests: number;
    windowSeconds: number;
  };
  tier: string;
  requestIp: string;
  quotas: {
    daily: number | null;
    monthly: number | null;
  };
  usageSnapshot: DeveloperProjectUsageSnapshot;
  project: DeveloperApiKeyProjectRecord;
  billingAccount: DeveloperApiBillingAccountRecord | null;
};

export type DeveloperApiAuthResult =
  | {
      ok: true;
      context: DeveloperApiAuthContext;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

export type DeveloperApiLogInsert = {
  requestId: string;
  apiKeyId: string;
  projectId: string;
  ownerType: "user" | "organization";
  ownerId: string;
  billingAccountId: string | null;
  product: PublicDeveloperProductId;
  upstreamModel: string;
  provider: string;
  requestKind: "responses" | "chat.completions";
  status: "succeeded" | "failed" | "rate_limited" | "rejected";
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedInputTokens: number;
  toolNames: string[];
  providerTokenCostUsd: number;
  toolCostUsd: number;
  runtimeCostUsd: number;
  totalCostUsd: number;
  billedCredits: number;
  responseLatencyMs: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};
