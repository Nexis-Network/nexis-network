import { tool, generateObject, gateway } from "ai";
import { ImplementationItemSchema } from "./schema";
import { z } from "zod";

import { logger } from '@/lib/logger';
/**
 * Orchestrator Tool - Plans and coordinates complex tasks
 *
 * This tool acts as the central coordinator that breaks down complex requests
 * into manageable tasks and assigns them to specialized workers.
 */
export const orchestratorTool = tool({
  description:
    "Plan and coordinate complex tasks by breaking them down into manageable subtasks",
  inputSchema: z.object({
    request: z
      .string()
      .describe("The complex task or feature request to orchestrate"),
    context: z
      .string()
      .optional()
      .describe("Additional context about the project or requirements"),
    constraints: z
      .array(z.string())
      .optional()
      .describe("Any constraints or limitations to consider"),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .default("medium")
      .describe("Overall priority of the task"),
  }),
  async *execute({ request, context, constraints, priority }) {
    yield { state: "loading" as const };

    try {
      // Use AI to generate the implementation plan dynamically
      const { object: implementationPlan } = await generateObject({
        model: gateway("openai/gpt-4.1-mini"),
        schema: z.object({
          request: z.string(),
          context: z.string(),
          constraints: z.array(z.string()),
          priority: z.string(),
          items: z.array(ImplementationItemSchema),
          estimatedDuration: z.string(),
          riskLevel: z.string(),
          successCriteria: z.array(z.string()),
        }),
        system: `You are an expert technical project manager. Create a detailed implementation plan for the following request.
        Break it down into logical, dependency-aware steps.
        
        Request: ${request}
        Context: ${context || "None"}
        Constraints: ${constraints?.join(", ") || "None"}
        Priority: ${priority}`,
        prompt: "Generate the implementation plan.",
      });

      yield { state: "ready" as const, plan: implementationPlan as UntypedJson };
    } catch (error) {
           logger.error("Failed to generate plan:", error);
           yield { state: "output-error", errorText: "Failed to generate plan" };
    }
  },
});

export type OrchestratorUIToolInvocation = {
  state:
    | "loading"
    | "ready"
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: {
    request: string;
    context?: string;
    constraints?: string[];
    priority: "low" | "medium" | "high" | "urgent";
  };
  output?: {
    state: "loading" | "ready";
    plan?: {
      request: string;
      context: string;
      constraints: string[];
      priority: string;
      items: Array<{
        purpose: string;
        category:
          | "research"
          | "design"
          | "development"
          | "testing"
          | "deployment"
          | "documentation";
        deliverable: string;
        priority: "low" | "medium" | "high";
        estimatedComplexity: "low" | "medium" | "high";
        dependencies?: string[];
        estimatedDuration: string;
      }>;
      estimatedDuration: string;
      riskLevel: string;
      successCriteria: string[];
    };
  };
  errorText?: string;
};
