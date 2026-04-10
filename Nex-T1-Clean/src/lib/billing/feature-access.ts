import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import type { CreditTier } from "@/server/services/credits/credit-service";

const PAID_PLANS = new Set<CreditTier>([
  "pro",
  "trader",
  "ultra",
  "enterprise",
]);

const TERMINAL_TOOL_IDS = new Set(["e2b_npm_install", "e2b_npm_run"]);
const CODE_INTERPRETER_TOOL_IDS = new Set([
  "e2b_code_interpreter",
  "openai_code_interpreter",
]);

export function normalizeCreditTier(
  value: string | null | undefined,
): CreditTier {
  const normalized = (value ?? "").trim().toLowerCase();
  if (
    normalized === "pro" ||
    normalized === "trader" ||
    normalized === "ultra" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }
  return "free";
}

export function hasPaidFeatureAccess(
  plan: string | null | undefined,
): boolean {
  return PAID_PLANS.has(normalizeCreditTier(plan));
}

export function canUseSandboxFeatures(
  plan: string | null | undefined,
): boolean {
  return hasPaidFeatureAccess(plan);
}

export function canUseMevProtection(
  plan: string | null | undefined,
): boolean {
  return hasPaidFeatureAccess(plan);
}

export function isTerminalToolId(toolId: string): boolean {
  return TERMINAL_TOOL_IDS.has(toolId);
}

export function isCodeInterpreterToolId(toolId: string): boolean {
  return CODE_INTERPRETER_TOOL_IDS.has(toolId);
}

export function isSandboxToolId(toolId: string): boolean {
  return toolId.startsWith("e2b_") || isCodeInterpreterToolId(toolId);
}

export function isPlanRestrictedToolId(toolId: string): boolean {
  return isSandboxToolId(toolId);
}

export function filterPlanRestrictedToolIds(
  toolIds: readonly string[],
  plan: string | null | undefined,
): string[] {
  if (canUseSandboxFeatures(plan)) {
    return [...toolIds];
  }

  return toolIds.filter((toolId) => !isPlanRestrictedToolId(toolId));
}

export function sanitizeExecutionPreferencesForPlan(
  preferences: ChatExecutionPreferences | null | undefined,
  plan: string | null | undefined,
): ChatExecutionPreferences | undefined {
  if (!preferences) {
    return preferences ?? undefined;
  }

  if (canUseMevProtection(plan)) {
    return preferences;
  }

  if (!preferences.mevProtection) {
    return preferences;
  }

  return {
    ...preferences,
    mevProtection: false,
  };
}
