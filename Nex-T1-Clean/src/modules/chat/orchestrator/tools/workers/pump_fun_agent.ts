import { generateObject, gateway } from "ai";
import { z } from "zod";

export const PumpFunWorker = {
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
        tokenData: z.object({
          mint: z.string().optional(),
          bondingCurveProgress: z.number().optional(),
          marketCap: z.number().optional(),
          topHolders: z.array(z.object({
            address: z.string(),
            percentage: z.number()
          })).optional(),
          devActivity: z.string().optional(),
        }).optional(),
        action: z.enum(["analyze", "buy_recommendation", "sell_recommendation", "monitor"]).optional(),
        riskAssessment: z.enum(["high", "extreme", "degen"]).optional(),
      }),
      system: `You are a specialized Pump.fun Analyst.
      Your goal is to analyze memecoins on pump.fun.
      Focus on bonding curve progress, developer activity (did they sell?), and holder distribution.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a "degen-style" but accurate analysis.`,
      prompt: "Analyze the pump.fun token.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
