
import { createTool, createToolSchema, stringProp } from "./create-tool";

// We will use a direct fetch to Alchemy's RPC for metadata if the MCP client is too restricted,
// but for now, let's try to reuse the existing Alchemy Client pattern if possible?
// Actually, let's use a robust fetch implementation to ensure we get the data we need.

const auditContractSchema = createToolSchema(
  {
    contractAddress: stringProp("The token/contract address to audit"),
    chain: stringProp("Chain identifier (e.g., ethereum, base, arbitrum)"),
  },
  ["contractAddress"]
);

const ALCHEMY_RPC_MAP: Record<string, string> = {
    ethereum: "https://eth-mainnet.g.alchemy.com/v2",
    base: "https://base-mainnet.g.alchemy.com/v2",
    arbitrum: "https://arb-mainnet.g.alchemy.com/v2",
    optimism: "https://opt-mainnet.g.alchemy.com/v2",
    polygon: "https://polygon-mainnet.g.alchemy.com/v2",
};

export const auditContractTool = createTool({
  description:
    "Audit a smart contract/token for basic safety signals. Checks metadata, decimals, and basic integrity. Useful before interacting with unknown tokens.",
  schema: auditContractSchema,
  execute: async ({ contractAddress, chain = "ethereum" }: { contractAddress: string; chain: string }) => {
    const apiKey = process.env.MCP_ALCHEMY_API_KEY || ""; 
    // Fallback if no key: we can't really audit without a provider. 
    // But we can check if it looks like a valid address.
    
    if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return { error: "Invalid Ethereum address format." };
    }

    const baseUrl = ALCHEMY_RPC_MAP[chain.toLowerCase()] || ALCHEMY_RPC_MAP.ethereum;
    // Note: In a real env, we should route this through our internal proxy or use the specific key.
    // For this implementation, we will attempt to fetch metadata.
    
    // HEURISTIC 1: Check Metadata
    // If metadata fails or is empty, it's suspicious.
    
    try {
        const response = await fetch(`${baseUrl}/${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "alchemy_getTokenMetadata",
                params: [contractAddress]
            })
        });

        const data = await response.json();
        const metadata = data.result;

        if (!metadata) {
             return {
                status: "UNVERIFIED",
                riskLevel: "HIGH",
                reason: "Could not retrieve token metadata from Alchemy.",
                details: data
             };
        }

        const riskFlags = [];
        if (!metadata.logo) riskFlags.push("No Token Logo");
        if (!metadata.name) riskFlags.push("No Token Name");
        if (metadata.decimals === null) riskFlags.push("Decimals Invalid");

        return {
            status: riskFlags.length > 0 ? "CAUTION" : "VERIFIED_METADATA",
            riskLevel: riskFlags.length > 0 ? "MEDIUM" : "LOW",
            token: {
                name: metadata.name,
                symbol: metadata.symbol,
                decimals: metadata.decimals,
                logo: metadata.logo
            },
            flags: riskFlags
        };

    } catch (error: UntypedJson) {
        return {
            error: "Audit failed due to network or API error.",
            details: error instanceof Error ? error.message : String(error)
        };
    }
  },
});
