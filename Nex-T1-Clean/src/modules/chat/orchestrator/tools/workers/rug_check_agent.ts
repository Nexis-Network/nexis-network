import { generateObject, gateway } from "ai";
import { z } from "zod";

export const RugCheckWorker = {
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
        securityReport: z.object({
          tokenAddress: z.string(),
          riskScore: z.number().describe("0-100 score, higher is riskier"),
          verdict: z.enum(["safe", "risky", "danger", "rug"]).describe("Overall verdict"),
          flags: z.array(z.string()).describe("List of red flags detected"),
          liquidityLocked: z.boolean().optional(),
          mintAuthority: z.boolean().describe("True if mint authority is still enabled"),
          freezeAuthority: z.boolean().describe("True if freeze authority is still enabled"),
          topHoldersConcentration: z.number().describe("Percentage held by top 10 holders"),
        }).optional(),
        recommendation: z.string(),
      }),
      system: `You are a specialized Rug Check Analyst (Security Auditor).
      Your goal is to analyze tokens for security risks, honeypots, and rug pull potential using data from RugCheck.xyz and other scanners.
      Focus on Mint Authority, Liquidity Locking, Top Holder Concentration, and copy-cat contracts.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a strict security audit.`,
      prompt: "Perform a rug check analysis.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
