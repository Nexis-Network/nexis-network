import { generateObject, gateway } from "ai";
import { z } from "zod";

export const DexAnalystWorker = {
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
        poolData: z.object({
          address: z.string().optional(),
          liquidityUsd: z.number().optional(),
          volume24h: z.number().optional(),
          txn24h: z.object({ buys: z.number(), sells: z.number() }).optional(),
          priceImpact: z.number().optional(),
        }).optional(),
        securityCheck: z.object({
          isHoneypot: z.boolean().optional(),
          mintAuthDisabled: z.boolean().optional(),
          freezeAuthDisabled: z.boolean().optional(),
          lpLocked: z.boolean().optional(),
        }).optional(),
        platform: z.string().optional(), // DexScreener, DEXTools, Axiom, etc.
      }),
      system: `You are a specialized DEX Analyst.
      Your goal is to analyze liquidity pools and token security on DexScreener, DEXTools, Axiom, and DexView.
      Focus on Liquidity, Volume, Price Impact, and Security Flags (Honeypot, Ownership Renounced).
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a detailed DEX analysis and security check.`,
      prompt: "Analyze the DEX pair and security.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
