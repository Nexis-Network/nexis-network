import { generateObject, gateway } from "ai";
import { z } from "zod";

export const OnChainTraderWorker = {
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
        transactionPlan: z.object({
          chain: z.string(), // e.g., "ethereum", "solana", "base"
          action: z.enum(["swap", "transfer", "bridge", "stake", "lend"]),
          assets: z.array(z.string()),
          estimatedGas: z.string().optional(),
          riskLevel: z.enum(["low", "medium", "high"]),
        }).optional(),
        deliverables: z.array(z.object({
          name: z.string(),
          type: z.enum(["transaction_builder", "execution_plan", "risk_assessment"]),
          content: z.string(), // JSON string of the transaction payload or plan
          status: z.enum(["draft", "ready_for_approval"]),
        })).optional(),
        warnings: z.array(z.string()).optional(),
      }),
      system: `You are a specialized On-Chain Trader and DeFi Executor.
      Your goal is to plan and construct safe, efficient on-chain transactions.
      You MUST identify the correct chain (Ethereum, Solana, Arbitrum, Base, etc.) and assets.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Plan the transaction details carefully. DO NOT execute; only plan and build.`,
      prompt: "Construct the transaction plan.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
