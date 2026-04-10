import { tool } from "ai";
import { z } from "zod";
import { getQuoteAction } from "@/server/actions/uniswap";

export const uniswap_get_quote = tool({
  description: "Get a quote for swapping tokens on Uniswap across supported networks (e.g., Ethereum, Base, Arbitrum).",
  inputSchema: z.object({
    tokenIn: z.string().describe("The ERC20 contract address of the token to sell."),
    tokenOut: z.string().describe("The ERC20 contract address of the token to buy."),
    amount: z.string().describe("The amount of tokenIn to sell, in raw units (considering decimals)."),
    chainId: z.string().describe("The chain ID of the network (e.g., '1' for Ethereum, '8453' for Base)."),
  }),
  execute: async ({ tokenIn, tokenOut, amount, chainId }) => {
    try {
      const response = await getQuoteAction({
        swapper: "0x0000000000000000000000000000000000000000", // Will be replaced by actual wallet in UI execution
        tokenIn,
        tokenOut,
        tokenInChainId: chainId,
        tokenOutChainId: chainId,
        amount,
        type: 'EXACT_INPUT',
      });

      if (!response.success || !response.data) {
        return { error: response.error };
      }

      // Emit artifact to UI for confirmation if a real user intent
      // In a real flow, we'd emit a Swap Review artifact
      if (typeof window === 'undefined') {
          // Server side - just return data
          return { data: response.data };
      }

      return { data: response.data, message: "Quote retrieved successfully." };
    } catch (e: unknown) {
      return { error: (e as Error).message || "Failed to fetch Uniswap quote." };
    }
  },
});
