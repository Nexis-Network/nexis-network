import { z } from "zod";

export const WORKFLOW_POSTGRES_RUNTIME_STATUS = "experimental" as const;

const researchAgentInputSchema = z.object({
  topic: z.string().min(1),
  depth: z.number().int().min(1).max(3).default(1),
});

export type ResearchAgentWorkflowInput = z.input<typeof researchAgentInputSchema>;

export type ResearchAgentWorkflowOutput = {
  status: "completed";
  result: string;
  depth: number;
};

export async function researchAgentWorkflow(
  input: ResearchAgentWorkflowInput,
): Promise<ResearchAgentWorkflowOutput> {
  "use workflow";

  const { topic, depth } = researchAgentInputSchema.parse(input);
  return {
    status: "completed",
    result: `Researched ${topic} with depth ${depth}`,
    depth,
  };
}

type WorkflowFunctionWithId = typeof researchAgentWorkflow & {
  workflowId: string;
};

(researchAgentWorkflow as WorkflowFunctionWithId).workflowId = "research-agent";
