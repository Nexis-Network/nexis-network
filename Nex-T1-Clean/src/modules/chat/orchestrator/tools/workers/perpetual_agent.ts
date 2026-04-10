import { generateObject, gateway } from "ai";
import { z } from "zod";

export const PerpetualWorker = {
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
          exchange: z.string(), // DyDX, Jupiter Perps, Hyperliquid
          pair: z.string(),
          markPrice: z.number().optional(),
          indexPrice: z.number().optional(),
          fundingRate: z.number().optional(), // 1h or 8h rate
          openInterest: z.number().optional(),
          volume24h: z.number().optional(),
        }).optional(),
        positionAnalysis: z.object({
          leverage: z.number().optional(),
          marginUsage: z.number().optional(),
          liquidationPrice: z.number().optional(),
          unrealizedPnl: z.number().optional(),
        }).optional(),
        action: z.enum(["long", "short", "close", "add_margin", "analyze"]).optional(),
        riskAssessment: z.enum(["low", "medium", "high", "extreme"]).optional(),
      }),
      system: `You are a specialized Perpetual Futures Analyst.
      Your goal is to analyze perp markets on DyDX, Jupiter Perps, Hyperliquid, and others.
      Focus on Funding Rates, Open Interest, Leverage safety, and Liquidation levels.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a detailed perpetuals market analysis.`,
      prompt: "Analyze the perpetuals market context.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
