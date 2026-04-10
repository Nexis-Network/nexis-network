import { tool } from "ai";
import { z } from "zod";

import type { WorkingTodo } from "@/modules/chat/state/working-memory-store";
import { synthesizeTaskResults } from "@/modules/chat/workflow/task-synthesizer";
import { isWorkflowGatesEnabled } from "@/modules/chat/workflow/workflow-rules";

/**
 * Coordinator Tool - Manages the overall orchestration process
 *
 * This tool coordinates between the orchestrator and workers, tracking progress,
 * managing dependencies, and providing status updates.
 */
export const coordinatorTool = tool({
  description:
    "MANDATORY tool for managing the orchestration process. Use 'start' after planning, 'check_progress' after every 2-3 worker tasks, 'resolve_blocker' when tasks fail, and 'complete' when all tasks are finished. Essential for tracking progress and managing dependencies.",
  inputSchema: z.object({
    planId: z.string().describe("Unique identifier for the orchestration plan"),
    action: z
      .enum([
        "start",
        "check_progress",
        "resolve_blocker",
        "escalate_error",
        "complete",
        "pause",
        "resume",
      ])
      .describe("Action to perform in the orchestration process"),
    context: z
      .string()
      .optional()
      .describe("Additional context for the action"),
    taskResults: z
      .array(
        z.object({
          taskId: z.string(),
          status: z.enum(["completed", "failed", "in_progress", "blocked"]),
          output: z.string().optional(),
        })
      )
      .optional()
      .describe("Results from completed tasks"),
    totalTasks: z.number().optional().describe("Total number of tasks in the plan"),
  }),
  async *execute({ planId: _planId, action, context, taskResults, totalTasks }) {
    yield { state: "loading" as const };

    let coordinationResult;

    switch (action) {
      case "start":
        coordinationResult = {
          status: "orchestration_started",
          message: "Orchestration process has been initiated",
          nextSteps: [
            "Review the implementation plan",
            "Assign tasks to appropriate workers",
            "Begin execution of high-priority tasks",
          ],
          currentPhase: "initialization",
          estimatedCompletion: "Variable based on complexity",
        };
        break;

      case "check_progress": {
        const completedTasks =
          taskResults?.filter((t) => t.status === "completed").length || 0;
        const total = totalTasks || (taskResults?.length || 1); 
        const progress = Math.round((completedTasks / total) * 100);

        coordinationResult = {
          status: "progress_checked",
          message: `Orchestration progress: ${progress}% complete (${completedTasks}/${total})`,
          progress: {
            completed: completedTasks,
            total: total,
            percentage: progress,
          },
          currentPhase:
            progress < 30
              ? "early_stage"
              : progress < 70
                ? "active_development"
                : "finalization",
          nextSteps:
            progress < 50
              ? ["Continue with high-priority tasks", "Monitor for blockers"]
              : [
                  "Focus on testing and quality assurance",
                  "Prepare for deployment",
                ],
          blockers:
            taskResults
              ?.filter((t) => t.status === "blocked")
              .map((t) => t.taskId) || [],
        };
        break;
      }

      case "resolve_blocker":
        coordinationResult = {
          status: "blocker_resolved",
          message: `Blockers have been addressed: ${context}`,
          resolution: {
            action: "Escalated to senior team members",
            timeline: "TBD",
            impact: "Assessed based on severity",
          },
          nextSteps: [
            "Resume blocked tasks",
            "Update timeline estimates",
            "Monitor for additional issues",
          ],
        };
        break;

      case "escalate_error": {
        const failedTasks = taskResults?.filter(t => t.status === "failed") || [];
        coordinationResult = {
          status: "error_escalated",
          message: `${failedTasks.length} task(s) failed and require escalation. ${context || ""}`.trim(),
          escalation: {
            failedTaskIds: failedTasks.map(t => t.taskId),
            failureDetails: failedTasks.map(t => ({
              taskId: t.taskId,
              output: t.output || "No output available",
            })),
            recommendedAction: failedTasks.length > 1
              ? "Multiple failures detected — consider escalating to human operator"
              : "Single failure — review error details and determine if retry or escalation is needed",
            canRetry: failedTasks.length <= 2,
          },
          nextSteps: [
            "Review failure details",
            "Determine if tasks can be retried",
            "Consider using escalate_to_human tool if failures are persistent",
            "Update workflow state with resolution",
          ],
        };
        break;
      }

      case "complete": {
        const completedCount = taskResults?.filter(t => t.status === "completed").length || 0;
        const failedCount = taskResults?.filter(t => t.status === "failed").length || 0;

        // When workflow gates are enabled and task results exist, synthesize them
        let synthesizedSummary: string | undefined;
        if (isWorkflowGatesEnabled() && taskResults) {
          const now = new Date().toISOString();
          const todos: WorkingTodo[] = taskResults.map((tr) => ({
            id: tr.taskId,
            title: tr.taskId,
            status: tr.status === "completed" ? ("completed" as const) : ("in_progress" as const),
            blocks: [],
            blockedBy: [],
            verification: [],
            completedVerification: [],
            nextActions: [],
            notes: tr.output,
            createdAt: now,
            updatedAt: now,
          }));
          const resultsMap = new Map<string, unknown>(
            taskResults.map((tr) => [tr.taskId, { output: tr.output }]),
          );
          const synthesis = synthesizeTaskResults(todos, resultsMap);
          synthesizedSummary = synthesis.summary;
        }

        coordinationResult = {
          status: "orchestration_completed",
          message: "All tasks have been successfully completed",
          summary: {
            totalTasks: totalTasks || completedCount,
            completedTasks: completedCount,
            failedTasks: failedCount,
            overallStatus: "completed" as const,
            qualityScore: 100,
            nextSteps: [
              "Conduct final review",
              "Deploy to production",
              "Monitor system performance",
            ],
            ...(synthesizedSummary ? { synthesizedSummary } : {}),
          },
          deliverables: [
            "Requirements analysis document",
            "System architecture diagrams",
            "Working application",
            "Comprehensive test suite",
            "Deployed production system",
            "Complete documentation",
          ],
        };
        break;
      }

      case "pause":
        coordinationResult = {
          status: "orchestration_paused",
          message: "Orchestration process has been paused",
          reason: context || "Manual pause requested",
          nextSteps: [
            "Save current progress",
            "Document current state",
            "Resume when ready",
          ],
        };
        break;

      case "resume":
        coordinationResult = {
          status: "orchestration_resumed",
          message: "Orchestration process has been resumed",
          nextSteps: [
            "Review current progress",
            "Continue with pending tasks",
            "Monitor for any issues",
          ],
        };
        break;

      default:
        coordinationResult = {
          status: "unknown_action",
          message: "Unknown action requested",
          nextSteps: ["Please specify a valid action"],
        };
    }

    yield { state: "ready" as const, coordination: coordinationResult };
  },
});

export type CoordinatorUIToolInvocation = {
  state:
    | "loading"
    | "ready"
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: {
    planId: string;
    action:
      | "start"
      | "check_progress"
      | "resolve_blocker"
      | "escalate_error"
      | "complete"
      | "pause"
      | "resume";
    context?: string;
    taskResults?: Array<{
      taskId: string;
      status: "completed" | "failed" | "in_progress" | "blocked";
      output?: string;
    }>;
  };
  output?: {
    state: "loading" | "ready";
    coordination?: {
      status: string;
      message: string;
      nextSteps?: string[];
      currentPhase?: string;
      estimatedCompletion?: string;
      progress?: {
        completed: number;
        total: number;
        percentage: number;
      };
      blockers?: string[];
      resolution?: {
        action: string;
        timeline: string;
        impact: string;
      };
      summary?: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        overallStatus: "in_progress" | "completed" | "failed" | "needs_review";
        qualityScore: number;
        nextSteps: string[];
        synthesizedSummary?: string;
      };
      deliverables?: string[];
      escalation?: {
        failedTaskIds: string[];
        failureDetails: Array<{ taskId: string; output: string }>;
        recommendedAction: string;
        canRetry: boolean;
      };
    };
  };
  errorText?: string;
};
