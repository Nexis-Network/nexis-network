import { generateObject, gateway } from "ai";
import { z } from "zod";

export const MarketDataWorker = {
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
        metrics: z.object({
          price: z.number().optional(),
          fdv: z.number().optional(),
          volume24h: z.number().optional(),
          circulatingSupply: z.number().optional(),
          allTimeHigh: z.number().optional(),
        }).optional(),
        sources: z.array(z.string()).optional(),
        officialLinks: z.object({
          website: z.string().optional(),
          twitter: z.string().optional(),
          telegram: z.string().optional(),
        }).optional(),
      }),
      system: `You are a specialized Market Data Analyst.
      Your goal is to extract and interpret data from CoinMarketCap and CoinGecko.
      Focus on accurate metrics: FDV, Volume, Supply, and verifying official links.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a professional market report.`,
      prompt: "Provide the market data analysis.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
