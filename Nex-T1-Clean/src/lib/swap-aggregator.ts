"use server";

import { SwapAggregatorError } from "./swap-aggregator-error";
import { vendorCacheKey, withVendorCache } from "./vendors";

const LIFI_BASE_URL = "https://li.quest/v1";
const DEFAULT_FROM_ADDRESS = "0x000000000000000000000000000000000000BEEF";
const TOKEN_CACHE_TTL_SECONDS = 300;

const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1,
  mainnet: 1,
  eth: 1,
  arbitrum: 42161,
  arb: 42161,
  optimism: 10,
  op: 10,
  polygon: 137,
  matic: 137,
  "matic-mainnet": 137,
  base: 8453,
  avalanche: 43114,
  avax: 43114,
  "bsc-mainnet": 56,
  bsc: 56,
  binance: 56,
};

const CHAIN_NAME_MAP: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
};

type LifiTokenResponse = {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
  coinKey?: string;
};

type LifiQuoteToken = {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
};

type LifiEstimateCost = {
  name?: string;
  description?: string;
  amount?: string;
  amountUSD?: string;
  percentage?: string;
  token?: {
    symbol?: string;
    address?: string;
    decimals?: number;
  };
  included?: boolean;
};

type LifiEstimateGasCost = {
  type?: string;
  amount?: string;
  amountUSD?: string;
  price?: string;
  estimate?: string;
  token?: {
    symbol?: string;
    address?: string;
  };
};

type LifiQuoteResponse = {
  id: string;
  type?: string;
  tool?: string;
  toolDetails?: { key?: string; name?: string; logoURI?: string };
  action: {
    fromToken: LifiQuoteToken;
    toToken: LifiQuoteToken;
    fromAmount: string;
    toAmount: string;
    fromChainId: number;
    toChainId: number;
    slippage?: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin?: string;
    executionDuration?: number;
    approvalAddress?: string;
    feeCosts?: LifiEstimateCost[];
    gasCosts?: LifiEstimateGasCost[];
    fromAmountUSD?: string;
    toAmountUSD?: string;
  };
  includedSteps?: Array<{
    tool?: string;
    toolDetails?: { name?: string };
  }>;
  transactionRequest?: {
    to?: string;
    data?: string;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
    chainId?: number;
  };
  integrator?: string;
};

export type SwapQuoteRequest = {
  fromToken: string;
  toToken: string;
  amount?: string;
  tradeType?: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippagePercentage?: number;
  fromChainId?: number | string;
  toChainId?: number | string;
  fromAddress?: string;
  toAddress?: string;
  notes?: string;
};

export type SwapQuotePayload = {
  provider: string;
  providerUrl: string;
  input: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippagePercentage: number;
    fromChainId: number;
    toChainId: number;
    fromAddress: string;
    toAddress: string;
    notes?: string;
  };
  fromToken: {
    name: string;
    symbol: string;
    address: string;
    image?: string;
    network: string;
    decimals: number;
    priceUsd?: number;
  };
  toToken: {
    name: string;
    symbol: string;
    address: string;
    image?: string;
    network: string;
    decimals: number;
    priceUsd?: number;
  };
  amountIn: number;
  amountOut: number;
  usdValue: number;
  minReceived: number;
  priceImpact: number;
  slippage: number;
  etaSeconds: number;
  route: string[];
  warnings: string[];
  quoteId: string;
  aggregator: {
    quote: {
      id: string;
      tool?: string;
      toolDetails?: { key?: string; name?: string; logoURI?: string };
      approvalAddress?: string;
      feeCosts: Array<{
        name?: string;
        amount?: string;
        amountUSD?: string;
        included?: boolean;
      }> ;
      gasCosts: Array<{
        type?: string;
        amount?: string;
        amountUSD?: string;
      }>;
      fromAmountUSD?: string;
      toAmountUSD?: string;
    };
    transactionRequest?: {
      to?: string;
      data?: string;
      value?: string;
      gasLimit?: string;
      gasPrice?: string;
      chainId?: number;
    };
  };
};

function resolveChainId(value?: string | number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim().toLowerCase();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return CHAIN_ID_MAP[trimmed] ?? null;
  }
  return null;
}

