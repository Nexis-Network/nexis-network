
import { createTool, createToolSchema, stringProp } from "./create-tool";
import { createPublicClient, http, formatEther } from "viem";
import { mainnet, base, arbitrum, optimism, polygon } from "viem/chains";

const simulateTransactionSchema = createToolSchema(
  {
    to: stringProp("Target address"),
    value: stringProp("Value in Wei (optional)"),
    data: stringProp("Calldata (optional)"),
    chain: stringProp("Chain identifier (e.g., ethereum, base, arbitrum)"),
    from: stringProp("From address (optional, defaults to zero address for simulation)"),
  },
  ["to", "chain"]
);

const CHAINS: Record<string, UntypedJson> = {
  ethereum: mainnet,
  mainnet: mainnet,
  base: base,
  arbitrum: arbitrum,
  optimism: optimism,
  polygon: polygon,
};

export const simulateTransactionTool = createTool({
  description:
    "Simulate a transaction on an EVM chain to check for reverts or errors before execution. Returns the simulation result or error message.",
  schema: simulateTransactionSchema,
  execute: async ({ to, value, data, chain, from }: { to: string; value?: string; data?: string; chain?: string; from?: string }) => {
    const targetChain = (chain ? CHAINS[chain.toLowerCase()] : undefined) || mainnet;
    
    // Construct client - Using public RPCs for now as fallback if Alchemy key isn't directly usable here
    // In prod, this should use the internal Alchemy Proxy or a specific key
    const client = createPublicClient({
      chain: targetChain,
      transport: http(), // Viem uses public RPCs by default fallback
    });

    try {
      const result = await client.call({
        account: (from as `0x${string}`) || "0x0000000000000000000000000000000000000000",
        to: to as `0x${string}`,
        value: value ? BigInt(value) : undefined,
        data: (data as `0x${string}`) || undefined,
      });

      return {
        success: true,
        data: result.data,
        simulation: "Transaction would likely succeed (no revert detected).",
        details: {
            chain: targetChain.name,
            valueETH: value ? formatEther(BigInt(value)) : "0",
        }
      };
    } catch (error: UntypedJson) {
        const errObj = error as Record<string, UntypedJson>;
        return {
            success: false,
            error: errObj?.shortMessage || (error instanceof Error ? error.message : String(error)),
            simulation: "Transaction REVERTED or failed during simulation.",
            details: {
                chain: targetChain.name,
                reason: errObj?.details || "Unknown revert reason"
        }
      };
    }
  },
});
