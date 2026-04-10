/**
 * CDP Policy Engine AI Tool
 *
 * Allows the AI agent to manage spending policies for agent wallets.
 * Supports listing, creating, updating, and deleting policies via
 * natural language commands.
 *
 * Security model:
 * - Read operations (list_policies): No HITL required
 * - Write operations (create_policy, update_policy, delete_policy): HITL approval required
 *
 * This follows the same HITL pattern as cdp-spend-permission.ts.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  enumProp,
  arrayProp,
  objectProp,
} from "./create-tool";
import {
  createApprovalRequest,
  waitForApproval,
  type ApprovalPayload,
} from "@/lib/approvals/state-machine";
import {
  createPolicy,
  getPolicy,
  listPolicies,
  updatePolicy,
  deletePolicy,
  createDefaultAgentPolicy,
  type PolicyRule,
  type CdpPolicy,
} from "@/server/services/cdp/policy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpPolicyInput = {
  command:
    | "list_policies"
    | "create_policy"
    | "update_policy"
    | "delete_policy"
    | "create_default_policy";
  policyId?: string;
  accountAddress?: string;
  agentId?: string;
  name?: string;
  description?: string;
  scope?: "project" | "account";
  rules?: PolicyRule[];
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const policyRuleSchema = objectProp(
  "A policy rule with an action and criteria array",
  {
    action: enumProp("Whether to accept or reject matching transactions", [
      "accept",
      "reject",
    ]),
    criteria: arrayProp(
      "Array of criteria objects that must all match for this rule to apply",
      objectProp("A single criteria condition", {
        type: enumProp("The type of criteria", [
          "evmAddress",
          "ethValue",
          "evmNetwork",
          "netUSDChange",
        ]),
      }),
    ),
  },
  ["action", "criteria"],
);

const cdpPolicySchema = createToolSchema(
  {
    command: enumProp(
      "The policy operation to perform. list_policies: list all policies for an account. create_policy: create a new policy with rules. update_policy: modify an existing policy. delete_policy: remove a policy. create_default_policy: create a sensible default policy for a new agent wallet.",
      [
        "list_policies",
        "create_policy",
        "update_policy",
        "delete_policy",
        "create_default_policy",
      ],
    ),
    policyId: stringProp(
      "The ID of the policy to get, update, or delete. Required for update_policy and delete_policy commands.",
    ),
    accountAddress: stringProp(
      "The EVM wallet address to scope the policy to. Used for filtering in list_policies and as the account scope for create_policy.",
    ),
    agentId: stringProp(
      "The agent ID. Required for create_default_policy command.",
    ),
    name: stringProp(
      "Name for the policy (max 128 chars). Required for create_policy.",
    ),
    description: stringProp(
      "Optional description for the policy (max 512 chars).",
    ),
    scope: enumProp(
      "Policy scope: 'project' applies to all wallets, 'account' applies to a specific wallet.",
      ["project", "account"],
    ),
    rules: arrayProp(
      "Array of policy rules evaluated top-down. Each rule has an action (accept/reject) and criteria array. Rules are matched in order; first match wins.",
      policyRuleSchema,
    ),
  },
  ["command"],
);

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const cdpPolicyTool = createTool<CdpPolicyInput>({
  description:
    "Manage spending policies for agent wallets. Policies restrict what agent wallets can do " +
    "via declarative rules evaluated top-down (first matching rule wins). " +
    "Use this to set transaction limits, restrict networks, or whitelist/blacklist addresses " +
    "for AI agent wallets. " +
    "Commands: list_policies (read, no approval needed), create_policy (creates new policy, needs approval), " +
    "update_policy (modifies existing, needs approval), delete_policy (removes policy, needs approval), " +
    "create_default_policy (creates sensible defaults for new agent wallet, needs approval).",
  schema: cdpPolicySchema,
  execute: async (input, context) => {
    const userId = context?.userId;
    if (!userId) {
      throw new Error("User ID is required to manage CDP policies.");
    }

    switch (input.command) {
      case "list_policies":
        return handleListPolicies(userId, input.accountAddress);

      case "create_policy":
        return handleCreatePolicy(userId, input, context);

      case "update_policy":
        return handleUpdatePolicy(userId, input, context);

      case "delete_policy":
        return handleDeletePolicy(userId, input, context);

      case "create_default_policy":
        return handleCreateDefaultPolicy(userId, input, context);

      default:
        return {
          error: `Unknown command: ${input.command}. Valid commands: list_policies, create_policy, update_policy, delete_policy, create_default_policy.`,
        };
    }
  },
});

// ---------------------------------------------------------------------------
// Command Handlers
// ---------------------------------------------------------------------------

/**
 * List policies -- read-only, no HITL required.
 */