async function fetchTokenMetadata(
  chainId: number,
  token: string,
): Promise<LifiTokenResponse> {
  const cacheKey = vendorCacheKey(["lifi", "token", chainId, token.toLowerCase()]);

  const { data } = await withVendorCache(cacheKey, TOKEN_CACHE_TTL_SECONDS, async () => {
    const url = new URL(`${LIFI_BASE_URL}/token`);
    url.searchParams.set("chain", String(chainId));
    url.searchParams.set("token", token);

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await safeRead(response);
      throw new SwapAggregatorError(
        `Li.Fi token metadata request failed (${response.status})`,
        errorBody,
      );
    }

    const payload = (await response.json()) as LifiTokenResponse;
    if (!payload?.address || typeof payload.decimals !== "number") {
      throw new SwapAggregatorError(
        `Li.Fi token metadata missing required fields for ${token}`,
      );
    }
    return payload;
  });

  return data;
}

import { getZeroExSwapQuote, getIndicativePrice } from "@/server/swap/0x";


import { logger } from '@/lib/logger';
// Helper to normalize 0x quote to SwapQuotePayload
async function getZeroExSwapQuoteAsPayload(request: SwapQuoteRequest): Promise<SwapQuotePayload> {
    const fromChainId = resolveChainId(request.fromChainId) || 1;
    
    // Determine strict buy/sell amount
    const isExactOutput = request.tradeType === "EXACT_OUTPUT";
    const sellAmount = isExactOutput ? undefined : request.amount;
    const buyAmount = isExactOutput ? request.amount : undefined;

    const quote = await getZeroExSwapQuote({
        sellToken: request.fromToken,
        buyToken: request.toToken,
        sellAmount, 
        buyAmount,
        chainId: fromChainId,
        takerAddress: request.fromAddress
    });

    // Fetch token metadata to populate payload
    const [fromTokenMeta, toTokenMeta] = await Promise.all([
        fetchTokenMetadata(fromChainId, request.fromToken),
        fetchTokenMetadata(fromChainId, request.toToken),
    ]);

    const amountIn = fromBaseUnitAmount(quote.sellAmount, fromTokenMeta.decimals);
    const amountOut = fromBaseUnitAmount(quote.buyAmount, toTokenMeta.decimals);
    // Approximate USD value based on price (exchange rate) * amountIn
    // quote.price is sellTokenToBuyToken rate usually? Or buy/sell?
    // 0x /swap/v1/quote: price is "The price of buyToken in sellToken".
    // So 1 sellToken = price * buyToken.
    // Wait, usually it is 1 unit of sellToken = X units of buyToken.
    // Let's assume price is decent proxy.
    // Note: We don't have real USD prices easily without fetching them. 
    // fetchTokenMetadata returns priceUSD if available from Lifi.
    
    const fromPriceUsd = fromTokenMeta.priceUSD ? parseFloat(fromTokenMeta.priceUSD) : 0;
    const toPriceUsd = toTokenMeta.priceUSD ? parseFloat(toTokenMeta.priceUSD) : 0;
    
    const usdValue = fromPriceUsd * amountIn || toPriceUsd * amountOut || 0;
    const slippage = request.slippagePercentage || 0.5;

    return {
        provider: "0x",
        providerUrl: "https://0x.org/",
        input: {
            fromToken: request.fromToken,
            toToken: request.toToken,
            amount: request.amount || "0",
            slippagePercentage: slippage,
            fromChainId: fromChainId,
            toChainId: fromChainId,
            fromAddress: request.fromAddress || DEFAULT_FROM_ADDRESS,
            toAddress: request.toAddress || request.fromAddress || DEFAULT_FROM_ADDRESS,
            notes: request.notes,
        },
        fromToken: {
             name: fromTokenMeta.name,
             symbol: fromTokenMeta.symbol,
             address: request.fromToken,
             image: fromTokenMeta.logoURI,
             network: CHAIN_NAME_MAP[fromChainId] ?? `Chain ${fromChainId}`,
             decimals: fromTokenMeta.decimals,
             priceUsd: fromPriceUsd
        },
        toToken: {
             name: toTokenMeta.name,
             symbol: toTokenMeta.symbol,
             address: request.toToken,
             image: toTokenMeta.logoURI,
             network: CHAIN_NAME_MAP[fromChainId] ?? `Chain ${fromChainId}`,
             decimals: toTokenMeta.decimals,
             priceUsd: toPriceUsd
        },
        amountIn,
        amountOut,
        usdValue,
        minReceived: amountOut * (1 - slippage/100),
        priceImpact: 0,
        slippage,
        etaSeconds: 15,
        route: ["0x"],
        warnings: [],
        quoteId: `0x-${Date.now()}`,
        aggregator: {
            quote: {
                id: `0x-${Date.now()}`,
                tool: "0x",
                toolDetails: { key: "0x", name: "0x", logoURI: "https://0x.org/images/0x_logo.png" },
                feeCosts: [],
                gasCosts: [{
                    type: "gas",
                    amount: quote.estimatedGas,
                    amountUSD: "0" // Need gas price to calc
                }],
                fromAmountUSD: (fromPriceUsd * amountIn).toString(),
                toAmountUSD: (toPriceUsd * amountOut).toString()
            },
            transactionRequest: {
                to: quote.to,
                data: quote.data,
                value: quote.value,
                gasLimit: quote.gas,
                gasPrice: quote.gasPrice,
                chainId: fromChainId
            }
        }
    };
}

