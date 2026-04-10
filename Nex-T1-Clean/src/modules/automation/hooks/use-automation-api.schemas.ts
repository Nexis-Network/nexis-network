"use client";

import { z } from "zod";
import { AUTONOMOUS_ACTION_KEYS, type AutonomousActionKey } from "@/modules/chat/automation-preferences";
import { jsonRecordSchema } from "@/lib/validation/json";
import type {
  AutomationSessionKey,
  AutomationStrategyRecord,
  GuardianCouncilRecord,
  GuardianMemberRecord,
  OverrideEventRecord,
  PaymasterBalanceRecord,
  StrategyBindingRecord,
} from "@/modules/automation/types";

type RecordsResponse<T> = {
  items: T[];
};

function parseScopes(scopes: UntypedJson): AutonomousActionKey[] {
  if (!Array.isArray(scopes)) {
    return [];
  }

  const allowed = new Set<AutonomousActionKey>(AUTONOMOUS_ACTION_KEYS);
  const normalized: AutonomousActionKey[] = [];

  for (const entry of scopes) {
    if (typeof entry !== "string") {
      continue;
    }

    const lowered = entry.toLowerCase() as AutonomousActionKey;
    if (allowed.has(lowered)) {
      normalized.push(lowered);
    }
  }

  return normalized;
}

const isoDateSchema = z.string().datetime().transform((value) => new Date(value));
const nullableIsoDateSchema = z
  .string()
  .datetime()
  .nullable()
  .optional()
  .transform((value) => (value ? new Date(value) : null));

export const sessionKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  agentIdentifier: z.string().min(1),
  chainSlug: z.string().min(1),
  walletAddress: z.string().min(1),
  sessionKeyPublic: z.string().min(1),
  scopes: z.unknown().transform((value) => parseScopes(value)),
  expiresAt: nullableIsoDateSchema,
  revokedAt: nullableIsoDateSchema,
  revokedReason: z.string().nullable().optional().transform((value) => value ?? null),
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const strategySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional().transform((value) => value ?? null),
  strategyHash: z.string().min(1),
  parameters: jsonRecordSchema,
  version: z.number().int().positive(),
  isActive: z.boolean(),
  anchoredChain: z.string().nullable().optional().transform((value) => value ?? null),
  anchoredTxHash: z.string().nullable().optional().transform((value) => value ?? null),
  anchoredAt: nullableIsoDateSchema,
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const strategyBindingSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid(),
  userId: z.string().uuid(),
  agentIdentifier: z.string().min(1),
  status: z.string().min(1),
  confirmedAt: nullableIsoDateSchema,
  confirmationSignature: z.string().nullable().optional().transform((value) => value ?? null),
  confirmationPayload: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const guardianCouncilSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  daoIdentifier: z.string().min(1),
  multisigAddress: z.string().min(1),
  executionChain: z.string().min(1),
  slaHours: z.number().int().positive(),
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const guardianMemberSchema = z.object({
  id: z.string().uuid(),
  councilId: z.string().uuid(),
  memberAddress: z.string().min(1),
  memberType: z.string().min(1),
  isActive: z.boolean(),
  addedAt: isoDateSchema,
  removedAt: nullableIsoDateSchema,
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
});

export const overrideEventSchema = z.object({
  id: z.string().uuid(),
  councilId: z.string().uuid(),
  triggeredBy: z.string().min(1),
  triggerType: z.string().min(1),
  chainSlug: z.string().min(1),
  txHash: z.string().nullable().optional().transform((value) => value ?? null),
  status: z.enum(["pending", "processing", "resolved", "rejected"]),
  reason: z.string().nullable().optional().transform((value) => value ?? null),
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  resolvedAt: nullableIsoDateSchema,
});

export const paymasterBalanceSchema = z.object({
  id: z.string().uuid(),
  chainSlug: z.string().min(1),
  paymasterAddress: z.string().min(1),
  currentBalance: z.number().finite(),
  balanceCurrency: z.string().min(1),
  thresholdAmount: z.number().finite(),
  lastRefreshedAt: isoDateSchema,
  metadata: jsonRecordSchema.nullable().optional().transform((value) => value ?? {}),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ message: z.string().optional() }).optional(),
});

export function recordsSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    items: z.array(itemSchema),
  }) as z.ZodType<RecordsResponse<T>>;
}

function successEnvelopeSchema<T>(dataSchema: z.ZodType<T>) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  }) as z.ZodType<{ success: true; data: T }>;
}

async function readJsonPayload(response: Response, fallbackError: string): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    throw new Error(`${fallbackError}: empty response payload`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${fallbackError}: invalid JSON response`);
  }
}

function extractApiErrorMessage(payload: unknown): string | null {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.error?.message ?? null;
}

export async function parseAutomationApiPayload<T>(
  response: Response,
  dataSchema: z.ZodType<T>,
  fallbackError: string,
): Promise<T> {
  if (response.status === 204) {
    throw new Error(`${fallbackError}: empty response payload`);
  }

  const payload = await readJsonPayload(response, fallbackError);
  if (!response.ok) {
    throw new Error(extractApiErrorMessage(payload) ?? fallbackError);
  }

  const parsed = successEnvelopeSchema(dataSchema).safeParse(payload);
  if (!parsed.success) {
    throw new Error(`${fallbackError}: invalid response payload`);
  }

  return parsed.data.data;
}

export type AutomationSchemaTypes = {
  sessionKey: AutomationSessionKey;
  strategy: AutomationStrategyRecord;
  strategyBinding: StrategyBindingRecord;
  guardianCouncil: GuardianCouncilRecord;
  guardianMember: GuardianMemberRecord;
  overrideEvent: OverrideEventRecord;
  paymasterBalance: PaymasterBalanceRecord;
};
