import type { Tool } from "ai";
import { getToolCategory } from "@/modules/chat/tool-approval-policy";
import {
  type AgentRole,
  ROLE_ALLOWED_CATEGORIES,
  isRoleScopingEnabled,
} from "./tool-access-map";

/**
 * Filters a tool record to include only tools whose category is allowed
 * for the given agent role.
 *
 * When role scoping is disabled, returns all tools unchanged.
 * The `general` role allows all categories.
 */
export function filterToolsForRole(
  tools: Record<string, Tool>,
  role: AgentRole,
  additionalAllowlist?: string[],
): Record<string, Tool> {
  if (!isRoleScopingEnabled() || role === "general") {
    return tools;
  }

  const allowed = ROLE_ALLOWED_CATEGORIES[role];
  const extraSet = additionalAllowlist
    ? new Set(additionalAllowlist)
    : new Set<string>();

  const filtered: Record<string, Tool> = {};
  for (const [name, tool] of Object.entries(tools)) {
    const category = getToolCategory(name);
    if (allowed.has(category) || extraSet.has(name)) {
      filtered[name] = tool;
    }
  }
  return filtered;
}

/**
 * Filters a list of tool IDs to include only those whose category is
 * allowed for the given agent role.
 */
export function filterToolIdsForRole(
  toolIds: string[],
  role: AgentRole,
  additionalAllowlist?: string[],
): string[] {
  if (!isRoleScopingEnabled() || role === "general") {
    return toolIds;
  }

  const allowed = ROLE_ALLOWED_CATEGORIES[role];
  const extraSet = additionalAllowlist
    ? new Set(additionalAllowlist)
    : new Set<string>();

  return toolIds.filter((id) => {
    const category = getToolCategory(id);
    return allowed.has(category) || extraSet.has(id);
  });
}