// ... existing code

export async function getSwapQuote(
  request: SwapQuoteRequest,
): Promise<SwapQuotePayload> {
  // Determine if we should use 0x or Li.Fi. 
  // For now, let's implement a simple logic: if 0x API key is set, try 0x for EVM chains?
  // Or just race them?
  // Let's stick to Li.Fi as primary for now, but if it fails, try 0x?
  // Or better, let's verify if user specifically asked for one.
  // The request object doesn't have provider preference.
  
  // Implementation: Parallel fetch if reasonable, or just Li.Fi for now + 0x support.
  // User asked to "implement the remaining 0x v2 API functionality". 
  // This likely means ensuring `getZeroExSwapQuote` is callable and returns standardized payload.
  
  // Let's try attempting 0x if checking 0x env var exists, otherwise Li.Fi.
  // Actually, Li.Fi aggregates 0x too. 
  // Prioritize 0x API as requested
  try {
      return await getZeroExSwapQuoteAsPayload(request);
  } catch (zeroExError) {
      logger.warn("0x failed, trying Li.Fi...", zeroExError);
      try {
          return await getLiFiQuote(request);
      } catch (lifiError) {
           logger.warn("Li.Fi fallback failed", lifiError);
           throw zeroExError; // Throw original error preference or new one
      }
  }
}

export async function getSwapPrice(request: SwapQuoteRequest) {
    // Uses 0x Indicative Price
    const fromChainId = resolveChainId(request.fromChainId) || 1;
    
    // 0x Indicative Price mostly needs token addresses and amount
    // It returns a minimalist response compared to full quote
    const price = await getIndicativePrice({
        sellToken: request.fromToken,
        buyToken: request.toToken,
        sellAmount: request.amount, // Indicative price can also work with buyAmount if supported
        chainId: fromChainId,
        takerAddress: request.fromAddress
    });
    
    // Return raw 0x price response for now, or match a simplified payload
    return price;
}

