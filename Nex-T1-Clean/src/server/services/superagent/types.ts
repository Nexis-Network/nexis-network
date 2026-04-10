/**
 * Superagent Guardrails - Type Definitions
 * Domain: security
 * Responsibility: TypeScript types for guard results, CWE codes, violation types
 * Depends on: zod
 */

import { z } from "zod";

// ============================================================================
// CWE (Common Weakness Enumeration) Codes
// ============================================================================

export const CWE_CODES = {
  // Injection vulnerabilities
  PROMPT_INJECTION: "CWE-77",
  COMMAND_INJECTION: "CWE-78",
  SQL_INJECTION: "CWE-89",
  CODE_INJECTION: "CWE-94",
  
  // Data exposure
  SENSITIVE_DATA_EXPOSURE: "CWE-200",
  PII_EXPOSURE: "CWE-359",
  CREDENTIAL_EXPOSURE: "CWE-522",
  
  // Access control
  UNAUTHORIZED_ACCESS: "CWE-284",
  PRIVILEGE_ESCALATION: "CWE-269",
  
  // Input validation
  IMPROPER_INPUT_VALIDATION: "CWE-20",
  CROSS_SITE_SCRIPTING: "CWE-79",
  
  // Business logic
  BUSINESS_LOGIC_BYPASS: "CWE-840",
  RATE_LIMIT_BYPASS: "CWE-770",
} as const;

export type CWECode = (typeof CWE_CODES)[keyof typeof CWE_CODES];

// ============================================================================
// Violation Types
// ============================================================================

export const VIOLATION_TYPES = {
  PROMPT_INJECTION: "prompt_injection",
  JAILBREAK_ATTEMPT: "jailbreak_attempt",
  MALICIOUS_TOOL_CALL: "malicious_tool_call",
  DATA_EXFILTRATION: "data_exfiltration",
  BACKDOOR_ATTEMPT: "backdoor_attempt",
  PII_DETECTED: "pii_detected",
  PHI_DETECTED: "phi_detected",
  SECRET_DETECTED: "secret_detected",
  HARMFUL_CONTENT: "harmful_content",
  POLICY_VIOLATION: "policy_violation",
  UNTRUSTED_SOURCE: "untrusted_source",
} as const;

export type ViolationType = (typeof VIOLATION_TYPES)[keyof typeof VIOLATION_TYPES];

// ============================================================================
// Severity Levels
// ============================================================================

export const SEVERITY_LEVELS = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[keyof typeof SEVERITY_LEVELS];

// ============================================================================
// Guard Schemas
// ============================================================================

export const GuardViolationSchema = z.object({
  id: z.string(),
  type: z.enum([
    "prompt_injection",
    "jailbreak_attempt",
    "malicious_tool_call",
    "data_exfiltration",
    "backdoor_attempt",
    "pii_detected",
    "phi_detected",
    "secret_detected",
    "harmful_content",
    "policy_violation",
    "untrusted_source",
  ]),
  cweCode: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  message: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional(),
  location: z.object({
    start: z.number().optional(),
    end: z.number().optional(),
    context: z.string().optional(),
  }).optional(),
});

export type GuardViolation = z.infer<typeof GuardViolationSchema>;

