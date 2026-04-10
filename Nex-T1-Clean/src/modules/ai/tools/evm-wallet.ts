/**
 * EVM Wallet Tool
 * 
 * Domain: AI Tools - Blockchain Operations
 * Responsibility: Manage EVM wallets, query balances, perform on-chain operations
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, enumProp, stringProp } from "./create-tool";
import { ArgsArraySchema, argsArrayToRecord } from "./shared-arg-schemas";
import {
  defaultEvmWalletMcpClient,
  type EvmWalletToolName,
} from "@/server/services/mcp/evm-wallet-client";
import { getPrimaryChain, getSupportedChains, resolveDefaultRpcUrl } from "@/lib/chains";

// ============================================================================
// CONSTANTS
// ============================================================================

const EVM_TOOL_NAMES = [
  "wallet_provider_set",
  "wallet_create_random",
  "wallet_create_mnemonic_phrase",
  "wallet_from_private_key",
  "wallet_from_mnemonic",
  "wallet_from_encrypted_json",
  "wallet_encrypt",
  "wallet_get_address",
  "wallet_get_public_key",
  "wallet_get_private_key",
  "wallet_get_mnemonic",
  "wallet_get_balance",
  "wallet_get_chain_id",
  "wallet_get_gas_price",
  "wallet_get_transaction_count",
  "wallet_call",
  "wallet_send_transaction",
  "wallet_sign_transaction",
  "wallet_populate_transaction",
  "wallet_sign_message",
  "wallet_sign_typed_data",
  "wallet_verify_message",
  "wallet_verify_typed_data",
  "provider_get_block",
  "provider_get_transaction",
  "provider_get_transaction_receipt",
  "provider_get_code",
  "provider_get_storage_at",
  "provider_estimate_gas",
  "provider_get_logs",
  "provider_get_ens_resolver",
  "provider_lookup_address",
  "provider_resolve_name",
  "network_get_network",
  "network_get_block_number",
  "network_get_fee_data",
] as const satisfies readonly EvmWalletToolName[];

// ============================================================================
// TYPES
// ============================================================================

export interface EvmWalletToolInvocation {
  command: (typeof EVM_TOOL_NAMES)[number];
  args?: Array<{ key: string; value: UntypedJson }>;
  providerURL?: string;
}

interface EvmWalletOutput {
  command: string;
  text?: string;
  response?: UntypedJson;
  toolResult?: UntypedJson;
  error?: string;
}

export type EvmWalletToolInvocationResult = {
  state: "loading" | "ready" | "output-error";
  result?: {
    command: EvmWalletToolName;
    text: string;
    response: {
      content: { type: string; [key: string]: UntypedJson }[];
      isError?: boolean;
      toolResult?: UntypedJson;
    };
    toolResult?: UntypedJson;
  };
  errorText?: string;
};

// ============================================================================
// SCHEMA
// ============================================================================

const evmWalletSchema = createToolSchema(
  {
    command: enumProp("Name of the MCP tool to invoke on the EVM wallet server", EVM_TOOL_NAMES),
    args: ArgsArraySchema,
    providerURL: stringProp(
      "Optional RPC endpoint override for the wallet provider. Will call wallet_provider_set before invoking the tool.",
    ),
  },
  ["command"],
);

// ============================================================================
// CHAIN RESOLUTION HELPERS
// ============================================================================

type ChainAliasMap = Map<string, number>;

const NUMERIC_CHAIN_KEYS = [
  "chainId",
  "chain_id",
  "targetChainId",
  "destinationChainId",
  "destChainId",
  "sourceChainId",
  "originChainId",
  "fromChainId",
  "toChainId",
];

const TEXT_CHAIN_KEYS = [
  "chain",
  "chainName",
  "chain_name",
  "chainSlug",
  "network",
  "networkName",
  "network_name",
  "targetChain",
  "destinationChain",
  "destChain",
  "sourceChain",
  "originChain",
  "fromChain",
  "toChain",
  "baseChain",
];

const PROVIDER_KEYS = [
  "providerURL",
  "rpcUrl",
  "rpc",
  "rpcEndpoint",
  "rpc_url",
  "providerUrl",
];

let chainAliasCache: ChainAliasMap | null = null;
let defaultChainIdCache: number | null = null;

export function inferChainIdFromArgs(
  command: EvmWalletToolName,
  args: Record<string, UntypedJson>,
): number | null {
  const numericCandidate = extractNumericChainId(args);
  if (numericCandidate != null) {
    return numericCandidate;
  }

  const aliasCandidate = extractAliasChainId(args);
  if (aliasCandidate != null) {
    return aliasCandidate;
  }

  if (command === "wallet_create_random" || command === "wallet_create_mnemonic_phrase") {
    return getDefaultChainId();
  }

  return null;
}

function extractNumericChainId(source: Record<string, UntypedJson>): number | null {
  for (const key of NUMERIC_CHAIN_KEYS) {
    const candidate = coerceChainId(source[key]);
    if (candidate != null) {
      return candidate;
    }
  }

  const transaction = source.transaction;
  if (transaction && typeof transaction === "object") {
    return extractNumericChainId(transaction as Record<string, UntypedJson>);
  }

  return null;
}

function extractAliasChainId(source: Record<string, UntypedJson>): number | null {
  const aliasMap = getChainAliasMap();

  for (const key of TEXT_CHAIN_KEYS) {
    const value = source[key];
    if (typeof value !== "string") {
      continue;
    }
    const normalized = normalizeChainAlias(value);
    if (!normalized) {
      continue;
    }
    const chainId = aliasMap.get(normalized);
    if (chainId != null) {
      return chainId;
    }
  }

  const transaction = source.transaction;
  if (transaction && typeof transaction === "object") {
    return extractAliasChainId(transaction as Record<string, UntypedJson>);
  }

  return null;
}

export function inferProviderUrl(
  args: Record<string, UntypedJson>,
  explicitProvider: string | null,
  chainId: number | null,
): string | null {
  if (explicitProvider) {
    return explicitProvider;
  }

  for (const key of PROVIDER_KEYS) {
    const value = sanitizeProviderUrl(args[key]);
    if (value) {
      return value;
    }
  }

  const resolvedChainId = chainId ?? getDefaultChainId();
  return resolveDefaultRpcUrl(resolvedChainId);
}

function coerceChainId(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^0x[0-9a-f]+$/i.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 16);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function sanitizeProviderUrl(value: UntypedJson): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function getChainAliasMap(): ChainAliasMap {
  if (chainAliasCache) {
    return chainAliasCache;
  }

  const map: ChainAliasMap = new Map();
  const chains = getSupportedChains();

  for (const chain of chains) {
    addChainAlias(map, chain.id, chain.id.toString(10));
    addChainAlias(map, chain.id, chain.name);
    const networkName = (chain as { network?: string }).network;
    if (typeof networkName === "string") {
      addChainAlias(map, chain.id, networkName);
    }
    addChainAlias(map, chain.id, chain.nativeCurrency?.symbol);
  }

  const manualSynonyms: Record<number, string[]> = {
    1: ["eth", "ethereum", "mainnet", "ethereum-mainnet"],
    10: ["optimism", "op"],
    56: ["bsc", "binance", "bnbsmartchain", "bnb"],
    137: ["polygon", "matic"],
    324: ["zksync", "zksyncera"],
    8453: ["base", "coinbase", "base-mainnet"],
    42161: ["arbitrum", "arbitrumone"],
    43114: ["avalanche", "avax", "cchain"],
    42220: ["celo"],
    59144: ["linea"],
    11155111: ["sepolia", "eth-sepolia"],
    84532: ["base-sepolia", "basesepolia"],
  };

  for (const [idText, aliases] of Object.entries(manualSynonyms)) {
    const chainId = Number.parseInt(idText, 10);
    if (!chains.some((chain) => chain.id === chainId)) {
      continue;
    }
    for (const alias of aliases) {
      addChainAlias(map, chainId, alias);
    }
  }

  chainAliasCache = map;
  return map;
}

function addChainAlias(map: ChainAliasMap, chainId: number, alias: UntypedJson) {
  if (typeof alias !== "string") {
    return;
  }
  const normalized = normalizeChainAlias(alias);
  if (!normalized || map.has(normalized)) {
    return;
  }
  map.set(normalized, chainId);
}

function normalizeChainAlias(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getDefaultChainId(): number {
  if (defaultChainIdCache != null) {
    return defaultChainIdCache;
  }

  try {
    defaultChainIdCache = getPrimaryChain().id;
  } catch {
    defaultChainIdCache = 1;
  }

  return defaultChainIdCache;
}

// ============================================================================
// TOOL
// ============================================================================

export const evmWalletTool = createTool<EvmWalletToolInvocation, EvmWalletOutput>({
  description:
    "Access the Nex-T1 MCP crypto wallet server to manage EVM wallets, query balances, and perform on-chain operations. Requires production RPC endpoints.",
  schema: evmWalletSchema,
  execute: async (input: EvmWalletToolInvocation): Promise<EvmWalletOutput> => {
    const { command, args, providerURL } = input;

    // Convert args array to record
    const normalizedArgs: Record<string, UntypedJson> = args ? argsArrayToRecord(args) : {};
    const inferredChainId = inferChainIdFromArgs(command, normalizedArgs);

    if (inferredChainId != null && normalizedArgs.chainId == null) {
      normalizedArgs.chainId = inferredChainId;
    }

    const explicitProvider = sanitizeProviderUrl(providerURL);
    const effectiveProviderURL = inferProviderUrl(normalizedArgs, explicitProvider, inferredChainId);

    if (command === "wallet_provider_set") {
      const invocationArgs = { ...normalizedArgs };
      if (!invocationArgs.providerURL && effectiveProviderURL) {
        invocationArgs.providerURL = effectiveProviderURL;
      }

      const setProviderResult = await defaultEvmWalletMcpClient.invokeRaw(
        "wallet_provider_set",
        invocationArgs,
      );

      if (!setProviderResult.ok) {
        return { command, error: setProviderResult.text };
      }

      return {
        command,
        text: setProviderResult.text,
        response: setProviderResult.response,
        toolResult: setProviderResult.toolResult,
      };
    }

    if (effectiveProviderURL) {
      const setProviderResult = await defaultEvmWalletMcpClient.invokeRaw(
        "wallet_provider_set",
        { providerURL: effectiveProviderURL },
      );

      if (!setProviderResult.ok) {
        return { command, error: setProviderResult.text };
      }
    }

    const invocation = await defaultEvmWalletMcpClient.invokeRaw(command, normalizedArgs);

    if (!invocation.ok) {
      return { command, error: invocation.text };
    }

    return {
      command,
      text: invocation.text,
      response: invocation.response,
      toolResult: invocation.toolResult,
    };
  },
});

// Export schema for backward compatibility
export { evmWalletSchema };
