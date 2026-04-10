/**
 * Hook Configuration Validation
 *
 * Validates and sanitizes hook commands and matchers from raw config input.
 * Parses raw JSON into typed HooksConfig.
 */

import type { HooksConfig, HookEvent, HookMatcher, HookCommand } from "./types";
import { HOOK_EVENTS } from "./types";

/** Minimum allowed timeout in seconds for a hook. */
const MIN_HOOK_TIMEOUT_S = 1;

/** Maximum allowed timeout in seconds for a hook. */
const MAX_HOOK_TIMEOUT_S = 300;

function isValidHookEvent(event: string): event is HookEvent {
  return (HOOK_EVENTS as readonly string[]).includes(event);
}

/**
 * Validates and sanitizes a single hook command from raw config input.
 * Returns null if the hook is invalid.
 */
export function validateHookCommand(raw: unknown): HookCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const type = obj.type;
  if (typeof type !== "string") return null;
  if (!["command", "http", "prompt"].includes(type)) return null;

  // Validate type-specific required fields
  if (type === "command") {
    if (typeof obj.command !== "string" || obj.command.trim().length === 0) return null;
  }
  if (type === "http") {
    if (typeof obj.url !== "string") return null;
    // Validate URL is well-formed and uses http(s)
    try {
      const parsed = new URL(obj.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    } catch {
      return null;
    }
  }
  if (type === "prompt") {
    if (typeof obj.prompt !== "string" || obj.prompt.trim().length === 0) return null;
  }

  // Validate optional shared fields
  const timeout = obj.timeout;
  if (timeout !== undefined) {
    if (typeof timeout !== "number" || !Number.isFinite(timeout)) return null;
    if (timeout < MIN_HOOK_TIMEOUT_S || timeout > MAX_HOOK_TIMEOUT_S) return null;
  }

  const once = obj.once;
  if (once !== undefined && typeof once !== "boolean") return null;

  const statusMessage = obj.statusMessage;
  if (statusMessage !== undefined && typeof statusMessage !== "string") return null;

  const ifCondition = obj.if;
  if (ifCondition !== undefined && typeof ifCondition !== "string") return null;

  // Validate http-specific headers
  if (type === "http" && obj.headers !== undefined) {
    if (typeof obj.headers !== "object" || obj.headers === null || Array.isArray(obj.headers)) {
      return null;
    }
    const headers = obj.headers as Record<string, unknown>;
    for (const value of Object.values(headers)) {
      if (typeof value !== "string") return null;
    }
  }

  // Build the validated hook command
  const base: {
    statusMessage?: string;
    timeout?: number;
    once?: boolean;
    if?: string;
  } = {};

  if (typeof statusMessage === "string") base.statusMessage = statusMessage;
  if (typeof timeout === "number") base.timeout = timeout;
  if (typeof once === "boolean") base.once = once;
  if (typeof ifCondition === "string") base.if = ifCondition;

  switch (type) {
    case "command":
      return { ...base, type: "command", command: (obj.command as string).trim() };
    case "http": {
      const result: HookCommand = { ...base, type: "http", url: obj.url as string };
      if (obj.headers !== undefined) {
        (result as { headers: Record<string, string> }).headers = obj.headers as Record<string, string>;
      }
      return result;
    }
    case "prompt": {
      const result: HookCommand = { ...base, type: "prompt", prompt: obj.prompt as string };
      if (typeof obj.model === "string") {
        (result as { model: string }).model = obj.model;
      }
      return result;
    }
    default:
      return null;
  }
}

export function validateHookMatcher(raw: unknown): HookMatcher | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const hooks = obj.hooks;
  if (!Array.isArray(hooks) || hooks.length === 0) return null;

  const validHooks: HookCommand[] = [];
  for (const h of hooks) {
    const validated = validateHookCommand(h);
    if (validated !== null) {
      validHooks.push(validated);
    }
  }

  if (validHooks.length === 0) return null;

  return {
    matcher: typeof obj.matcher === "string" ? obj.matcher : undefined,
    hooks: validHooks,
  };
}

export function parseHooksConfig(raw: unknown): HooksConfig {
  if (!raw || typeof raw !== "object") return {};

  const result: HooksConfig = {};
  const obj = raw as Record<string, unknown>;

  for (const [event, matchers] of Object.entries(obj)) {
    if (!isValidHookEvent(event)) continue;
    if (!Array.isArray(matchers)) continue;

    const validMatchers = matchers
      .map(validateHookMatcher)
      .filter((m): m is HookMatcher => m !== null);

    if (validMatchers.length > 0) {
      result[event] = validMatchers;
    }
  }

  return result;
}