async function handleListPolicies(
  userId: string,
  accountAddress?: string,
): Promise<unknown> {
  const policies = await listPolicies(userId, accountAddress);

  return {
    status: "success",
    command: "list_policies",
    data: {
      count: policies.length,
      policies: policies.map(formatPolicyForAI),
    },
  };
}

/**
 * Create a policy -- write operation, HITL approval required.
 */
async function handleCreatePolicy(
  userId: string,
  input: CdpPolicyInput,
  context: { metadata?: Record<string, unknown> } | undefined,
): Promise<unknown> {
  if (!input.name) {
    return { error: "Policy name is required for create_policy command." };
  }
  if (!input.rules || input.rules.length === 0) {
    return { error: "At least one rule is required for create_policy command." };
  }

  const approvalPayload: ApprovalPayload = {
    toolId: "cdp_wallet",
    command: "create_policy",
    args: {
      name: input.name,
      description: input.description ?? "",
      scope: input.scope ?? "account",
      accountAddress: input.accountAddress ?? "",
      ruleCount: input.rules.length,
      source: "cdp_policy",
      invocationSource:
        typeof context?.metadata?.invocationSource === "string"
          ? String(context.metadata.invocationSource)
          : "unknown",
    },
    preview: {
      title: "Create Spending Policy",
      description: `Create a new policy "${input.name}" with ${input.rules.length} rule(s).`,
      items: [
        { label: "Policy Name", value: input.name, highlight: true },
        { label: "Scope", value: input.scope ?? "account" },
        ...(input.accountAddress
          ? [{ label: "Account", value: input.accountAddress }]
          : []),
        { label: "Rules", value: `${input.rules.length} rule(s)`, highlight: true },
      ],
      warnings: [
        "This creates a spending policy that will restrict transactions for the targeted wallet(s).",
        "Review the rules carefully before approving.",
      ],
    },
  };

  const approvalRequest = await createApprovalRequest(userId, approvalPayload);
  const decision = await waitForApproval(approvalRequest.id, userId);

  if (!decision.approved) {
    return {
      status: "rejected",
      approvalRequired: true,
      approvalId: approvalRequest.id,
      message: decision.reason ?? "Policy creation rejected by user.",
    };
  }

  const policy = await createPolicy(
    {
      name: input.name,
      description: input.description,
      scope: input.scope ?? "account",
      accountAddress: input.accountAddress,
      rules: input.rules,
    },
    userId,
  );

  return {
    status: "success",
    approvalRequired: true,
    approvalId: approvalRequest.id,
    command: "create_policy",
    data: formatPolicyForAI(policy),
    message: `Policy "${policy.name}" created successfully with ${policy.rules.length} rule(s).`,
  };
}

/**
 * Update a policy -- write operation, HITL approval required.
 */
