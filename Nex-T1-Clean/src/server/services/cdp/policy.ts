/**
 * CDP V2 Policy Engine Service
 *
 * Server-only module providing policy CRUD operations for CDP agent wallets.
 * Policies restrict what agent wallets can do via declarative JSON rules
 * evaluated top-down (first matching rule wins).
 *
 * The CDP SDK does not expose direct policy methods, so this module
 * communicates with the CDP REST API directly using the project's
 * API key credentials (CDP_API_KEY_ID, CDP_API_KEY_SECRET).
 *
 * CDP Policy API endpoints:
 * - POST   /v1/policies          — Create a new policy
 * - GET    /v1/policies/{id}     — Get a policy by ID
 * - GET    /v1/policies          — List policies (with optional filters)
 * - PUT    /v1/policies/{id}     — Update a policy
 * - DELETE /v1/policies/{id}     — Delete a policy
 *
 * Authentication uses HTTP Basic Auth with CDP_API_KEY_ID:CDP_API_KEY_SECRET.
 */
import "server-only";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyCriteria =
  | { type: "evmAddress"; addresses: string[]; operator: "in" | "not_in" }
  | { type: "ethValue"; gte?: string; lte?: string }
  | { type: "evmNetwork"; networks: string[] }
  | { type: "netUSDChange"; gte?: number; lte?: number };

export type PolicyRule = {
  action: "accept" | "reject";
  criteria: PolicyCriteria[];
};

export type CdpPolicy = {
  id: string;
  name: string;
  description?: string;
  scope: "project" | "account";
  accountAddress?: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePolicyParams = {
  name: string;
  description?: string;
  scope: "project" | "account";
  accountAddress?: string;
  rules: PolicyRule[];
};

// ---------------------------------------------------------------------------
// Validation Schemas (used by API routes)
// ---------------------------------------------------------------------------

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const policyCriteriaSchema: z.ZodType<PolicyCriteria> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("evmAddress"),
    addresses: z.array(z.string().regex(evmAddressRegex, "Invalid EVM address")),
    operator: z.enum(["in", "not_in"]),
  }),
  z.object({
    type: z.literal("ethValue"),
    gte: z.string().regex(/^\d+$/, "Must be a wei string").optional(),
    lte: z.string().regex(/^\d+$/, "Must be a wei string").optional(),
  }),
  z.object({
    type: z.literal("evmNetwork"),
    networks: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal("netUSDChange"),
    gte: z.number().optional(),
    lte: z.number().optional(),
  }),
]);

const policyRuleSchema = z.object({
  action: z.enum(["accept", "reject"]),
  criteria: z.array(policyCriteriaSchema),
});

export const createPolicySchema = z.object({
  name: z.string().min(1, "Policy name is required").max(128),
  description: z.string().max(512).optional(),
  scope: z.enum(["project", "account"]),
  accountAddress: z
    .string()
    .regex(evmAddressRegex, "Invalid EVM address")
    .optional(),
  rules: z.array(policyRuleSchema).min(1, "At least one rule is required"),
});

export const updatePolicySchema = createPolicySchema.partial();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_API_BASE = "https://api.developer.coinbase.com/platform/v1";
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Internal HTTP Client
// ---------------------------------------------------------------------------

/**
 * Build Basic Auth header from CDP API key credentials.
 */
function getAuthHeader(): string {
  const keyId = process.env.CDP_API_KEY_ID?.trim();
  const keySecret = process.env.CDP_API_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error(
      "CDP Policy API not configured. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
    );
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

type CdpApiOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
};

/**
 * Make an authenticated request to the CDP Platform REST API.
 */
