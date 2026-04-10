import { generateObject, gateway } from "ai";
import { z } from "zod";

export const CryptoAnalystWorker = {
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
          price: z.number().optional(),
          change24h: z.number().optional(),
          volume: z.number().optional(),
          marketCap: z.number().optional(),
          trend: z.enum(["bullish", "bearish", "neutral"]).optional(),
        }).optional(),
        deliverables: z.array(z.object({
          name: z.string(),
          type: z.enum(["analysis", "chart", "data", "recommendation"]),
          content: z.string(),
          status: z.enum(["completed"]),
        })).optional(),
      }),
      system: `You are a specialized Crypto Market Analyst.
      Your goal is to provide deep insights into cryptocurrency markets, tokens, and trends.
      You have access to knowledge about chart patterns, tokenomics, and market sentiment.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a detailed analysis.`,
      prompt: "Analyze the market data and provide your report.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
