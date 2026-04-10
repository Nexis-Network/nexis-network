import { z } from "zod";

/**
 * Schema for evaluation results
 */
export const EvaluationResultSchema = z.object({
  qualityScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Overall quality score from 1-10"),
  preservesTone: z
    .boolean()
    .describe("Whether the output preserves the original tone"),
  preservesNuance: z
    .boolean()
    .describe("Whether the output preserves subtle nuances"),
  culturallyAccurate: z
    .boolean()
    .describe("Whether the output is culturally accurate"),
  technicallyCorrect: z
    .boolean()
    .describe("Whether the output is technically correct"),
  specificIssues: z.array(z.string()).describe("List of specific issues found"),
  improvementSuggestions: z
    .array(z.string())
    .describe("Specific suggestions for improvement"),
  strengths: z.array(z.string()).describe("What the output does well"),
  overallAssessment: z
    .string()
    .describe("Overall assessment of the output quality"),
  meetsThreshold: z
    .boolean()
    .describe("Whether the output meets the quality threshold"),
});

/**
 * Schema for optimization parameters
 */
export const OptimizationParamsSchema = z.object({
  targetQuality: z
    .number()
    .min(1)
    .max(10)
    .describe("Target quality score to achieve"),
  focusAreas: z
    .array(z.string())
    .describe("Specific areas to focus improvement on"),
  constraints: z
    .array(z.string())
    .optional()
    .describe("Constraints to maintain during optimization"),
  iterationLimit: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe("Maximum number of optimization iterations"),
});

/**
 * Schema for optimization results
 */
export const OptimizationResultSchema = z.object({
  improvedOutput: z.string().describe("The improved version of the output"),
  changesMade: z.array(z.string()).describe("List of specific changes made"),
  qualityImprovement: z
    .number()
    .describe("Amount of quality improvement achieved"),
  iterationsUsed: z
    .number()
    .describe("Number of iterations used for optimization"),
  finalQualityScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Final quality score after optimization"),
  optimizationStrategy: z.string().describe("Strategy used for optimization"),
  remainingIssues: z
    .array(z.string())
    .optional()
    .describe("Issues that could not be resolved"),
});

/**
 * Schema for evaluation criteria
 */
export const EvaluationCriteriaSchema = z.object({
  criteria: z
    .array(z.string())
    .describe("Specific criteria to evaluate against"),
  weights: z
    .record(z.string(), z.number())
    .optional()
    .describe("Weights for different criteria"),
  threshold: z
    .number()
    .min(1)
    .max(10)
    .default(7)
    .describe("Quality threshold to meet"),
  context: z.string().optional().describe("Additional context for evaluation"),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
export type OptimizationParams = z.infer<typeof OptimizationParamsSchema>;
export type OptimizationResult = z.infer<typeof OptimizationResultSchema>;
export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;
