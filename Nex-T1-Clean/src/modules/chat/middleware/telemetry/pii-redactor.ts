/**
 * Nex Telemetry PII Redactor -- Metadata Sanitization
 *
 * Redacts potential PII and secrets from telemetry metadata values
 * before they are emitted to any downstream system.
 *
 * Design notes:
 * - The API key pattern requires an explicit separator (- or _) after the
 *   prefix to reduce false positives on normal words like "tokenCount".
 * - The private key pattern matches 64-char hex strings (SHA256-length),
 *   which may cause false positives on transaction hashes. This is acceptable
 *   since over-redaction is preferable to leaking secrets in telemetry.
 */

// ---------------------------------------------------------------------------
// Redaction Patterns
// ---------------------------------------------------------------------------

const PII_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // API keys / tokens -- require separator after prefix to avoid false positives
  [/\b(sk|pk|token|key|secret|bearer)[_-][A-Za-z0-9_-]{20,}\b/gi, "[REDACTED_KEY]"],
  // Ethereum-style addresses (0x + 40 hex chars)
  [/\b0x[a-fA-F0-9]{40}\b/g, "[REDACTED_ADDRESS]"],
  // JWT tokens (three base64url segments separated by dots)
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED_JWT]"],
  // Email addresses
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
  // Private keys (hex, exactly 64 hex chars)
  [/\b[a-fA-F0-9]{64}\b/g, "[REDACTED_PRIVATE_KEY]"],
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Redacts a single string value against all PII patterns.
 */
export function redactValue(value: string): string {
  let result = value;
  for (const [pattern, replacement] of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Redacts all string values in a metadata record.
 * Non-string values are passed through unchanged.
 */
export function redactMetadata(
  metadata: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const redacted: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      redacted[key] = redactValue(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
