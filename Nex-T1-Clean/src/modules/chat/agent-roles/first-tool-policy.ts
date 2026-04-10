import type { AgentRole } from "./tool-access-map";

export type FirstToolPolicy = {
  requiredFirstTool: string;
  reason: string;
  applicableRoles: AgentRole[];
};

/**
 * Policies that restrict the first tool call for specific agent roles.
 * When a policy applies, the first step must invoke the required tool.
 */
export const FIRST_TOOL_POLICIES: readonly FirstToolPolicy[] = [
  // Wallet operators must verify wallet connection before any operation
  // (disabled by default — uncomment and configure as needed)
];

/**
 * Returns the list of tool IDs allowed on step 0 for the given role,
 * or undefined if no restriction applies.
 */
export function getFirstToolRestriction(
  role: AgentRole,
  stepNumber: number,
): string[] | undefined {
  if (stepNumber !== 0) return undefined;

  const policy = FIRST_TOOL_POLICIES.find((p) =>
    p.applicableRoles.includes(role),
  );

  return policy ? [policy.requiredFirstTool] : undefined;
}