export const GuardResultSchema = z.object({
  blocked: z.boolean(),
  violations: z.array(GuardViolationSchema),
  reasoning: z.string().optional(),
  requestId: z.string().optional(),
  processingTimeMs: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GuardResult = z.infer<typeof GuardResultSchema>;

// ============================================================================
// Guard Request Types
// ============================================================================

export const GuardActionSchema = z.enum([
  "user_prompt",
  "tool_execution",
  "tool_output",
  "file_upload",
  "system_prompt",
]);

export type GuardAction = z.infer<typeof GuardActionSchema>;

export type GuardRequest = {
  input: string;
  action?: GuardAction;
  toolName?: string;
  attachments?: string | string[];
  metadata?: Record<string, UntypedJson>;
};

export type GuardToolRequest = {
  toolName: string;
  input: UntypedJson;
  action: "tool_execution";
  metadata?: Record<string, UntypedJson>;
};

export type GuardFileRequest = {
  input: string;
  action: "file_upload";
  metadata: {
    filename: string;
    mimeType: string;
    size?: number;
  };
};

// ============================================================================
// Verify Schemas
// ============================================================================

export const VerifyResultSchema = z.object({
  flagged: z.boolean(),
  violations: z.array(GuardViolationSchema),
  suggestions: z.array(z.string()).optional(),
  factualAccuracy: z.number().min(0).max(1).optional(),
  policyCompliance: z.boolean().optional(),
  reasoning: z.string().optional(),
  requestId: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

export type VerifyResult = z.infer<typeof VerifyResultSchema>;

export type VerifyRequest = {
  output: string | UntypedJson;
  toolName?: string;
  action?: "model_output" | "tool_output";
  context?: {
    toolCalls?: UntypedJson[];
    systemPrompt?: string;
    userPrompt?: string;
  };
  metadata?: Record<string, UntypedJson>;
};

// ============================================================================
// Redact Schemas
// ============================================================================

export const REDACT_TYPES = {
  PII: "PII",
  PHI: "PHI",
  API_KEYS: "API_KEYS",
  CREDENTIALS: "CREDENTIALS",
  FINANCIAL: "FINANCIAL",
  ADDRESSES: "ADDRESSES",
  ALL: "ALL",
} as const;

export type RedactType = (typeof REDACT_TYPES)[keyof typeof REDACT_TYPES];

export const RedactionEntrySchema = z.object({
  type: z.string(),
  original: z.string().optional(),
  replacement: z.string(),
  location: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
});

export type RedactionEntry = z.infer<typeof RedactionEntrySchema>;

export const RedactResultSchema = z.object({
  redacted: z.string(),
  redactions: z.array(RedactionEntrySchema),
  redactionCount: z.number(),
  requestId: z.string().optional(),
  processingTimeMs: z.number().optional(),
});

export type RedactResult = z.infer<typeof RedactResultSchema>;

export type RedactRequest = {
  text: string;
  types?: RedactType[];
  preserveFormat?: boolean;
  metadata?: Record<string, UntypedJson>;
};

// ============================================================================
// Security Event Types
// ============================================================================

export const SecurityEventTypeSchema = z.enum([
  "guard_violation",
  "verify_flagged",
  "redaction_applied",
  "prompt_blocked",
  "tool_blocked",
  "output_sanitized",
  "file_rejected",
]);

export type SecurityEventType = z.infer<typeof SecurityEventTypeSchema>;

export const SecurityEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  type: SecurityEventTypeSchema,
  action: z.enum(["blocked", "warned", "redacted", "allowed"]),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  cweCode: z.string().optional(),
  violationType: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  toolName: z.string().optional(),
  requestId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  reasoning: z.string().optional(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// ============================================================================
// Configuration Types
// ============================================================================

export type SuperagentMode = "enforce" | "monitor";

export type SuperagentConfig = {
  apiKey: string;
  mode: SuperagentMode;
  toolGuardEnabled: boolean;
  fileScanEnabled: boolean;
  outputVerifyEnabled: boolean;
  redactEnabled: boolean;
  blockingThreshold: SeverityLevel;
  allowedTools?: string[];
  trustedDomains?: string[];
};

// ============================================================================
// Error Types
// ============================================================================

export class SecurityViolationError extends Error {
  readonly violations: GuardViolation[];
  readonly requestId?: string;

  constructor(result: GuardResult) {
    const message = result.violations.length > 0
      ? `Security violation: ${result.violations[0].message}`
      : "Security violation detected";
    super(message);
    this.name = "SecurityViolationError";
    this.violations = result.violations;
    this.requestId = result.requestId;
  }
}

export class RedactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedactionError";
  }
}