async function getLiFiQuote(request: SwapQuoteRequest): Promise<SwapQuotePayload> {
  const fromChainId =
    resolveChainId(request.fromChainId ?? null) ??
    resolveChainId(request.toChainId ?? null) ??
    1;
  const toChainId =
    resolveChainId(request.toChainId ?? null) ??
    fromChainId;

  // ... (Existing Li.Fi logic moved here)
  const [fromTokenMeta, toTokenMeta] = await Promise.all([
    fetchTokenMetadata(fromChainId, request.fromToken),
    fetchTokenMetadata(toChainId, request.toToken),
  ]);

  const amountInput = sanitizeAmount(request.amount);
  const amountBaseUnits = toBaseUnitAmount(amountInput, fromTokenMeta.decimals);
  // ... (rest of the function)
  
  const fromAddress = normalizeAddress(request.fromAddress) ?? DEFAULT_FROM_ADDRESS;
  const toAddress =
    normalizeAddress(request.toAddress) ?? normalizeAddress(request.fromAddress) ?? DEFAULT_FROM_ADDRESS;

  const slippagePct =
    Number.isFinite(request.slippagePercentage) && request.slippagePercentage! > 0
      ? request.slippagePercentage!
      : 0.5;

  const url = new URL(`${LIFI_BASE_URL}/quote`);
  url.searchParams.set("fromChain", String(fromChainId));
  url.searchParams.set("toChain", String(toChainId));
  url.searchParams.set("fromToken", fromTokenMeta.address);
  url.searchParams.set("toToken", toTokenMeta.address);
  url.searchParams.set("fromAmount", amountBaseUnits);
  url.searchParams.set("fromAddress", fromAddress);
  url.searchParams.set("toAddress", toAddress);
  url.searchParams.set("slippage", (slippagePct / 100).toString());
  url.searchParams.set("integrator", "nex-dashboard");

   const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const body = await safeRead(response);
  if (!response.ok) {
    throw new SwapAggregatorError(
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: string }).message)
        : `Li.Fi quote request failed (${response.status})`,
      body,
    );
  }

  const quote = body as LifiQuoteResponse;

  if (!quote?.id || !quote?.estimate || !quote?.action) {
    throw new SwapAggregatorError("Li.Fi quote payload missing required fields", quote);
  }

  const amountIn = fromBaseUnitAmount(
    quote.action.fromAmount,
    quote.action.fromToken.decimals,
  );
  const amountOut = fromBaseUnitAmount(
    quote.estimate.toAmount,
    quote.action.toToken.decimals,
  );
  const minReceived = fromBaseUnitAmount(
    quote.estimate.toAmountMin ?? quote.estimate.toAmount,
    quote.action.toToken.decimals,
  );
  const usdValue = parseFloat(quote.estimate.fromAmountUSD ?? quote.estimate.toAmountUSD ?? "0") || 0;
  const priceImpact = computePriceImpact(
    quote.estimate.fromAmountUSD,
    quote.estimate.toAmountUSD,
  );
  const etaSeconds = quote.estimate.executionDuration ?? 30;

  const route = buildRoute(quote);
  const warnings = buildWarnings({
    priceImpact,
    slippagePct,
    feeCosts: quote.estimate.feeCosts ?? [],
  });

  return {
    provider: "Li.Fi Aggregator",
    providerUrl: "https://app.li.fi/bridge",
    input: {
      fromToken: request.fromToken,
      toToken: request.toToken,
      amount: amountInput,
      slippagePercentage: slippagePct,
      fromChainId,
      toChainId,
      fromAddress,
      toAddress,
      notes: request.notes,
    },
    fromToken: {
      name: quote.action.fromToken.name,
      symbol: quote.action.fromToken.symbol,
      address: quote.action.fromToken.address,
      image: quote.action.fromToken.logoURI,
      network: CHAIN_NAME_MAP[fromChainId] ?? `Chain ${fromChainId}`,
      decimals: quote.action.fromToken.decimals,
      priceUsd: quote.action.fromToken.priceUSD
        ? Number.parseFloat(quote.action.fromToken.priceUSD)
        : undefined,
    },
    toToken: {
      name: quote.action.toToken.name,
      symbol: quote.action.toToken.symbol,
      address: quote.action.toToken.address,
      image: quote.action.toToken.logoURI,
      network: CHAIN_NAME_MAP[toChainId] ?? `Chain ${toChainId}`,
      decimals: quote.action.toToken.decimals,
      priceUsd: quote.action.toToken.priceUSD
        ? Number.parseFloat(quote.action.toToken.priceUSD)
        : undefined,
    },
    amountIn,
    amountOut,
    usdValue,
    minReceived,
    priceImpact,
    slippage: slippagePct,
    etaSeconds,
    route,
    warnings,
    quoteId: quote.id,
    aggregator: {
      quote: {
        id: quote.id,
        tool: quote.tool,
        toolDetails: quote.toolDetails,
        approvalAddress: quote.estimate.approvalAddress,
        feeCosts: simplifyCosts(quote.estimate.feeCosts),
        gasCosts: simplifyGasCosts(quote.estimate.gasCosts),
        fromAmountUSD: quote.estimate.fromAmountUSD,
        toAmountUSD: quote.estimate.toAmountUSD,
      },
      transactionRequest: quote.transactionRequest
        ? {
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
            gasLimit: quote.transactionRequest.gasLimit,
            gasPrice: quote.transactionRequest.gasPrice,
            chainId: quote.transactionRequest.chainId,
          }
        : undefined,
    },
  };
}

