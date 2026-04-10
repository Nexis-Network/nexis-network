import { generateObject, gateway } from "ai";
import { z } from "zod";

export const PredictionMarketWorker = {
  execute: async (params: {
    taskId: string;
    description: string;
    context?: string;
    requirements?: string[];
    priority: string;
  }) => {
    const { object: result } = await generateObject({
      model: gateway("openai/gpt-4.1-mini"),
      schema: z.object({
        output: z.string(),
        explanation: z.string(),
        marketData: z.object({
          platform: z.string(), // Polymarket, etc.
          question: z.string(),
          outcomes: z.array(z.object({
            name: z.string(),
            probability: z.number().describe("0-100 percentage"),
            price: z.number(),
          })).optional(),
          volume: z.number().optional(),
          endDate: z.string().optional(),
        }).optional(),
        analysis: z.object({
          sentiment: z.string(),
          liquidityDepth: z.enum(["low", "medium", "high"]).optional(),
          arbitrageOpportunity: z.boolean().optional(),
        }).optional(),
        action: z.enum(["buy_yes", "buy_no", "sell", "analyze"]).optional(),
      }),
      system: `You are a specialized Prediction Market Analyst.
      Your goal is to analyze markets on Polymarket and other prediction platforms.
      Focus on Event Probabilities, Volume, and Liquidity depth.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a prediction market analysis.`,
      prompt: "Analyze the prediction market context.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
