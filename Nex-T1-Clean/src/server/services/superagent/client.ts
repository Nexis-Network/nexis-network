/**
 * Superagent Guardrails - Client
 * Domain: security
 * Responsibility: Initialize and manage Superagent SDK connection
 * Depends on: config, types
 */

import { loadSuperagentConfig, isSuperagentApiEnabled } from "./config";
import type {
  GuardRequest,
  GuardResult,
  VerifyRequest,
  VerifyResult,
  RedactRequest,
  RedactResult,
  GuardViolation,
  SeverityLevel,
} from "./types";
import { nanoid } from "nanoid";


import { logger } from '@/lib/logger';
// ============================================================================
// Client Configuration
// ============================================================================

const SUPERAGENT_BASE_URL = process.env.SUPERAGENT_BASE_URL ?? "https://api.superagent.sh";
const REQUEST_TIMEOUT_MS = 10_000;

const KNOWN_API_PREFIXES = ["/v1", "/api", ""] as const;
type ApiPrefix = (typeof KNOWN_API_PREFIXES)[number];
let resolvedApiPrefix: ApiPrefix | null = null;

type SuperagentClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
};

class SuperagentHttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(status: number, url: string, message: string) {
    super(`Superagent API error (${status}) at ${url}: ${message}`);
    this.name = "SuperagentHttpError";
    this.status = status;
    this.url = url;
  }
}

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * Determines if an error is a network-related error that should be silently ignored.
 * These errors are expected when the Superagent service is unavailable.
 */
const isExpectedNetworkError = (error: UntypedJson): boolean => {
  if (!(error instanceof Error)) return false;
  
  const errorMsg = error.message;
  const causeMsg = error.cause instanceof Error ? error.cause.message : "";
  const errorName = error.name;
  
  // Check for common network error patterns
  const networkPatterns = [
    "fetch failed",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ECONNRESET",
    "network error",
    "aborted",
  ];
  
  return networkPatterns.some(pattern => 
    errorMsg.includes(pattern) || 
    causeMsg.includes(pattern) ||
    errorName === "AbortError"
  );
};

const normalizeEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const stripKnownPrefix = (path: string): string => {
  for (const prefix of KNOWN_API_PREFIXES) {
    if (!prefix) continue;
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) {
      return path.slice(prefix.length);
    }
  }
  return path;
};

const applyPrefix = (path: string, prefix: ApiPrefix): string => {
  const normalized = normalizeEndpoint(path);
  if (!prefix) return normalized;
  return `${prefix}${normalized}`;
};

const buildEndpointCandidates = (endpoint: string): Array<{ endpoint: string; prefix: ApiPrefix }> => {
  const normalized = normalizeEndpoint(endpoint);
  const basePath = stripKnownPrefix(normalized);
  const prefixes = resolvedApiPrefix !== null ? [resolvedApiPrefix] : KNOWN_API_PREFIXES;
  const candidates: Array<{ endpoint: string; prefix: ApiPrefix }> = [];
  const seen = new Set<string>();

  for (const prefix of prefixes) {
    const candidate = applyPrefix(basePath, prefix);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      candidates.push({ endpoint: candidate, prefix });
    }
  }

  return candidates;
};

const dedupeEndpointPrefix = (basePath: string, endpointPath: string): string => {
  const normalizedBase = basePath.endsWith("/") && basePath !== "/" ? basePath.slice(0, -1) : basePath;
  for (const prefix of ["/v1", "/api"]) {
    if (normalizedBase.endsWith(prefix) && endpointPath.startsWith(`${prefix}/`)) {
      return endpointPath.slice(prefix.length);
    }
  }
  return endpointPath;
};

const buildRequestUrl = (baseUrl: string, endpoint: string): string => {
  const url = new URL(baseUrl);
  const basePath = url.pathname.endsWith("/") && url.pathname !== "/" ? url.pathname.slice(0, -1) : url.pathname;
  const endpointPath = normalizeEndpoint(endpoint);
  const adjustedEndpoint = dedupeEndpointPrefix(basePath, endpointPath);
  const finalPath = basePath && basePath !== "/" ? `${basePath}${adjustedEndpoint}` : adjustedEndpoint;
  return `${url.origin}${finalPath}`;
};

