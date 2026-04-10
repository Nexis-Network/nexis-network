import { tool } from "ai";
import { z } from "zod";
import { OptimizationParamsSchema } from "./schema";

/**
 * Optimizer Tool - Improves content based on evaluation feedback
 *
 * This tool takes evaluation feedback and generates an improved version
 * of the content with specific optimizations applied.
 */
export const optimizerTool = tool({
  description:
    "Improve content based on evaluation feedback and optimization parameters",
  inputSchema: z.object({
    content: z.string().describe("The content to optimize"),
    evaluationFeedback: z
      .object({
        qualityScore: z.number(),
        specificIssues: z.array(z.string()),
        improvementSuggestions: z.array(z.string()),
        strengths: z.array(z.string()),
      })
      .describe("Feedback from the evaluation"),
    optimizationParams: OptimizationParamsSchema.optional().describe(
      "Parameters for optimization"
    ),
    originalRequest: z.string().describe("The original request or prompt"),
  }),
  async *execute({
    content,
    evaluationFeedback,
    optimizationParams,
    originalRequest: _originalRequest,
  }) {
    yield { state: "loading" as const };

    // Simulate optimization work
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const targetQuality = optimizationParams?.targetQuality || 8;
    const iterationLimit = optimizationParams?.iterationLimit || 3;
    const focusAreas =
      optimizationParams?.focusAreas || evaluationFeedback.specificIssues;

    // Simulate iterative improvement
    const iterationsUsed = Math.min(
      Math.ceil((targetQuality - evaluationFeedback.qualityScore) / 2),
      iterationLimit
    );

    const qualityImprovement = Math.min(
      targetQuality - evaluationFeedback.qualityScore,
      iterationsUsed * 1.5
    );

    const finalQualityScore = Math.min(
      evaluationFeedback.qualityScore + qualityImprovement,
      10
    );

    // Generate changes based on feedback
    const changesMade: string[] = [];
    const remainingIssues: string[] = [];

    evaluationFeedback.specificIssues.forEach((issue, index) => {
      if (index < iterationsUsed) {
        changesMade.push(`Addressed: ${issue}`);
      } else {
        remainingIssues.push(issue);
      }
    });

    evaluationFeedback.improvementSuggestions.forEach((suggestion, index) => {
      if (index < iterationsUsed) {
        changesMade.push(`Applied: ${suggestion}`);
      }
    });

    // Generate improved content (simulated)
    const improvedOutput = `${content}\n\n[Optimized based on feedback: ${changesMade.length} improvements applied]`;

    const optimizationStrategy =
      focusAreas.length > 0
        ? `Focused optimization on: ${focusAreas.join(", ")}`
        : "General quality improvement";

    const optimizationResult = {
      improvedOutput,
      changesMade,
      qualityImprovement: Math.round(qualityImprovement * 10) / 10,
      iterationsUsed,
      finalQualityScore: Math.round(finalQualityScore * 10) / 10,
      optimizationStrategy,
      remainingIssues: remainingIssues.length > 0 ? remainingIssues : undefined,
    };

    yield { state: "ready" as const, optimization: optimizationResult };
  },
});

export type OptimizerUIToolInvocation = {
  state:
    | "loading"
    | "ready"
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: {
    content: string;
    evaluationFeedback: {
      qualityScore: number;
      specificIssues: string[];
      improvementSuggestions: string[];
      strengths: string[];
    };
    optimizationParams?: {
      targetQuality: number;
      focusAreas: string[];
      constraints?: string[];
      iterationLimit: number;
    };
    originalRequest: string;
  };
  output?: {
    state: "loading" | "ready";
    optimization?: {
      improvedOutput: string;
      changesMade: string[];
      qualityImprovement: number;
      iterationsUsed: number;
      finalQualityScore: number;
      optimizationStrategy: string;
      remainingIssues?: string[];
    };
  };
  errorText?: string;
};