async function handleUpdatePolicy(
  userId: string,
  input: CdpPolicyInput,
  context: { metadata?: Record<string, unknown> } | undefined,
): Promise<unknown> {
  if (!input.policyId) {
    return { error: "policyId is required for update_policy command." };
  }

  // Fetch the current policy for the approval preview
  let currentPolicy: CdpPolicy;
  try {
    currentPolicy = await getPolicy(input.policyId, userId);
  } catch {
    return { error: `Policy ${input.policyId} not found or inaccessible.` };
  }

  const approvalPayload: ApprovalPayload = {
    toolId: "cdp_wallet",
    command: "update_policy",
    args: {
      policyId: input.policyId,
      currentName: currentPolicy.name,
      newName: input.name ?? currentPolicy.name,
      ruleCount: input.rules?.length ?? currentPolicy.rules.length,
      source: "cdp_policy",
      invocationSource:
        typeof context?.metadata?.invocationSource === "string"
          ? String(context.metadata.invocationSource)
          : "unknown",
    },
    preview: {
      title: "Update Spending Policy",
      description: `Update policy "${currentPolicy.name}" (${input.policyId}).`,
      items: [
        { label: "Policy ID", value: input.policyId },
        { label: "Current Name", value: currentPolicy.name },
        ...(input.name ? [{ label: "New Name", value: input.name, highlight: true }] : []),
        ...(input.rules
          ? [{ label: "New Rules", value: `${input.rules.length} rule(s)`, highlight: true }]
          : []),
      ],
      warnings: [
        "This will modify the spending policy. Existing restrictions may be changed.",
      ],
    },
  };

  const approvalRequest = await createApprovalRequest(userId, approvalPayload);
  const decision = await waitForApproval(approvalRequest.id, userId);

  if (!decision.approved) {
    return {
      status: "rejected",
      approvalRequired: true,
      approvalId: approvalRequest.id,
      message: decision.reason ?? "Policy update rejected by user.",
    };
  }

  const updatedPolicy = await updatePolicy(
    input.policyId,
    {
      name: input.name,
      description: input.description,
      scope: input.scope,
      accountAddress: input.accountAddress,
      rules: input.rules,
    },
    userId,
  );

  return {
    status: "success",
    approvalRequired: true,
    approvalId: approvalRequest.id,
    command: "update_policy",
    data: formatPolicyForAI(updatedPolicy),
    message: `Policy "${updatedPolicy.name}" updated successfully.`,
  };
}

/**
 * Delete a policy -- write operation, HITL approval required.
 */
async function handleDeletePolicy(
  userId: string,
  input: CdpPolicyInput,
  context: { metadata?: Record<string, unknown> } | undefined,
): Promise<unknown> {
  if (!input.policyId) {
    return { error: "policyId is required for delete_policy command." };
  }

  // Fetch the current policy for the approval preview
  let currentPolicy: CdpPolicy;
  try {
    currentPolicy = await getPolicy(input.policyId, userId);
  } catch {
    return { error: `Policy ${input.policyId} not found or inaccessible.` };
  }

  const approvalPayload: ApprovalPayload = {
    toolId: "cdp_wallet",
    command: "delete_policy",
    args: {
      policyId: input.policyId,
      policyName: currentPolicy.name,
      source: "cdp_policy",
      invocationSource:
        typeof context?.metadata?.invocationSource === "string"
          ? String(context.metadata.invocationSource)
          : "unknown",
    },
    preview: {
      title: "Delete Spending Policy",
      description: `Permanently delete policy "${currentPolicy.name}".`,
      items: [
        { label: "Policy ID", value: input.policyId },
        { label: "Policy Name", value: currentPolicy.name, highlight: true },
        { label: "Scope", value: currentPolicy.scope },
        ...(currentPolicy.accountAddress
          ? [{ label: "Account", value: currentPolicy.accountAddress }]
          : []),
        { label: "Rules", value: `${currentPolicy.rules.length} rule(s)` },
      ],
      warnings: [
        "This will permanently remove the spending policy.",
        "The agent wallet will have no transaction restrictions until a new policy is created.",
      ],
    },
  };

  const approvalRequest = await createApprovalRequest(userId, approvalPayload);
  const decision = await waitForApproval(approvalRequest.id, userId);

  if (!decision.approved) {
    return {
      status: "rejected",
      approvalRequired: true,
      approvalId: approvalRequest.id,
      message: decision.reason ?? "Policy deletion rejected by user.",
    };
  }

  await deletePolicy(input.policyId, userId);

  return {
    status: "success",
    approvalRequired: true,
    approvalId: approvalRequest.id,
    command: "delete_policy",
    message: `Policy "${currentPolicy.name}" (${input.policyId}) deleted successfully.`,
  };
}

