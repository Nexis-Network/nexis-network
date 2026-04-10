import {
  getAutonomousActionPreferences,
  getUserAgentSettings,
} from "@/lib/approvals/state-machine";
import {
  DEFAULT_AUTOMATION_STATE,
  normalizeAutomationState,
  type AutomationState,
} from "./automation-preferences";
import { isSyntheticNonProductionTestUserId } from "./test-mode-auth";

import { logger } from "@/lib/logger";
type ResolveAutomationStateArgs = {
  explicit?: Partial<Record<string, UntypedJson>> | null;
  userId?: string | null;
};

export async function resolveAutomationState({
  explicit,
  userId,
}: ResolveAutomationStateArgs): Promise<AutomationState> {
  if (explicit && Object.keys(explicit).length > 0) {
    return normalizeAutomationState(explicit);
  }

  if (!userId) {
    return { ...DEFAULT_AUTOMATION_STATE };
  }

  if (isSyntheticNonProductionTestUserId(userId)) {
    return { ...DEFAULT_AUTOMATION_STATE };
  }

  try {
    const settings = await getUserAgentSettings(userId);
    return getAutonomousActionPreferences(settings);
  } catch (error) {
    logger.error("[automation] Failed to resolve automation state", error);
    return { ...DEFAULT_AUTOMATION_STATE };
  }
}
