import { tool } from "ai";
import { z } from "zod";

export const uniswap_create_lp = tool({
  description: "Prepare parameters to create a new Liquidity Provisioning position on Uniswap.",
  inputSchema: z.object({
    token0: z.string().describe("The ERC20 contract address of token0."),
    token1: z.string().describe("The ERC20 contract address of token1."),
    poolAddress: z.string().describe("The address of the V3 pool."),
    amount0Preferred: z.string().describe("The desired amount of token0 to provide."),
    amount1Preferred: z.string().describe("The desired amount of token1 to provide."),
    tickLower: z.number().describe("The lower tick bound for the position."),
    tickUpper: z.number().describe("The upper tick bound for the position."),
    chainId: z.number().describe("The chain ID of the network."),
  }),
  execute: async ({ token0, token1, poolAddress, amount0Preferred, amount1Preferred, tickLower, tickUpper, chainId }) => {
    try {
      // In a real execution, we would call the /lp/create endpoint to get the transaction payload
      // For the AI tool, we just return the formatted intent and let the UI handle the actual execution signature.
      
      const positionIntent = {
          action: "create_lp",
          token0,
          token1,
          poolAddress,
          amount0Preferred,
          amount1Preferred,
          tickLower,
          tickUpper,
          chainId
      };

      // Emit artifact to UI for confirmation if a real user intent
      // e.g. emitArtifactTool(...)

      return { data: positionIntent, message: "LP Creation intent prepared successfully. Please review and confirm in the UI." };
    } catch (e: unknown) {
      return { error: (e as Error).message || "Failed to prepare LP creation." };
    }
  },
});
