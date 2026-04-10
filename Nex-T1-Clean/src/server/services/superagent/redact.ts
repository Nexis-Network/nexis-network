/**
 * Superagent Guardrails - Redact Functions
 * Domain: security
 * Responsibility: PII/secrets/PHI redaction from text
 * Depends on: client, config, types
 */

import { redact as redactRequest } from "./client";
import {
  isSuperagentEnabled,
  isRedactEnabled,
  DEFAULT_REDACT_TYPES,
} from "./config";
import type {
  RedactRequest,
  RedactResult,
  RedactType,
} from "./types";

// ============================================================================
// Core Redaction Functions
// ============================================================================

export type RedactOptions = {
  types?: RedactType[];
  preserveFormat?: boolean;
  metadata?: Record<string, UntypedJson>;
};

/**
 * Redacts sensitive information from text.
 */
export const redactText = async (
  text: string,
  options: RedactOptions = {},
): Promise<RedactResult> => {
  if (!isSuperagentEnabled() || !isRedactEnabled()) {
    return { redacted: text, redactions: [], redactionCount: 0 };
  }

  if (!text || text.trim().length === 0) {
    return { redacted: text, redactions: [], redactionCount: 0 };
  }

  const request: RedactRequest = {
    text,
    types: options.types ?? [...DEFAULT_REDACT_TYPES],
    preserveFormat: options.preserveFormat ?? true,
    metadata: options.metadata,
  };

  return redactRequest(request);
};

/**
 * Redacts PII (Personally Identifiable Information) from text.
 */
export const redactPII = async (
  text: string,
  options: Omit<RedactOptions, "types"> = {},
): Promise<RedactResult> => {
  return redactText(text, {
    ...options,
    types: ["PII"],
  });
};

/**
 * Redacts PHI (Protected Health Information) from text.
 */
export const redactPHI = async (
  text: string,
  options: Omit<RedactOptions, "types"> = {},
): Promise<RedactResult> => {
  return redactText(text, {
    ...options,
    types: ["PHI"],
  });
};

/**
 * Redacts API keys and secrets from text.
 */
export const redactSecrets = async (
  text: string,
  options: Omit<RedactOptions, "types"> = {},
): Promise<RedactResult> => {
  return redactText(text, {
    ...options,
    types: ["API_KEYS", "CREDENTIALS"],
  });
};

/**
 * Redacts all sensitive data types from text.
 */
export const redactAll = async (
  text: string,
  options: Omit<RedactOptions, "types"> = {},
): Promise<RedactResult> => {
  return redactText(text, {
    ...options,
    types: ["ALL"],
  });
};

// ============================================================================
// Object Redaction
// ============================================================================

/**
 * Recursively redacts sensitive data from an object.
 */
export const redactObject = async <T>(
  obj: T,
  options: RedactOptions = {},
): Promise<{ redacted: T; redactionCount: number }> => {
  if (!isSuperagentEnabled() || !isRedactEnabled()) {
    return { redacted: obj, redactionCount: 0 };
  }

  if (obj === null || obj === undefined) {
    return { redacted: obj, redactionCount: 0 };
  }

  // Handle strings directly
  if (typeof obj === "string") {
    const result = await redactText(obj, options);
    return {
      redacted: result.redacted as UntypedJson as T,
      redactionCount: result.redactionCount,
    };
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    let totalRedactions = 0;
    const redactedArray = await Promise.all(
      obj.map(async (item) => {
        const result = await redactObject(item, options);
        totalRedactions += result.redactionCount;
        return result.redacted;
      }),
    );
    return {
      redacted: redactedArray as UntypedJson as T,
      redactionCount: totalRedactions,
    };
  }

  // Handle objects
  if (typeof obj === "object") {
    let totalRedactions = 0;
    const entries = Object.entries(obj as Record<string, UntypedJson>);
    const redactedEntries = await Promise.all(
      entries.map(async ([key, value]) => {
        const result = await redactObject(value, options);
        totalRedactions += result.redactionCount;
        return [key, result.redacted] as const;
      }),
    );
    return {
      redacted: Object.fromEntries(redactedEntries) as T,
      redactionCount: totalRedactions,
    };
  }

  // Primitive types (numbers, booleans) don't need redaction
  return { redacted: obj, redactionCount: 0 };
};

