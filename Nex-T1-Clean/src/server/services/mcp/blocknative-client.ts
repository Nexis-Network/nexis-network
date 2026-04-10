import {
  HttpMcpClient,
  type HttpMcpClientOptions,
  type McpToolInvocationResult,
} from "./base-client";
import { formatUnits } from "viem";

import { logger } from "@/lib/logger";
import { lookupGasPrice } from "@/server/services/prices/gas-price";

export type BlocknativeToolName =
  | "predict_gas_price"
  | "estimate_gas_cost"
  | "get_supported_chains";

export type BlocknativeClientOptions = HttpMcpClientOptions;

const DEFAULT_BASE_URL =
  process.env.MCP_BLOCKNATIVE_BASE_URL ?? "https://blocknative.nex-t1.ai";
const DEFAULT_TIMEOUT =
  Number.parseInt(process.env.MCP_BLOCKNATIVE_TIMEOUT_MS ?? "", 10) || 5_000;
const DEFAULT_RETRIES =
  Number.parseInt(process.env.MCP_BLOCKNATIVE_RETRY_COUNT ?? "", 10) || 0;

const CHAIN_ALIAS_TO_ID = new Map<string, number>([
  ["1", 1],
  ["0x1", 1],
  ["eth", 1],
  ["ethereum", 1],
  ["mainnet", 1],
  ["10", 10],
  ["0xa", 10],
  ["optimism", 10],
  ["op", 10],
  ["137", 137],
  ["0x89", 137],
  ["polygon", 137],
  ["matic", 137],
  ["8453", 8453],
  ["0x2105", 8453],
  ["base", 8453],
  ["base-mainnet", 8453],
  ["42161", 42161],
  ["0xa4b1", 42161],
  ["arbitrum", 42161],
  ["arbitrum-one", 42161],
  ["43114", 43114],
  ["0xa86a", 43114],
  ["avalanche", 43114],
  ["avax", 43114],
]);

function parseChainId(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = value.trim().toLowerCase();
    const aliasMatch = CHAIN_ALIAS_TO_ID.get(normalized);
    if (aliasMatch) {
      return aliasMatch;
    }
    const parsed = normalized.startsWith("0x")
      ? Number.parseInt(normalized, 16)
      : Number.parseInt(normalized, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function resolvePredictGasPriceChainId(
  args: Record<string, UntypedJson>,
): number | null {
  return (
    parseChainId(args.chainId) ??
    parseChainId(args.chain) ??
    parseChainId(args.network) ??
    parseChainId(args.chainName)
  );
}

function buildPredictGasPriceFallback(
  chainId: number,
  gasPriceWei: string,
  options: { cached: boolean; stale?: boolean },
): McpToolInvocationResult<BlocknativeToolName> {
  const gwei = formatUnits(BigInt(gasPriceWei), 9);
  const freshness = options.stale
    ? "using stale cached RPC data"
    : options.cached
      ? "using cached RPC data"
      : "using live RPC data";
  const text = `Fallback gas price for chain ${chainId}: ${gwei} gwei (${gasPriceWei} wei), ${freshness}.`;
  const toolResult = {
    chainId,
    gasPriceWei,
    gasPriceGwei: gwei,
    source: "rpc-fallback",
    cached: options.cached,
    stale: Boolean(options.stale),
  } satisfies UntypedJson;

  return {
    ok: true,
    text,
    response: {
      content: [{ type: "text", text }],
      toolResult,
    },
    toolResult,
    tool: "predict_gas_price",
  };
}

export class BlocknativeMcpClient extends HttpMcpClient<BlocknativeToolName> {
  constructor(options: BlocknativeClientOptions = {}) {
    super(
      {
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        apiKey: options.apiKey ?? process.env.MCP_BLOCKNATIVE_API_KEY,
        requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_TIMEOUT,
        maxRetries: options.maxRetries ?? DEFAULT_RETRIES,
        defaultHeaders: options.defaultHeaders,
        name: "Blocknative MCP",
      },
    );
  }

  async invoke(
    tool: BlocknativeToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BlocknativeToolName>> {
    const result = await this.invokeRaw(tool, args);
    if (!result.ok) {
      throw new Error(result.text || `Blocknative MCP tool ${tool} failed`);
    }
    return result;
  }

  async invokeRaw(
    tool: BlocknativeToolName,
    args: Record<string, UntypedJson> = {},
  ): Promise<McpToolInvocationResult<BlocknativeToolName>> {
    try {
      return await super.invokeRaw(tool, args);
    } catch (error) {
      if (tool !== "predict_gas_price") {
        throw error;
      }

      const chainId = resolvePredictGasPriceChainId(args);
      if (!chainId) {
        throw error;
      }

      try {
        const gasSnapshot = await lookupGasPrice(chainId);
        logger.warn("[blocknative] Falling back to RPC gas price lookup", {
          chainId,
          error,
        });
        return buildPredictGasPriceFallback(chainId, gasSnapshot.gasPriceWei, {
          cached: gasSnapshot.cached,
          stale: gasSnapshot.stale,
        });
      } catch (fallbackError) {
        logger.warn("[blocknative] RPC gas price fallback failed", {
          chainId,
          error,
          fallbackError,
        });
        throw error;
      }
    }
  }
}

export const defaultBlocknativeClient = new BlocknativeMcpClient();
