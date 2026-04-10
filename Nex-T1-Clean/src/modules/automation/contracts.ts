import { z } from "zod";

import { jsonRecordSchema } from "@/lib/validation/json";
import { AUTONOMOUS_ACTION_KEYS } from "@/modules/chat/automation-preferences";

const automationScopeLiterals = [
  "bridge",
  "deploy",
  "buy",
  "sell",
  "stake",
] as const satisfies typeof AUTONOMOUS_ACTION_KEYS;

export const automationScopeSchema = z.enum(automationScopeLiterals);
export type AutomationScope = z.infer<typeof automationScopeSchema>;

const isoDateTimeSchema = z
  .string()
  .datetime()
  .transform((value) => new Date(value));

const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable().optional().transform((value) => value ?? null);

function normalizeScopes(scopes: unknown): AutomationScope[] {
  if (!Array.isArray(scopes)) {
    return [];
  }

  const allowed = new Set(automationScopeLiterals);
  const normalized: AutomationScope[] = [];

  for (const entry of scopes) {
    if (typeof entry === "string" && allowed.has(entry as AutomationScope)) {
      normalized.push(entry as AutomationScope);
    }
  }

  return normalized;
}

const userAgentKeyRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  agent_identifier: z.string(),
  chain_slug: z.string(),
  wallet_address: z.string(),
  session_key_public: z.string(),
  scopes: z
    .unknown()
    .transform((value) => normalizeScopes(value)),
  expires_at: z.string().datetime().nullable(),
  revoked_at: z.string().datetime().nullable(),
  revoked_reason: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const userAgentKeySchema = userAgentKeyRecordSchema.transform((record) => ({
  id: record.id,
  userId: record.user_id,
  agentIdentifier: record.agent_identifier,
  chainSlug: record.chain_slug,
  walletAddress: record.wallet_address,
  sessionKeyPublic: record.session_key_public,
  scopes: record.scopes,
  expiresAt: record.expires_at ? new Date(record.expires_at) : null,
  revokedAt: record.revoked_at ? new Date(record.revoked_at) : null,
  revokedReason: record.revoked_reason ?? null,
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
}));

export type UserAgentKey = z.infer<typeof userAgentKeySchema>;

export const createAgentKeyInputSchema = z.object({
  agentIdentifier: z.string().min(1).max(128),
  chainSlug: z.string().min(1).max(64),
  walletAddress: z.string().min(1).max(128),
  sessionKeyPublic: z.string().min(1).max(512),
  scopes: z.array(automationScopeSchema).default([]),
  expiresAt: nullableIsoDateTimeSchema,
  metadata: jsonRecordSchema.optional(),
});

export type CreateAgentKeyInput = z.output<typeof createAgentKeyInputSchema>;

export const revokeAgentKeyInputSchema = z.object({
  revokedReason: z.string().min(3).max(512).optional(),
});

export type RevokeAgentKeyInput = z.output<typeof revokeAgentKeyInputSchema>;

const automationStrategyRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  strategy_hash: z.string(),
  parameters: jsonRecordSchema,
  version: z.number().int().positive(),
  is_active: z.boolean(),
  anchored_chain: z.string().nullable(),
  anchored_tx_hash: z.string().nullable(),
  anchored_at: z.string().datetime().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const automationStrategySchema = automationStrategyRecordSchema.transform((record) => ({
  id: record.id,
  userId: record.user_id,
  name: record.name,
  description: record.description ?? null,
  strategyHash: record.strategy_hash,
  parameters: record.parameters,
  version: record.version,
  isActive: record.is_active,
  anchoredChain: record.anchored_chain ?? null,
  anchoredTxHash: record.anchored_tx_hash ?? null,
  anchoredAt: record.anchored_at ? new Date(record.anchored_at) : null,
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
}));

export type AutomationStrategy = z.infer<typeof automationStrategySchema>;

export const createAutomationStrategyInputSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  parameters: jsonRecordSchema.default({}),
  metadata: jsonRecordSchema.optional(),
});

