import { tool, generateObject } from "ai";
import { z } from "zod";
import { EvaluationCriteriaSchema } from "./schema";
import { Langfuse } from "langfuse";
import { openai } from "@/server/services/ai-sdk/openai";


import { logger } from '@/lib/logger';
const EvaluationResultSchema = z.object({
  qualityScore: z.number().min(1).max(10).describe("Score from 1-10"),
  preservesTone: z.boolean(),
  preservesNuance: z.boolean(),
  culturallyAccurate: z.boolean(),
  technicallyCorrect: z.boolean(),
  specificIssues: z.array(z.string()).describe("List of specific issues found"),
  improvementSuggestions: z.array(z.string()).describe("Actionable suggestions"),
  strengths: z.array(z.string()).describe("List of strengths"),
  overallAssessment: z.string().describe("Summary of the evaluation"),
  meetsThreshold: z.boolean().describe("Whether it meets the criteria threshold"),
});

/**
 * Evaluator Tool - Assesses quality of outputs and provides detailed feedback
 * using an LLM-as-a-Judge approach.
 */
export const evaluatorTool = tool({
  description:
    "Evaluate the quality of generated content against specific criteria and provide detailed feedback for improvement",
  inputSchema: z.object({
    content: z.string().describe("The content to evaluate"),
    originalRequest: z.string().describe("The original request or prompt"),
    criteria: EvaluationCriteriaSchema.optional().describe(
      "Evaluation criteria to use"
    ),
    context: z
      .string()
      .optional()
      .describe("Additional context for evaluation"),
    traceId: z.string().optional().describe("The trace ID to attach the score to"),
  }),
  async *execute({
    content,
    originalRequest,
    criteria,
    context,
    traceId,
  }) {
    yield { state: "loading" as const };

    try {
      // Sampling check to control costs (e.g., run on 20% of requests in prod, or always if debug flag is set)
      const shouldEvaluate = process.env.NEX_EVALUATOR_ENABLED === "true" || Math.random() < 0.2;

      if (!shouldEvaluate) {
        yield { state: "ready" as const };
        return;
      }

      // Use a lightweight but capable model for evaluation
      const model = openai("gpt-5-mini");

      const _threshold = criteria?.threshold ?? 7;

      const { object: evaluation } = await generateObject({
        model,
        schema: EvaluationResultSchema,
        prompt: `You are an expert AI Evaluator. Your task is to objectively assess the quality of the following content based on the original request and criteria.

Original Request:
${originalRequest}

Content to Evaluate:
${content}

Context:
${context ?? "None provided"}

Criteria:
${criteria?.criteria?.join("\n") ?? "General quality, tone, and accuracy"}

Evaluate rigorously. Do not be lenient.
If the content contains hallucinations or factual errors, the score must be below 5.
If the tone is inappropriate, the score must be below 7.
`,
      });

      // Send score to Langfuse
      if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
        try {
          const langfuse = new Langfuse({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASEURL ?? "https://cloud.langfuse.com",
          });

          let finalTraceId = traceId;
          if (!finalTraceId && context) {
            try {
              const parsed = JSON.parse(context);
              finalTraceId = parsed.traceId;
            } catch {
              // Context wasn't JSON or didn't have traceId
            }
          }

          langfuse.score({
            traceId: finalTraceId,
            name: "evaluation-quality",
            value: evaluation.qualityScore,
            comment: evaluation.overallAssessment,
            metadata: {
              preservesTone: evaluation.preservesTone,
              technicallyCorrect: evaluation.technicallyCorrect,
              issues: evaluation.specificIssues,
            }
          });
          await langfuse.shutdownAsync();
        } catch (error) {
          logger.warn("Failed to send score to Langfuse", error);
        }
      }

      yield { state: "ready" as const, evaluation };

    } catch (error) {
      logger.error("Evaluation failed", error);
      yield {
        state: "output-error" as const,
        errorText: error instanceof Error ? error.message : String(error)
      };
    }
  },
});

export type EvaluatorUIToolInvocation = {
  state:
  | "loading"
  | "ready"
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";
  input?: {
    content: string;
    originalRequest: string;
    criteria?: {
      criteria: string[];
      weights?: Record<string, number>;
      threshold: number;
      context?: string;
    };
    context?: string;
  };
  output?: {
    state: "loading" | "ready";
    evaluation?: z.infer<typeof EvaluationResultSchema>;
  };
  errorText?: string;
};