const summarizeErrorText = (text: string): string => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "Empty error response";
  const withoutTags = compact.includes("<") ? compact.replace(/<[^>]+>/g, "").trim() : compact;
  return withoutTags.length > 200 ? `${withoutTags.slice(0, 200)}...` : withoutTags;
};

class SuperagentClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: SuperagentClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? SUPERAGENT_BASE_URL;
    this.timeout = options.timeout ?? REQUEST_TIMEOUT_MS;
  }

  private async performRequest<T>(endpoint: string, body: UntypedJson): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Request timeout"), this.timeout);
    const url = buildRequestUrl(this.baseUrl, endpoint);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-Request-ID": nanoid(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const summary = summarizeErrorText(errorText) || response.statusText || "Unknown error";
        throw new SuperagentHttpError(response.status, url, summary);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async request<T>(
    endpoint: string,
    body: UntypedJson,
  ): Promise<T> {
    const candidates = buildEndpointCandidates(endpoint);
    let lastError: UntypedJson;

    for (const candidate of candidates) {
      try {
        const result = await this.performRequest<T>(candidate.endpoint, body);
        resolvedApiPrefix = candidate.prefix;
        return result;
      } catch (error) {
        if (error instanceof SuperagentHttpError && (error.status === 404 || error.status === 405)) {
          lastError = error;
          if (resolvedApiPrefix !== null && candidates.length > 1) {
            resolvedApiPrefix = null;
          }
          continue;
        }
        throw error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error("Superagent request failed after trying all endpoint variants.");
  }

  async guard(request: GuardRequest): Promise<GuardResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.request<GuardResult>("/v1/guard", {
        input: request.input,
        action: request.action ?? "user_prompt",
        tool_name: request.toolName,
        attachments: request.attachments,
        metadata: request.metadata,
      });

      return {
        ...result,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Fail open - only log unexpected errors (not network issues)
      if (!isExpectedNetworkError(error)) {
        logger.warn("[Superagent] Guard request failed:", error instanceof Error ? error.message : String(error));
      }
      return {
        blocked: false,
        violations: [],
        reasoning: "Guard check skipped due to API error",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async verify(request: VerifyRequest): Promise<VerifyResult> {
    const startTime = Date.now();
    
    try {
      const output = typeof request.output === "string"
        ? request.output
        : JSON.stringify(request.output);

      const result = await this.request<VerifyResult>("/v1/verify", {
        output,
        tool_name: request.toolName,
        action: request.action ?? "model_output",
        context: request.context,
        metadata: request.metadata,
      });

      return {
        ...result,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Fail open - only log unexpected errors
      if (!isExpectedNetworkError(error)) {
        logger.warn("[Superagent] Verify request failed:", error instanceof Error ? error.message : String(error));
      }
      return {
        flagged: false,
        violations: [],
        reasoning: "Verify check skipped due to API error",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async redact(request: RedactRequest): Promise<RedactResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.request<RedactResult>("/v1/redact", {
        text: request.text,
        types: request.types ?? ["PII", "PHI", "API_KEYS", "CREDENTIALS"],
        preserve_format: request.preserveFormat ?? true,
        metadata: request.metadata,
      });

      return {
        ...result,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Fail open - only log unexpected errors
      if (!isExpectedNetworkError(error)) {
        logger.warn("[Superagent] Redact request failed:", error instanceof Error ? error.message : String(error));
      }
      // Return original text if redaction fails
      return {
        redacted: request.text,
        redactions: [],
        redactionCount: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: SuperagentClient | null = null;

const getClient = (): SuperagentClient | null => {
  // Only create client if remote API is available (API key set)
  // Otherwise, functions will fall back to local detection
  if (!isSuperagentApiEnabled()) {
    return null;
  }

  if (!clientInstance) {
    const config = loadSuperagentConfig();
    clientInstance = new SuperagentClient({
      apiKey: config.apiKey,
      baseUrl: SUPERAGENT_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  return clientInstance;
};

export const clearClientInstance = (): void => {
  clientInstance = null;
  resolvedApiPrefix = null;
};

// ============================================================================
// Fallback Local Detection (when API unavailable)
// ============================================================================

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts?|rules?)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts?|rules?)/i,
  /you\s+are\s+now\s+(in\s+)?(\w+)\s+mode/i,
  /roleplay\s+as\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+)?/i,
  /bypass\s+(your\s+)?(safety|security|restrictions?|filters?)/i,
  /override\s+(your\s+)?(safety|security|restrictions?|filters?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+(enabled|activated)/i,
  /\[system\]/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<<SYS>>/i,
];

const SECRET_PATTERNS = [
  /sk[-_][a-zA-Z0-9]{20,}/g,
  /pk[-_][a-zA-Z0-9]{20,}/g,
  /api[-_]?key[-_]?[=:]\s*["']?[a-zA-Z0-9]{20,}/gi,
  /bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g,
];

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, // Credit card
];

const localDetectPromptInjection = (input: string): GuardViolation[] => {
  const violations: GuardViolation[] = [];
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      violations.push({
        id: nanoid(),
        type: "prompt_injection",
        cweCode: "CWE-77",
        severity: "high" as SeverityLevel,
        message: "Potential prompt injection detected",
        confidence: 0.8,
        evidence: match[0],
      });
    }
  }
  
  return violations;
};

const localDetectSecrets = (input: string): GuardViolation[] => {
  const violations: GuardViolation[] = [];
  
  for (const pattern of SECRET_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      for (const match of matches) {
        violations.push({
          id: nanoid(),
          type: "secret_detected",
          cweCode: "CWE-522",
          severity: "high" as SeverityLevel,
          message: "API key or secret detected in input",
          confidence: 0.9,
          evidence: `${match.slice(0, 10)}...`,
        });
      }
    }
  }
  
  return violations;
};

const localDetectPII = (input: string): GuardViolation[] => {
  const violations: GuardViolation[] = [];
  
  for (const pattern of PII_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      violations.push({
        id: nanoid(),
        type: "pii_detected",
        cweCode: "CWE-359",
        severity: "medium" as SeverityLevel,
        message: "Potential PII detected in input",
        confidence: 0.7,
        evidence: "[REDACTED]",
      });
    }
  }
  
  return violations;
};

const localRedact = (text: string): RedactResult => {
  let redacted = text;
  const redactions: RedactResult["redactions"] = [];
  
  // Redact secrets
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (_match) => {
      redactions.push({
        type: "SECRET",
        replacement: "[REDACTED_SECRET]",
      });
      return "[REDACTED_SECRET]";
    });
  }
  
  // Redact PII
  for (const pattern of PII_PATTERNS) {
    redacted = redacted.replace(pattern, (_match) => {
      redactions.push({
        type: "PII",
        replacement: "[REDACTED_PII]",
      });
      return "[REDACTED_PII]";
    });
  }
  
  return {
    redacted,
    redactions,
    redactionCount: redactions.length,
  };
};

// ============================================================================
// Exported Guard Functions
// ============================================================================

export const guard = async (request: GuardRequest): Promise<GuardResult> => {
  const client = getClient();
  
  if (client) {
    return client.guard(request);
  }
  
  // Fallback to local detection
  const startTime = Date.now();
  const violations: GuardViolation[] = [
    ...localDetectPromptInjection(request.input),
    ...localDetectSecrets(request.input),
  ];
  
  return {
    blocked: violations.some((v) => v.severity === "critical" || v.severity === "high"),
    violations,
    reasoning: violations.length > 0 ? "Local detection found potential issues" : undefined,
    processingTimeMs: Date.now() - startTime,
  };
};

export const verify = async (request: VerifyRequest): Promise<VerifyResult> => {
  const client = getClient();
  
  if (client) {
    return client.verify(request);
  }
  
  // Fallback to local detection
  const startTime = Date.now();
  const output = typeof request.output === "string" ? request.output : JSON.stringify(request.output);
  const violations: GuardViolation[] = [
    ...localDetectSecrets(output),
    ...localDetectPII(output),
  ];
  
  return {
    flagged: violations.length > 0,
    violations,
    reasoning: violations.length > 0 ? "Local detection found potential issues in output" : undefined,
    processingTimeMs: Date.now() - startTime,
  };
};

export const redact = async (request: RedactRequest): Promise<RedactResult> => {
  const client = getClient();
  
  if (client) {
    return client.redact(request);
  }
  
  // Fallback to local redaction
  const startTime = Date.now();
  const result = localRedact(request.text);
  
  return {
    ...result,
    processingTimeMs: Date.now() - startTime,
  };
};
