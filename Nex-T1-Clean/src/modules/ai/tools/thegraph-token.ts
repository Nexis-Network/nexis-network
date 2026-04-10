
/**
 * TheGraph Token API Tool
 *
 * Domain: AI Tools - Token Data
 * Responsibility: Provide token metadata, balances, and transfer activity using TheGraph Token API (REST).
 * Ref: https://token-api.thegraph.com/
 */

import { createTool, createToolSchema, stringProp, integerProp } from "./create-tool";

const THEGRAPH_TOKEN_API_BASE = "https://token-api.thegraph.com";
const THEGRAPH_TOKEN_API_JWT = process.env.THEGRAPH_TOKEN_API_JWT;

// ============================================================================
// HELPERS
// ============================================================================

const getAuthHeaders = () => {
  if (!THEGRAPH_TOKEN_API_JWT) {
    throw new Error("THEGRAPH_TOKEN_API_JWT is not configured");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${THEGRAPH_TOKEN_API_JWT}`
  };
};

const mapChainIdToNetwork = (chainId: string): string => {
  // Mapping common chain IDs to TheGraph network identifiers
  const map: Record<string, string> = {
    "1": "mainnet",
    "0x1": "mainnet",
    "137": "polygon",
    "0x89": "polygon",
    "10": "optimism",
    "0xa": "optimism",
    "42161": "arbitrum-one",
    "0xa4b1": "arbitrum-one",
    "8453": "base",
    "0x2105": "base",
    "56": "bsc",
    "0x38": "bsc",
  };
  
  const normalized = chainId.toLowerCase();
  if (map[normalized]) return map[normalized];
  
  // Return as is if not found, removing 0x if present, though likely will fail if not supported
  return normalized.startsWith("0x") ? parseInt(normalized, 16).toString() : normalized;
};

// ============================================================================
// TOOLS
// ============================================================================

export const getTokenMetadataTool = createTool<
  { chain: string; address: string },
  UntypedJson
>({
  description: "Retrieve token metadata including name, symbol, decimals, and logo using TheGraph Token API.",
  schema: createToolSchema({
    chain: stringProp("Chain ID (e.g. 1, 0x1) or network name (mainnet, optimism)"),
    address: stringProp("Token contract address"),
  }),
  execute: async ({ chain, address }) => {
    const network = mapChainIdToNetwork(chain);
    const url = `${THEGRAPH_TOKEN_API_BASE}/get/v1/${network}/token/${address}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`TheGraph Token API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },
});

export const getTokenBalancesTool = createTool<
  { chain: string; walletAddress: string },
  UntypedJson
>({
  description: "Get token balances for any wallet address using TheGraph Token API.",
  schema: createToolSchema({
    chain: stringProp("Chain ID or network name"),
    walletAddress: stringProp("Wallet address"),
  }),
  execute: async ({ chain, walletAddress }) => {
    const network = mapChainIdToNetwork(chain);
    // Endpoint structure based on standard REST patterns for Token API
    const url = `${THEGRAPH_TOKEN_API_BASE}/get/v1/${network}/account/${walletAddress}/balances`;

    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
       throw new Error(`TheGraph Token API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },
});

export const getTokenTransfersTool = createTool<
  { chain: string; address: string; limit?: number },
  UntypedJson
>({
  description: "Fetch token transfer activity for a wallet using TheGraph Token API.",
  schema: createToolSchema({
    chain: stringProp("Chain ID or network name"),
    address: stringProp("Wallet address"),
    limit: integerProp("Limit results", { default: 25 }),
  }),
  execute: async ({ chain, address, limit }) => {
    const network = mapChainIdToNetwork(chain);
    // Endpoint for transfers
    const url = `${THEGRAPH_TOKEN_API_BASE}/get/v1/${network}/account/${address}/transfers?limit=${limit}`;

    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`TheGraph Token API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },
});
