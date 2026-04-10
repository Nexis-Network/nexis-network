/**
 * Pure function that computes the set of legal tools for a given step
 * based on workflow state from the ContextEnvelope.
 *
 * Consumed by `prepareStep` in ToolLoopAgent to dynamically restrict
 * `activeTools`.
 */

import type { ContextEnvelope } from "@/modules/chat/context-envelope";

import {
  type WorkflowRule,
  DEFAULT_WORKFLOW_RULES,
  isWorkflowGatesEnabled,
} from "./workflow-rules";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type StepGateResult = {
  /** Tool IDs that are allowed for this step. `undefined` means all tools allowed. */
  activeTools: string[] | undefined;
  /** Map of toolName -> reason for each blocked tool. */
  blockedTools: Map<string, string>;
  /** Map of toolName -> set of blocked sub-commands (e.g. "coordinator" -> {"start", "complete"}). */
  blockedSubCommands: Map<string, Set<string>>;
  /** Current workflow phase label derived from the step index. */
  currentPhase: string;
  /** A specific tool that must be called next, or `null` if unconstrained. */
  requiredNext: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function derivePhase(stepIndex: number): string {
  if (stepIndex === 0) return "planning";
  if (stepIndex <= 2) return "research";
  return "execution";
}

/**
 * Returns `true` when a verification-type prerequisite is satisfied.
 *
 * Verification prerequisites follow the form `"verification:<name>"`.
 * They are satisfied when any `verificationReceipts` entry for the
 * `activeTaskId` includes the `<name>` in its `completed` list.
 */
function isVerificationPrerequisiteMet(
  prerequisite: string,
  activeTaskId: string | null,
  verificationReceipts: ReadonlyArray<{ taskId: string; completed: string[] }>,
): boolean {
  const name = prerequisite.replace(/^verification:/, "");
  if (!activeTaskId) return false;

  return verificationReceipts.some(
    (receipt) =>
      receipt.taskId === activeTaskId && receipt.completed.includes(name),
  );
}

/**
 * Returns `true` when a tool-type prerequisite is satisfied.
 *
 * Tool-type prerequisites (e.g. `"orchestrator"`) are satisfied when
 * the blocker graph shows no unresolved blockers for that tool.
 *
 * Special case: `"blocker_graph:resolved"` is satisfied when **all**
 * entries in the blocker graph have empty `blockedBy` arrays.
 */
function isToolPrerequisiteMet(
  prerequisite: string,
  blockerGraph: ReadonlyArray<{ taskId: string; blockedBy: string[] }>,
): boolean {
  if (prerequisite === "blocker_graph:resolved") {
    return blockerGraph.every((entry) => entry.blockedBy.length === 0);
  }

  // A tool prerequisite is met when there is no blocker-graph entry for
  // the tool that still has unresolved blockers.
  const entry = blockerGraph.find((e) => e.taskId === prerequisite);
  if (!entry) {
    // No entry in the graph means the tool has either completed or was
    // never registered — treat as met so it does not block downstream.
    return true;
  }
  return entry.blockedBy.length === 0;
}

function arePrerequisitesMet(
  rule: WorkflowRule,
  activeTaskId: string | null,
  blockerGraph: ReadonlyArray<{ taskId: string; blockedBy: string[] }>,
  verificationReceipts: ReadonlyArray<{ taskId: string; completed: string[] }>,
): boolean {
  return rule.requiredPrerequisites.every((prereq) => {
    if (prereq.startsWith("verification:")) {
      return isVerificationPrerequisiteMet(
        prereq,
        activeTaskId,
        verificationReceipts,
      );
    }
    return isToolPrerequisiteMet(prereq, blockerGraph);
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Computes the set of legal tools for a given step.
 *
 * This function is **pure** — it has no side effects and does not perform
 * any async operations.
 *
 * @param envelope  The current context envelope containing workflow state.
 * @param allToolIds  Every tool ID known to the system.
 * @param stepIndex  Zero-based index of the current step in the tool loop.
 * @returns A `StepGateResult` describing which tools are active or blocked.
 */
export function computeStepGate(
  envelope: ContextEnvelope,
  allToolIds: string[],
  stepIndex: number,
): StepGateResult {
  // Fast-path: gates disabled — everything is allowed.
  if (!isWorkflowGatesEnabled()) {
    return {
      activeTools: undefined,
      blockedTools: new Map(),
      blockedSubCommands: new Map(),
      currentPhase: "unrestricted",
      requiredNext: null,
    };
  }

  const { blockerGraph, verificationReceipts, activeTaskId } = envelope.memory;
  const blockedTools = new Map<string, string>();
  const blockedSubCommands = new Map<string, Set<string>>();

  // Evaluate each rule against the current workflow state.
  for (const rule of DEFAULT_WORKFLOW_RULES) {
    // Skip rules that have an unsatisfied runtime condition.
    if (rule.conditionFn && !rule.conditionFn()) {
      continue;
    }

    const met = arePrerequisitesMet(
      rule,
      activeTaskId,
      blockerGraph,
      verificationReceipts,
    );

    if (!met) {
      for (const gatedTool of rule.gatedTools) {
        if (gatedTool.includes(":")) {
          // Sub-command gated tool, e.g. "coordinator:start"
          const [baseTool, subCommand] = gatedTool.split(":", 2);
          const existing = blockedSubCommands.get(baseTool);
          if (existing) {
            existing.add(subCommand);
          } else {
            blockedSubCommands.set(baseTool, new Set([subCommand]));
          }
        } else {
          blockedTools.set(gatedTool, rule.description);
        }
      }
    }
  }

  // Compute active tools by excluding blocked ones.
  const activeTools = allToolIds.filter((id) => !blockedTools.has(id));

  // Determine phase from step index.
  const currentPhase = derivePhase(stepIndex);

  // Determine if a specific next tool is required.
  // A rule mandates a specific next tool when it has exactly one gated tool
  // and that tool is the *only* unblocked tool with unmet prerequisites
  // that still needs to run. In practice we surface the first rule whose
  // prerequisites are met and whose gated tools are all currently blocked
  // — indicating the gated tool should be the next action.
  let requiredNext: string | null = null;

  for (const rule of DEFAULT_WORKFLOW_RULES) {
    if (rule.conditionFn && !rule.conditionFn()) continue;

    const met = arePrerequisitesMet(
      rule,
      activeTaskId,
      blockerGraph,
      verificationReceipts,
    );

    // If prerequisites are met and the rule gates exactly one tool that
    // is still in the active set, mandate it as the next required tool.
    if (met && rule.gatedTools.length === 1) {
      const candidate = rule.gatedTools[0];
      // For sub-command candidates like "coordinator:start", check the
      // base tool name against the active set.
      const baseCandidate = candidate.includes(":")
        ? candidate.split(":", 2)[0]
        : candidate;
      if (activeTools.includes(baseCandidate)) {
        requiredNext = candidate;
        break;
      }
    }
  }

  return {
    activeTools,
    blockedTools,
    blockedSubCommands,
    currentPhase,
    requiredNext,
  };
}
