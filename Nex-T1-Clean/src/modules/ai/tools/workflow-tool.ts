import { createTool, createToolSchema, stringProp, integerProp } from "./create-tool";
import {
  researchAgentWorkflow,
  WORKFLOW_POSTGRES_RUNTIME_STATUS,
} from "@/lib/workflow/definitions";
import { workflowClient } from "@/lib/workflow/client";

interface WorkflowToolInput {
  topic: string;
  depth?: number;
}

interface WorkflowToolOutput {
  success: boolean;
  runId?: string;
  workflowId?: string;
  runtimeStatus?: typeof WORKFLOW_POSTGRES_RUNTIME_STATUS;
  message?: string;
  error?: string;
}

const workflowToolSchema = createToolSchema({
  topic: stringProp("The research topic or task description"),
  depth: integerProp("The depth of research (1-3)", {
    minimum: 1,
    maximum: 3,
    default: 1,
  }),
}, ["topic"]);

export const startDurableWorkflowTool = createTool<WorkflowToolInput, WorkflowToolOutput>({
  description: "Start an experimental durable workflow-postgres job for deep research tasks. This path is not part of the primary production orchestration runtime.",
  schema: workflowToolSchema,
  execute: async ({ topic, depth = 1 }) => {
    try {
      const { runId } = await workflowClient.trigger({
        workflow: researchAgentWorkflow,
        args: [{ topic, depth }],
      });

      return {
        success: true,
        runId,
        workflowId: runId,
        runtimeStatus: WORKFLOW_POSTGRES_RUNTIME_STATUS,
        message: `Experimental workflow started successfully. Run ID: ${runId}.`,
      };
    } catch (error) {
      return {
        success: false,
        runtimeStatus: WORKFLOW_POSTGRES_RUNTIME_STATUS,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
