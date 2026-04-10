/**
 * Stateful Multi-Step Agent
 * Context-aware tool wrapper that preserves state across steps
 */

import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import {

  getAgentState,
  saveAgentState,
  saveStepResult,
  updateArtifacts,
  type AgentState,
} from "./state-storage";

import { logger } from '@/lib/logger';
/**
 * Wrap a tool to be stateful (can access previous step results)
 */
export function createStatefulTool<TInput extends z.ZodType>(spec: {
  id: string;
  description: string;
  schema: TInput;
  execute: (input: z.infer<TInput>, state: AgentState) => Promise<UntypedJson>;
}): Tool<z.infer<TInput>, UntypedJson> {
  return tool<z.infer<TInput>, UntypedJson>({
    description: spec.description,
    inputSchema: spec.schema as Parameters<typeof tool<z.infer<TInput>, UntypedJson>>[0]["inputSchema"],
    async *execute(input: z.infer<TInput>) {
      yield { state: "loading" as const };

      // Get session ID from input or context (simplified for now)
      const sessionId = (input).sessionId || `session-${Date.now()}`;

      // Get current agent state
      const state: AgentState =
        (await getAgentState(sessionId)) ?? {
          sessionId,
          userId: "user-id", // Would be injected from context
          artifacts: {},
          stepResults: [] as AgentState["stepResults"],
          currentStep: 0,
          maxSteps: 20,
          metadata: {},
        };

      try {
        // Execute tool with access to state
        const result = await spec.execute(input, state);

        // Update state with result
        state.currentStep++;
        state.stepResults.push({
          toolId: spec.id,
          input,
          output: result,
          status: "success",
          startedAt: Date.now(),
          completedAt: Date.now(),
        });

        // Store result in artifacts for later steps
        await updateArtifacts(sessionId, {
          [spec.id]: result,
        });

        // Save updated state
        await saveAgentState(sessionId, state);

        // Also save individual step result
        await saveStepResult(sessionId, state.currentStep - 1, spec.id, result);

        yield {
          state: "ready" as const,
          result,
          sessionId,
          stepIndex: state.currentStep - 1,
        };
      } catch (error) {
        // Log error in state
        state.stepResults.push({
          toolId: spec.id,
          input,
          output: { error: error instanceof Error ? error.message : "Unknown error" },
          status: "failed",
          startedAt: Date.now(),
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : "Unknown error",
        });

        await saveAgentState(sessionId, state);

        yield {
          state: "output-error" as const,
          errorText: error instanceof Error ? error.message : "Tool execution failed",
        };
      }
    },
  });
}

/**
 * Example: Research tool that stores results for later analysis
 */
export const statefulResearchTool = createStatefulTool({
  id: "research",
  description: "Research a topic and store findings for later use by other tools",
  schema: z.object({
    query: z.string(),
    depth: z.enum(["quick", "thorough"]).default("quick"),
    sessionId: z.string().optional(),
  }),
  execute: async ({ query, depth }, state) => {
    // Check if we already researched this
    const cachedResearch = state.artifacts[`research:${query}`];
    if (cachedResearch) {
      logger.debug(`[Stateful Research] Cache HIT for query: ${query}`);
      return { cached: true, results: cachedResearch };
    }

    // Perform research (simplified - would call actual search tool)
    logger.debug(`[Stateful Research] Performing ${depth} research for: ${query}`);

    const results = {
      query,
      depth,
      findings: [], // Would be populated by actual search
      timestamp: Date.now(),
    };

    return { cached: false, results, query };
  },
});

/**
 * Example: Analysis tool that uses previous research results
 */
export const statefulAnalysisTool = createStatefulTool({
  id: "analyze",
  description: "Analyze findings from previous research steps",
  schema: z.object({
    researchQuery: z.string(),
    analysisType: z.enum(["technical", "business", "risk"]),
    sessionId: z.string().optional(),
  }),
  execute: async ({ researchQuery, analysisType }, state) => {
    // Access research results from state
    const researchData = state.artifacts[`research:${researchQuery}`];

    if (!researchData) {
      throw new Error(
        `No research found for query: ${researchQuery}. Run research tool first.`,
      );
    }

    logger.debug(
      `[Stateful Analysis] Analyzing ${analysisType} with research data`,
    );

    // Perform analysis with context from previous step
    return {
      analysisType,
      researchQuery,
      analysis: "Analysis results based on research data",
      basedOnSteps: state.stepResults.map((s) => s.toolId),
    };
  },
});

/**
 * Get all steps from current session (for UI display)
 */
export async function getSessionSteps(sessionId: string): Promise<AgentState["stepResults"]> {
  const state = await getAgentState(sessionId);
  return state?.stepResults || [];
}
