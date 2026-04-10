import { generateObject, gateway } from "ai";
import { z } from "zod";

export const LendingBorrowingWorker = {
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
          protocol: z.string(), // Aave, Jupiter Lend, etc.
          asset: z.string(),
          depositApy: z.number().optional(),
          borrowApy: z.number().optional(),
          totalSupply: z.number().optional(),
          totalBorrow: z.number().optional(),
          utilizationRate: z.number().optional(),
        }).optional(),
        positionData: z.object({
          collateral: z.number().optional(),
          debt: z.number().optional(),
          healthFactor: z.number().optional(),
          liquidationPrice: z.number().optional(),
        }).optional(),
        action: z.enum(["deposit", "withdraw", "borrow", "repay", "analyze"]).optional(),
        riskWarning: z.string().optional(),
      }),
      system: `You are a specialized Lending & Borrowing Analyst.
      Your goal is to analyze lending markets on Aave, Jupiter Lend, and other major protocols.
      Focus on APY, LTV (Loan-to-Value), Health Factor, and Liquidation Risk.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a detailed lending market analysis.`,
      prompt: "Analyze the lending market context.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
