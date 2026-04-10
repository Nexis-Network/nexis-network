import { generateObject, gateway } from "ai";
import { z } from "zod";

export const DefiProtocolWorker = {
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
        protocolData: z.object({
          name: z.string(), // Uniswap, Jupiter, etc.
          chain: z.string(),
          type: z.enum(["swap", "pool", "position", "perp", "portfolio"]),
        }).optional(),
        analysis: z.object({
          tvl: z.number().optional(),
          volume24h: z.number().optional(),
          apr: z.number().optional(),
          impermanentLossRisk: z.enum(["low", "medium", "high"]).optional(),
          feesEarned: z.number().optional(),
          openInterest: z.number().optional(), // For perps
        }).optional(),
        action: z.enum(["add_liquidity", "remove_liquidity", "swap", "open_position", "close_position", "claim_fees"]).optional(),
        suggestions: z.array(z.string()).optional(),
      }),
      system: `You are a specialized DeFi Protocol Analyst.
      Your goal is to provide deep, protocol-specific insights for Uniswap, Pancakeswap, Andromeda, Raydium, and Jupiter.
      
      ## Supported Contexts:
      - **Uniswap**: V3 Positions, Pools, Swaps. Chains: Ethereum, Base, Polygon, Arbitrum, Optimism.
      - **Pancakeswap**: Pools, Swaps. Chain: BSC.
      - **Raydium**: AMM Pools, Swaps. Chain: Solana.
      - **Jupiter**: Aggregator Swaps, Perpetuals (Perps). Chain: Solana.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Analyze the protocol data and provide actionable insights (e.g., fee tier suggestions, IL risk, perp leverage warnings).`,
      prompt: "Analyze the DeFi protocol context.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