export type CreateAutomationStrategyInput = z.output<typeof createAutomationStrategyInputSchema>;

export const updateAutomationStrategyInputSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2048).optional(),
  isActive: z.boolean().optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateAutomationStrategyInput = z.output<typeof updateAutomationStrategyInputSchema>;

export const anchorAutomationStrategyInputSchema = z.object({
  anchoredChain: z.string().min(1).max(64),
  anchoredTxHash: z.string().min(1).max(256),
  anchoredAt: isoDateTimeSchema.optional(),
});

export type AnchorAutomationStrategyInput = z.output<typeof anchorAutomationStrategyInputSchema>;

const agentStrategyBindingRecordSchema = z.object({
  id: z.string().uuid(),
  strategy_id: z.string().uuid(),
  user_id: z.string().uuid(),
  agent_identifier: z.string(),
  status: z.string(),
  confirmed_at: z.string().datetime().nullable(),
  confirmation_signature: z.string().nullable(),
  confirmation_payload: jsonRecordSchema.nullable().default({}),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const agentStrategyBindingSchema = agentStrategyBindingRecordSchema.transform((record) => ({
  id: record.id,
  strategyId: record.strategy_id,
  userId: record.user_id,
  agentIdentifier: record.agent_identifier,
  status: record.status,
  confirmedAt: record.confirmed_at ? new Date(record.confirmed_at) : null,
  confirmationSignature: record.confirmation_signature ?? null,
  confirmationPayload: record.confirmation_payload ?? {},
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
}));

export type AgentStrategyBinding = z.infer<typeof agentStrategyBindingSchema>;

export const createStrategyBindingInputSchema = z.object({
  agentIdentifier: z.string().min(1).max(128),
  metadata: jsonRecordSchema.optional(),
});

export type CreateStrategyBindingInput = z.output<typeof createStrategyBindingInputSchema>;

export const updateStrategyBindingInputSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "revoked"]).optional(),
  confirmationSignature: z.string().min(1).max(512).nullable().optional(),
  confirmationPayload: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateStrategyBindingInput = z.output<typeof updateStrategyBindingInputSchema>;

const guardianCouncilRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  dao_identifier: z.string(),
  multisig_address: z.string(),
  execution_chain: z.string(),
  sla_hours: z.number().int().positive(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const guardianCouncilSchema = guardianCouncilRecordSchema.transform((record) => ({
  id: record.id,
  userId: record.user_id,
  daoIdentifier: record.dao_identifier,
  multisigAddress: record.multisig_address,
  executionChain: record.execution_chain,
  slaHours: record.sla_hours,
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
}));

export type GuardianCouncil = z.infer<typeof guardianCouncilSchema>;

export const createGuardianCouncilInputSchema = z.object({
  daoIdentifier: z.string().min(1).max(128),
  multisigAddress: z.string().min(1).max(256),
  executionChain: z.string().min(1).max(64),
  slaHours: z.number().int().positive().max(720),
  metadata: jsonRecordSchema.optional(),
});

export type CreateGuardianCouncilInput = z.output<typeof createGuardianCouncilInputSchema>;

export const updateGuardianCouncilInputSchema = z.object({
  multisigAddress: z.string().min(1).max(256).optional(),
  executionChain: z.string().min(1).max(64).optional(),
  slaHours: z.number().int().positive().max(720).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateGuardianCouncilInput = z.output<typeof updateGuardianCouncilInputSchema>;

const guardianMemberRecordSchema = z.object({
  id: z.string().uuid(),
  council_id: z.string().uuid(),
  member_address: z.string(),
  member_type: z.string(),
  is_active: z.boolean(),
  added_at: z.string().datetime(),
  removed_at: z.string().datetime().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
});

export const guardianMemberSchema = guardianMemberRecordSchema.transform((record) => ({
  id: record.id,
  councilId: record.council_id,
  memberAddress: record.member_address,
  memberType: record.member_type,
  isActive: record.is_active,
  addedAt: new Date(record.added_at),
  removedAt: record.removed_at ? new Date(record.removed_at) : null,
  metadata: record.metadata ?? {},
}));

export type GuardianMember = z.infer<typeof guardianMemberSchema>;

export const createGuardianMemberInputSchema = z.object({
  memberAddress: z.string().min(1).max(256),
  memberType: z.enum(["human", "agent"]).default("human"),
  metadata: jsonRecordSchema.optional(),
});

export type CreateGuardianMemberInput = z.output<typeof createGuardianMemberInputSchema>;

export const updateGuardianMemberInputSchema = z.object({
  memberType: z.enum(["human", "agent"]).optional(),
  isActive: z.boolean().optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateGuardianMemberInput = z.output<typeof updateGuardianMemberInputSchema>;

const overrideEventRecordSchema = z.object({
  id: z.string().uuid(),
  council_id: z.string().uuid(),
  triggered_by: z.string(),
  trigger_type: z.string(),
  chain_slug: z.string(),
  tx_hash: z.string().nullable(),
  status: z.enum(["pending", "processing", "resolved", "rejected"]),
  reason: z.string().nullable(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable(),
});

export const overrideEventSchema = overrideEventRecordSchema.transform((record) => ({
  id: record.id,
  councilId: record.council_id,
  triggeredBy: record.triggered_by,
  triggerType: record.trigger_type,
  chainSlug: record.chain_slug,
  txHash: record.tx_hash ?? null,
  status: record.status,
  reason: record.reason ?? null,
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  resolvedAt: record.resolved_at ? new Date(record.resolved_at) : null,
}));

export type OverrideEvent = z.infer<typeof overrideEventSchema>;

export const createOverrideEventInputSchema = z.object({
  triggeredBy: z.string().min(1).max(128),
  triggerType: z.string().min(1).max(128),
  chainSlug: z.string().min(1).max(64),
  txHash: z.string().min(1).max(256).optional(),
  status: z.enum(["pending", "processing", "resolved", "rejected"]).default("pending"),
  reason: z.string().max(2048).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type CreateOverrideEventInput = z.output<typeof createOverrideEventInputSchema>;

export const updateOverrideEventInputSchema = z.object({
  status: z.enum(["pending", "processing", "resolved", "rejected"]).optional(),
  txHash: z.string().min(1).max(256).optional(),
  resolvedAt: isoDateTimeSchema.optional(),
  reason: z.string().max(2048).optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpdateOverrideEventInput = z.output<typeof updateOverrideEventInputSchema>;

const paymasterBalanceRecordSchema = z.object({
  id: z.string().uuid(),
  chain_slug: z.string(),
  paymaster_address: z.string(),
  current_balance: z.number(),
  balance_currency: z.string(),
  threshold_amount: z.number(),
  last_refreshed_at: z.string().datetime(),
  metadata: jsonRecordSchema.nullable().default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paymasterBalanceSchema = paymasterBalanceRecordSchema.transform((record) => ({
  id: record.id,
  chainSlug: record.chain_slug,
  paymasterAddress: record.paymaster_address,
  currentBalance: record.current_balance,
  balanceCurrency: record.balance_currency,
  thresholdAmount: record.threshold_amount,
  lastRefreshedAt: new Date(record.last_refreshed_at),
  metadata: record.metadata ?? {},
  createdAt: new Date(record.created_at),
  updatedAt: new Date(record.updated_at),
}));

export type PaymasterBalance = z.infer<typeof paymasterBalanceSchema>;

export const upsertPaymasterBalanceInputSchema = z.object({
  chainSlug: z.string().min(1).max(64),
  paymasterAddress: z.string().min(1).max(256),
  currentBalance: z.number().finite(),
  balanceCurrency: z.string().min(1).max(16),
  thresholdAmount: z.number().finite().nonnegative(),
  lastRefreshedAt: isoDateTimeSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});

export type UpsertPaymasterBalanceInput = z.output<typeof upsertPaymasterBalanceInputSchema>;