/**
 * Create default policy -- write operation, HITL approval required.
 */
async function handleCreateDefaultPolicy(
  userId: string,
  input: CdpPolicyInput,
  context: { metadata?: Record<string, unknown> } | undefined,
): Promise<unknown> {
  if (!input.agentId) {
    return { error: "agentId is required for create_default_policy command." };
  }
  if (!input.accountAddress) {
    return { error: "accountAddress (wallet address) is required for create_default_policy command." };
  }

  const approvalPayload: ApprovalPayload = {
    toolId: "cdp_wallet",
    command: "create_default_policy",
    args: {
      agentId: input.agentId,
      accountAddress: input.accountAddress,
      source: "cdp_policy",
      invocationSource:
        typeof context?.metadata?.invocationSource === "string"
          ? String(context.metadata.invocationSource)
          : "unknown",
    },
    preview: {
      title: "Create Default Spending Policy",
      description:
        "Create a default spending policy with sensible limits for an agent wallet.",
      items: [
        { label: "Agent ID", value: input.agentId },
        { label: "Wallet Address", value: input.accountAddress, highlight: true },
        { label: "Per-tx ETH Limit", value: "0.1 ETH", highlight: true },
        { label: "Per-tx USD Limit", value: "$500", highlight: true },
      ],
      warnings: [
        "This creates a default policy with per-transaction limits of 0.1 ETH and $500 USD.",
        "You can customize these limits after creation.",
      ],
    },
  };

  const approvalRequest = await createApprovalRequest(userId, approvalPayload);
  const decision = await waitForApproval(approvalRequest.id, userId);

  if (!decision.approved) {
    return {
      status: "rejected",
      approvalRequired: true,
      approvalId: approvalRequest.id,
      message: decision.reason ?? "Default policy creation rejected by user.",
    };
  }

  const policy = await createDefaultAgentPolicy(
    input.agentId,
    input.accountAddress,
    userId,
  );

  return {
    status: "success",
    approvalRequired: true,
    approvalId: approvalRequest.id,
    command: "create_default_policy",
    data: formatPolicyForAI(policy),
    message: `Default policy created for agent ${input.agentId} on wallet ${input.accountAddress}. Limits: 0.1 ETH / $500 USD per transaction.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a CdpPolicy for AI-readable output.
 */
function formatPolicyForAI(policy: CdpPolicy): Record<string, unknown> {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? null,
    scope: policy.scope,
    accountAddress: policy.accountAddress ?? null,
    ruleCount: policy.rules.length,
    rules: policy.rules.map((rule, index) => ({
      index,
      action: rule.action,
      criteriaCount: rule.criteria.length,
      criteria: rule.criteria.map((c) => {
        switch (c.type) {
          case "evmAddress":
            return {
              type: c.type,
              operator: c.operator,
              addressCount: c.addresses.length,
              addresses: c.addresses.slice(0, 5),
            };
          case "ethValue":
            return { type: c.type, gte: c.gte ?? null, lte: c.lte ?? null };
          case "evmNetwork":
            return { type: c.type, networks: c.networks };
          case "netUSDChange":
            return { type: c.type, gte: c.gte ?? null, lte: c.lte ?? null };
          default:
            return c;
        }
      }),
    })),
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}
