import "server-only";

import { captureHandledException } from "@/lib/observability/sentry";
import { logger } from "@/lib/logger";

import type { Mem0Config } from "./mem0-client.types";

const DEFAULT_MEM0_BASE_URL = "https://api.mem0.ai";
const MEM0_FEATURE_ENABLED =
  (process.env.ENABLE_MEM0_PERSONALIZATION ?? "true").toLowerCase() ===
  "true";

export const MEM0_REQUEST_TIMEOUT_MS = (() => {
  const raw = Number(process.env.MEM0_REQUEST_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 8_000;
})();

const MEM0_CIRCUIT_TIMEOUT_MS = 5 * 60 * 1000;

export const CUSTOM_INSTRUCTIONS = `
You are managing long-term user preferences for the Nex-T1 crypto assistant.

Store only CONFIRMED user preferences that are explicitly stated, including:
- Trading preferences (conservative, moderate, aggressive) with specific details.
- Preferred chains (Ethereum, Arbitrum, Base, Solana, etc.).
- Favorite protocols (Uniswap, Aave, Compound, etc.).
- Risk tolerance with concrete amounts or constraints.
- Communication style preferences (concise, detailed, tone).

Do NOT store:
- Speculative statements that contain phrases such as "I think", "maybe", "might", or "unsure".
- Any secrets or credentials: private keys, seed phrases, wallet mnemonics, API keys, passwords.
- Transaction hashes, wallet balances, or low-level transaction details unless the user explicitly requests persistent tracking.
- Sensitive PII unrelated to crypto preferences.

General rules:
- Require the user to speak in the first person when describing preferences; otherwise ignore.
- If confidence in the statement is below 0.7 (70%), do not store it.
- Normalize chain and protocol names (e.g., "arb" -> "Arbitrum").
- Preserve the latest confirmed preference and update existing memories when the user provides new explicit guidance.

Respond with JSON when filtering, using { "store": true|false, "reason": "<reason>" } if supported.
`.trim();

let cachedMem0Config: Mem0Config | null = null;
let mem0ConfigResolved = false;
let mem0MissingConfigLogged = false;
let mem0DisabledUntil = 0;
let mem0DisabledReason: string | null = null;
let mem0PermanentlyDisabled = false;

if (!MEM0_FEATURE_ENABLED) {
  logger.warn(
    "[mem0] Personalization disabled via ENABLE_MEM0_PERSONALIZATION flag.",
  );
}

function isCircuitOpen(): boolean {
  return mem0DisabledUntil > Date.now();
}

function notifyMem0Recovery(): void {
  if (!mem0DisabledReason || isCircuitOpen()) {
    return;
  }

  const reason = mem0DisabledReason;
  mem0DisabledReason = null;
  logger.info(`[mem0] Circuit re-enabled after: ${reason}`);
  captureHandledException(new Error("mem0_circuit_recovered"), {
    tags: { component: "mem0" },
    extra: { reason },
  });
}

export function openMem0Circuit(
  reason: string,
  options?: { permanent?: boolean },
): void {
  if (options?.permanent) {
    mem0PermanentlyDisabled = true;
    mem0DisabledUntil = Number.MAX_SAFE_INTEGER;
  } else {
    mem0DisabledUntil = Date.now() + MEM0_CIRCUIT_TIMEOUT_MS;
  }

  mem0DisabledReason = reason;
  const durationSeconds = options?.permanent
    ? Infinity
    : Math.round(MEM0_CIRCUIT_TIMEOUT_MS / 1000);
  const message = options?.permanent
    ? `[mem0] Disabled due to authentication failure: ${reason}`
    : `[mem0] Disabled for ${durationSeconds}s: ${reason}`;

  logger.error(message);
  captureHandledException(
    new Error(options?.permanent ? "mem0_circuit_permanent" : "mem0_circuit_open"),
    {
      tags: { component: "mem0" },
      extra: { reason, durationSeconds },
    },
  );
}

export function getMem0Config(): Mem0Config | null {
  if (!MEM0_FEATURE_ENABLED) {
    return null;
  }

  if (!mem0ConfigResolved) {
    mem0ConfigResolved = true;
    const apiKey = process.env.MEM0_API_KEY?.trim();

    if (!apiKey) {
      if (!mem0MissingConfigLogged) {
        logger.warn(
          "[mem0] MEM0_API_KEY not configured. Memory features will be disabled.",
        );
        mem0MissingConfigLogged = true;
      }
      cachedMem0Config = null;
    } else {
      cachedMem0Config = {
        apiKey,
        projectId: process.env.MEM0_PROJECT_ID?.trim() ?? null,
        baseUrl: (process.env.MEM0_BASE_URL || DEFAULT_MEM0_BASE_URL).replace(
          /\/$/,
          "",
        ),
      };
    }
  }

  if (!cachedMem0Config || mem0PermanentlyDisabled || isCircuitOpen()) {
    return null;
  }

  notifyMem0Recovery();
  return cachedMem0Config;
}

export function isMem0Configured(): boolean {
  return Boolean(getMem0Config());
}

export function assertMem0Available(): Mem0Config {
  const config = getMem0Config();
  if (!config) {
    throw new Error("[mem0] Personalization disabled or not configured.");
  }

  return config;
}

export function getMem0ErrorStatus(error: unknown): number | null {
  if (error instanceof Mem0ApiError) {
    return error.status;
  }

  if (error && typeof error === "object" && "status" in error) {
    return Number((error as Record<string, UntypedJson>).status);
  }

  return null;
}

export class Mem0ApiError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly endpoint: string,
    readonly body?: string | null,
  ) {
    super(`mem0 API error (${status}) via ${method} ${endpoint}: ${body ?? ""}`);
    this.name = "Mem0ApiError";
  }
}