async function cdpFetch<T>(options: CdpApiOptions): Promise<T> {
  const url = new URL(`${CDP_API_BASE}${options.path}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      logger.error("cdp_policy_api_error", {
        status: response.status,
        path: options.path,
        method: options.method,
        body: errorBody.slice(0, 500),
      });
      throw new Error(
        `CDP Policy API returned ${response.status}: ${errorBody.slice(0, 200)}`,
      );
    }

    // DELETE returns 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `CDP Policy API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Response normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw CDP API policy response into our CdpPolicy type.
 * The CDP API returns snake_case fields; we map to camelCase.
 */
function normalizePolicy(raw: Record<string, unknown>): CdpPolicy {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: raw.description ? String(raw.description) : undefined,
    scope: (raw.scope as CdpPolicy["scope"]) ?? "project",
    accountAddress: raw.account_address
      ? String(raw.account_address)
      : undefined,
    rules: Array.isArray(raw.rules) ? (raw.rules as PolicyRule[]) : [],
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Ownership Verification
// ---------------------------------------------------------------------------

/**
 * Verify that an account-scoped policy belongs to the authenticated user
 * by checking that its `accountAddress` is owned by the user in
 * `wallet_accounts`. For project-scoped policies, only the CDP project
 * admin can manage them — this function allows access.
 *
 * Accepts the already-fetched policy object to avoid an extra CDP API call.
 */
async function verifyPolicyOwnership(
  policy: CdpPolicy,
  userId: string,
): Promise<void> {
  // Project-scoped policies are managed at the project level — allow admin access
  if (policy.scope === "project") {
    return;
  }

  // For account-scoped policies, verify the account address belongs to the user
  if (!policy.accountAddress) {
    throw new Error("Account-scoped policy has no account address. Cannot verify ownership.");
  }

  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("wallet_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("address", policy.accountAddress);

  if (error) {
    logger.error("cdp_policy_ownership_check_failed", {
      userId,
      policyId: policy.id,
      accountAddress: policy.accountAddress,
      error: error.message,
    });
    throw new Error("Failed to verify policy ownership.");
  }

  if ((count ?? 0) === 0) {
    logger.warn("cdp_policy_ownership_denied", {
      userId,
      policyId: policy.id,
      accountAddress: policy.accountAddress,
    });
    throw new Error("Policy does not belong to the authenticated user.");
  }
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new spending policy.
 *
 * @param params - Policy creation parameters
 * @param userId - Authenticated user ID (for audit logging)
 * @returns The created policy
 */
export async function createPolicy(
  params: CreatePolicyParams,
  userId: string,
): Promise<CdpPolicy> {
  const validated = createPolicySchema.parse(params);

  logger.info("cdp_policy_create_started", {
    userId,
    name: validated.name,
    scope: validated.scope,
    ruleCount: validated.rules.length,
    accountAddress: validated.accountAddress ?? null,
  });

  const raw = await cdpFetch<Record<string, unknown>>({
    method: "POST",
    path: "/policies",
    body: {
      name: validated.name,
      description: validated.description,
      scope: validated.scope,
      account_address: validated.accountAddress,
      rules: validated.rules,
    },
  });

  const policy = normalizePolicy(raw);

  logger.info("cdp_policy_created", {
    userId,
    policyId: policy.id,
    name: policy.name,
    scope: policy.scope,
  });

  return policy;
}

/**
 * Get a policy by ID.
 *
 * @param policyId - The policy ID
 * @param userId - Authenticated user ID (for audit logging)
 * @returns The policy
 */
export async function getPolicy(
  policyId: string,
  userId: string,
): Promise<CdpPolicy> {
  logger.info("cdp_policy_get", { userId, policyId });

  const raw = await cdpFetch<Record<string, unknown>>({
    method: "GET",
    path: `/policies/${encodeURIComponent(policyId)}`,
  });

  const policy = normalizePolicy(raw);

  // Verify the policy belongs to the requesting user
  await verifyPolicyOwnership(policy, userId);

  return policy;
}

/**
 * List policies, optionally filtered by account address.
 *
 * @param userId - Authenticated user ID (for audit logging)
 * @param accountAddress - Optional filter by account address
 * @returns Array of policies
 */
export async function listPolicies(
  userId: string,
  accountAddress?: string,
): Promise<CdpPolicy[]> {
  logger.info("cdp_policy_list", { userId, accountAddress: accountAddress ?? null });

  const params: Record<string, string> = {};
  if (accountAddress) {
    params.scope = "account";
    params.accountAddress = accountAddress;
  }

  const raw = await cdpFetch<{ policies?: Record<string, unknown>[] } | Record<string, unknown>[]>({
    method: "GET",
    path: "/policies",
    params,
  });

  // CDP API may return { policies: [...] } or a bare array
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { policies?: unknown }).policies)
      ? ((raw as { policies: Record<string, unknown>[] }).policies)
      : [];

  return list.map(normalizePolicy);
}

/**
 * Update an existing policy.
 *
 * @param policyId - The policy ID to update
 * @param params - Partial policy fields to update
 * @param userId - Authenticated user ID (for audit logging)
 * @returns The updated policy
 */
export async function updatePolicy(
  policyId: string,
  params: Partial<CreatePolicyParams>,
  userId: string,
): Promise<CdpPolicy> {
  // Fetch current policy to verify ownership before mutation
  const currentRaw = await cdpFetch<Record<string, unknown>>({
    method: "GET",
    path: `/policies/${encodeURIComponent(policyId)}`,
  });
  await verifyPolicyOwnership(normalizePolicy(currentRaw), userId);

  const validated = updatePolicySchema.parse(params);

  logger.info("cdp_policy_update_started", {
    userId,
    policyId,
    fields: Object.keys(validated),
  });

  const body: Record<string, unknown> = {};
  if (validated.name !== undefined) body.name = validated.name;
  if (validated.description !== undefined) body.description = validated.description;
  if (validated.scope !== undefined) body.scope = validated.scope;
  if (validated.accountAddress !== undefined) body.account_address = validated.accountAddress;
  if (validated.rules !== undefined) body.rules = validated.rules;

  const raw = await cdpFetch<Record<string, unknown>>({
    method: "PUT",
    path: `/policies/${encodeURIComponent(policyId)}`,
    body,
  });

  const policy = normalizePolicy(raw);

  logger.info("cdp_policy_updated", {
    userId,
    policyId: policy.id,
    name: policy.name,
  });

  return policy;
}

/**
 * Delete a policy.
 *
 * @param policyId - The policy ID to delete
 * @param userId - Authenticated user ID (for audit logging)
 */
export async function deletePolicy(
  policyId: string,
  userId: string,
): Promise<void> {
  // Fetch current policy to verify ownership before deletion
  const currentRaw = await cdpFetch<Record<string, unknown>>({
    method: "GET",
    path: `/policies/${encodeURIComponent(policyId)}`,
  });
  await verifyPolicyOwnership(normalizePolicy(currentRaw), userId);

  logger.info("cdp_policy_delete_started", { userId, policyId });

  await cdpFetch<void>({
    method: "DELETE",
    path: `/policies/${encodeURIComponent(policyId)}`,
  });

  logger.info("cdp_policy_deleted", { userId, policyId });
}

// ---------------------------------------------------------------------------
// Default Agent Policy
// ---------------------------------------------------------------------------

/**
 * Wei value for 0.1 ETH (100_000_000_000_000_000)
 */
const DEFAULT_ETH_LIMIT_WEI = "100000000000000000";

/**
 * Default per-transaction USD limit for agent wallets.
 */
const DEFAULT_USD_LIMIT = 500;

/**
 * Create a sensible default spending policy for a new agent wallet.
 *
 * The default policy enforces:
 * 1. Reject any single transaction above 0.1 ETH
 * 2. Reject any single transaction with net USD change above $500
 * 3. Accept all remaining transactions (base rule)
 *
 * Rules are evaluated top-down; the first matching rule determines the outcome.
 * This gives agents reasonable spending limits while allowing normal DeFi operations.
 *
 * @param agentId - The agent identifier (used in the policy name)
 * @param walletAddress - The agent wallet address to scope the policy to
 * @param userId - Authenticated user ID
 * @returns The created default policy
 */
export async function createDefaultAgentPolicy(
  agentId: string,
  walletAddress: string,
  userId: string,
): Promise<CdpPolicy> {
  const rules: PolicyRule[] = [
    {
      action: "reject",
      criteria: [
        {
          type: "ethValue",
          gte: DEFAULT_ETH_LIMIT_WEI,
        },
      ],
    },
    {
      action: "reject",
      criteria: [
        {
          type: "netUSDChange",
          lte: -DEFAULT_USD_LIMIT,
        },
      ],
    },
    {
      action: "accept",
      criteria: [],
    },
  ];

  logger.info("cdp_policy_create_default_started", {
    userId,
    agentId,
    walletAddress,
    ethLimitWei: DEFAULT_ETH_LIMIT_WEI,
    usdLimit: DEFAULT_USD_LIMIT,
  });

  const policy = await createPolicy(
    {
      name: `Agent ${agentId.slice(0, 8)} Default Policy`,
      description: `Default spending policy for agent wallet ${walletAddress}. Per-tx limits: 0.1 ETH / $${DEFAULT_USD_LIMIT} USD.`,
      scope: "account",
      accountAddress: walletAddress,
      rules,
    },
    userId,
  );

  logger.info("cdp_policy_create_default_completed", {
    userId,
    agentId,
    policyId: policy.id,
    walletAddress,
  });

  return policy;
}