// ============================================================================
// Specialized Redaction for Common Use Cases
// ============================================================================

/**
 * Redacts user input before logging or storage.
 */
export const redactUserInput = async (
  input: string,
  options: { userId?: string | null } = {},
): Promise<RedactResult> => {
  return redactText(input, {
    types: ["PII", "PHI", "API_KEYS", "CREDENTIALS"],
    metadata: {
      source: "user_input",
      userId: options.userId,
    },
  });
};

/**
 * Redacts tool output before returning to model or logging.
 */
export const redactToolOutput = async (
  output: UntypedJson,
  toolName: string,
): Promise<{ redacted: UntypedJson; redactionCount: number }> => {
  if (typeof output === "string") {
    const result = await redactText(output, {
      types: ["PII", "PHI", "API_KEYS", "CREDENTIALS", "FINANCIAL"],
      metadata: { source: "tool_output", toolName },
    });
    return { redacted: result.redacted, redactionCount: result.redactionCount };
  }

  return redactObject(output, {
    types: ["PII", "PHI", "API_KEYS", "CREDENTIALS", "FINANCIAL"],
    metadata: { source: "tool_output", toolName },
  });
};

/**
 * Redacts telemetry metadata before sending to external services.
 */
export const redactTelemetry = async (
  metadata: Record<string, UntypedJson>,
): Promise<{ redacted: Record<string, UntypedJson>; redactionCount: number }> => {
  return redactObject(metadata, {
    types: ["PII", "API_KEYS", "CREDENTIALS"],
    metadata: { source: "telemetry" },
  });
};

/**
 * Redacts log entries before persistence.
 */
export const redactLogEntry = async (
  logData: Record<string, UntypedJson>,
): Promise<Record<string, UntypedJson>> => {
  const result = await redactObject(logData, {
    types: ["PII", "PHI", "API_KEYS", "CREDENTIALS"],
    metadata: { source: "log_entry" },
  });
  return result.redacted;
};

// ============================================================================
// Redaction Summary and Reporting
// ============================================================================

/**
 * Gets a summary of redactions performed.
 */
export const getRedactionSummary = (result: RedactResult): string => {
  if (result.redactionCount === 0) {
    return "No redactions performed";
  }

  const byType = result.redactions.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(byType)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
};

/**
 * Checks if text contains potentially sensitive data.
 * Faster than full redaction - just checks patterns.
 */
export const containsSensitiveData = (text: string): boolean => {
  // Quick pattern checks for common sensitive data
  const patterns = [
    // Email
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    // SSN
    /\d{3}[-.]?\d{2}[-.]?\d{4}/,
    // Phone
    /\d{3}[-.]?\d{3}[-.]?\d{4}/,
    // Credit card
    /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/,
    // API keys
    /sk[-_][a-zA-Z0-9]{20,}/,
    /pk[-_][a-zA-Z0-9]{20,}/,
    /api[-_]?key/i,
    // AWS keys
    /AKIA[A-Z0-9]{16}/,
    // Private key markers
    /-----BEGIN.*PRIVATE KEY-----/,
  ];

  return patterns.some((pattern) => pattern.test(text));
};

// ============================================================================
// Batch Redaction
// ============================================================================

/**
 * Redacts multiple texts in batch.
 */
export const redactBatch = async (
  texts: string[],
  options: RedactOptions = {},
): Promise<RedactResult[]> => {
  return Promise.all(texts.map((text) => redactText(text, options)));
};

/**
 * Redacts sensitive fields from multiple objects.
 */
export const redactObjectBatch = async <T>(
  objects: T[],
  options: RedactOptions = {},
): Promise<Array<{ redacted: T; redactionCount: number }>> => {
  return Promise.all(objects.map((obj) => redactObject(obj, options)));
};

