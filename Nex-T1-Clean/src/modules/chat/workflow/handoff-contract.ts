import { z } from "zod";

export const HandoffSeverity = z.enum([
  "informational",
  "advisory",
  "action_required",
  "critical",
]);
export type HandoffSeverity = z.infer<typeof HandoffSeverity>;

export const EscalationReason = z.enum([
  "confidence_below_threshold",
  "monetary_threshold_exceeded",
  "user_requested",
  "repeated_failure",
  "security_violation",
  "regulatory_concern",
  "unrecognized_intent",
  "approval_timeout",
]);
export type EscalationReason = z.infer<typeof EscalationReason>;

export const AttemptedActionSchema = z.object({
  toolName: z.string(),
  intent: z.string(),
  outcome: z.enum(["success", "failure", "blocked", "timeout"]),
  detail: z.string().nullable(),
  timestamp: z.string().datetime(),
});

export const VerifiedPrerequisiteSchema = z.object({
  check: z.string(),
  result: z.enum(["pass", "fail", "skipped"]),
  detail: z.string().nullable(),
});

export const MonetaryImpactSchema = z.object({
  estimatedUsd: z.string().nullable(),
  direction: z.enum(["outflow", "inflow", "neutral"]).nullable(),
  assets: z.array(z.string()),
  chains: z.array(z.string()),
});

export const WorkingMemorySnapshotSchema = z.object({
  activeTaskId: z.string().nullable(),
  todoSummary: z.string(),
  blockerSummary: z.string().nullable(),
});

export const HandoffSummarySchema = z.object({
  handoffId: z.string().uuid(),
  createdAt: z.string().datetime(),
  sessionId: z.string().nullable(),
  userId: z.string(),
  userIdentifier: z.string().nullable(),
  requestSummary: z.string().max(500),
  requestCategory: z.string(),
  escalationReason: EscalationReason,
  escalationDetail: z.string().max(1000),
  severity: HandoffSeverity,
  attemptedActions: z.array(AttemptedActionSchema),
  verifiedPrerequisites: z.array(VerifiedPrerequisiteSchema),
  monetaryImpact: MonetaryImpactSchema.nullable(),
  recommendedAction: z.string().max(500),
  confidenceNotes: z.string().max(500).nullable(),
  workingMemorySnapshot: WorkingMemorySnapshotSchema,
  relevantArtifactIds: z.array(z.string()),
});

export type HandoffSummary = z.infer<typeof HandoffSummarySchema>;
export type AttemptedAction = z.infer<typeof AttemptedActionSchema>;
export type VerifiedPrerequisite = z.infer<typeof VerifiedPrerequisiteSchema>;
export type MonetaryImpact = z.infer<typeof MonetaryImpactSchema>;

export function isHandoffEnabled(): boolean {
  return process.env.NEX_HANDOFF_ENABLED === "true";
}