function sanitizeAmount(amount?: string): string {
  if (!amount) return "1";
  const cleaned = amount.replace(/[,$]/g, "").trim();
  return cleaned && !Number.isNaN(Number.parseFloat(cleaned)) ? cleaned : "1";
}

function normalizeAddress(address?: string | null): string | null {
  if (typeof address !== "string") return null;
  const trimmed = address.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function toBaseUnitAmount(amount: string, decimals: number): string {
  const [wholePart, fractionalPart = ""] = amount.split(".");
  const whole = wholePart.replace(/\D/g, "") || "0";
  const fractionDigits = fractionalPart.replace(/\D/g, "");
  const paddedFraction = (fractionDigits + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "");
  return combined || "0";
}

function fromBaseUnitAmount(value: string, decimals: number): number {
  if (!value) return 0;
  const base = Number.parseFloat(value);
  if (!Number.isFinite(base)) {
    return 0;
  }
  return base / Math.pow(10, decimals);
}

function computePriceImpact(fromUsd?: string, toUsd?: string): number {
  const fromValue = Number.parseFloat(fromUsd ?? "");
  const toValue = Number.parseFloat(toUsd ?? "");
  if (!Number.isFinite(fromValue) || fromValue <= 0 || !Number.isFinite(toValue)) {
    return 0;
  }
  const delta = fromValue - toValue;
  return Number.isFinite(delta) ? (delta / fromValue) * 100 : 0;
}

function buildRoute(quote: LifiQuoteResponse): string[] {
  const steps = quote.includedSteps ?? [];
  const names = steps
    .map((step) => step.toolDetails?.name ?? step.tool)
    .filter((name): name is string => Boolean(name));
  const unique = Array.from(new Set(names));
  if (unique.length > 0) {
    return unique;
  }
  if (quote.toolDetails?.name) {
    return [quote.toolDetails.name];
  }
  if (quote.tool) {
    return [quote.tool];
  }
  return ["Li.Fi Route"];
}

function buildWarnings({
  priceImpact,
  slippagePct,
  feeCosts,
}: {
  priceImpact: number;
  slippagePct: number;
  feeCosts: LifiEstimateCost[];
}): string[] {
  const warnings: string[] = [];
  if (priceImpact > 1) {
    warnings.push(
      `Price impact is approximately ${priceImpact.toFixed(2)}%. Review before executing.`,
    );
  }
  if (slippagePct > 1) {
    warnings.push(
      `Slippage tolerance is set to ${slippagePct.toFixed(2)}%. Consider tightening it if you want stronger protection.`,
    );
  }
  const totalFeeUsd = feeCosts.reduce((sum, fee) => {
    const amount = Number.parseFloat(fee.amountUSD ?? "");
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
  if (totalFeeUsd > 0) {
    warnings.push(
      `Aggregated fees total ~$${totalFeeUsd.toFixed(2)} and are baked into the quote.`,
    );
  }
  return warnings;
}

function simplifyCosts(costs?: LifiEstimateCost[] | null) {
  if (!Array.isArray(costs)) return [];
  return costs.map((cost) => ({
    name: cost.name,
    amount: cost.amount,
    amountUSD: cost.amountUSD,
    included: cost.included,
  }));
}

function simplifyGasCosts(costs?: LifiEstimateGasCost[] | null) {
  if (!Array.isArray(costs)) return [];
  return costs.map((cost) => ({
    type: cost.type,
    amount: cost.amount,
    amountUSD: cost.amountUSD,
  }));
}

async function safeRead(response: Response): Promise<UntypedJson> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as UntypedJson;
  } catch {
    return { raw: text };
  }
}
