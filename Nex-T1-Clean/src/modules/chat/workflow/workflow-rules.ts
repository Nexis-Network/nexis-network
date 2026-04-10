/**
 * Configurable workflow rules that specify prerequisite relationships
 * for tool execution. Consumed by the step gate and prerequisite gate
 * to enforce deterministic workflow ordering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowPhase =
  | "planning"
  | "research"
  | "execution"
  | "verification"
  | "completion";

export interface WorkflowRule {
  /** Unique identifier for this rule. */
  id: string;

  /** The workflow phase this rule applies to. */
  phase: WorkflowPhase;

  /**
   * Tool names or verification-step IDs that must have completed
   * before the gated tools are allowed to execute.
   */
  requiredPrerequisites: string[];

  /** Tools that are blocked until every prerequisite is satisfied. */
  gatedTools: string[];

  /** Human-readable explanation of the rule. */
  description: string;

  /**
   * Optional runtime predicate. When provided the rule only applies if
   * `conditionFn` returns `true` for the current execution context.
   */
  conditionFn?: () => boolean;
}

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

/**
 * Returns `true` when workflow gates are enabled via the
 * `NEX_WORKFLOW_GATES_ENABLED` environment variable.
 *
 * Any truthy-looking value (`"true"`, `"1"`, `"yes"`) enables the gates;
 * everything else (including the variable being unset) keeps them disabled.
 */
export function isWorkflowGatesEnabled(): boolean {
  const raw = process.env.NEX_WORKFLOW_GATES_ENABLED ?? "";
  return ["true", "1", "yes"].includes(raw.toLowerCase());
}

// ---------------------------------------------------------------------------
// Default rules
// ---------------------------------------------------------------------------

const FINANCIAL_EXECUTION_TOOLS = [
  "evm_wallet_send_asset",
  "pumpfun_trader",
  "helius_solana",
  "cdp_wallet",
  "token_minter",
  "bitcoin_network",
] as const;

export const DEFAULT_WORKFLOW_RULES: WorkflowRule[] = [
  {
    id: "orchestrator-before-worker",
    phase: "planning",
    requiredPrerequisites: ["orchestrator"],
    gatedTools: ["worker"],
    description:
      "The orchestrator tool must complete before a worker can be called.",
  },
  {
    id: "coordinator-start-after-plan",
    phase: "planning",
    requiredPrerequisites: ["orchestrator"],
    gatedTools: ["coordinator:start"],
    description:
      'The coordinator "start" action must follow a completed orchestrator invocation.',
  },
  {
    id: "financial-requires-verification",
    phase: "execution",
    requiredPrerequisites: ["verification:price_check", "verification:simulation"],
    gatedTools: [...FINANCIAL_EXECUTION_TOOLS],
    description:
      "Financial execution tools require a completed verification receipt " +
      'for "price_check" OR "simulation" on the active task.',
  },
  {
    id: "completion-requires-resolution",
    phase: "completion",
    requiredPrerequisites: ["blocker_graph:resolved"],
    gatedTools: ["coordinator:complete"],
    description:
      'The coordinator "complete" action cannot be called while the ' +
      "blockerGraph has unresolved blockers.",
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Return every rule that belongs to the given phase.
 * When `phase` is omitted all rules are returned.
 */
export function getApplicableRules(
  phase?: WorkflowPhase,
): WorkflowRule[] {
  if (phase === undefined) {
    return DEFAULT_WORKFLOW_RULES;
  }
  return DEFAULT_WORKFLOW_RULES.filter((rule) => rule.phase === phase);
}

/**
 * Returns the first rule whose `gatedTools` list contains `toolName`,
 * or `null` if no rule gates the tool.
 */
export function isToolGatedByRule(
  toolName: string,
  rules: WorkflowRule[],
): WorkflowRule | null {
  for (const rule of rules) {
    if (rule.gatedTools.includes(toolName)) {
      return rule;
    }
  }
  return null;
}
