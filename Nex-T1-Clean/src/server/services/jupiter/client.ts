/**
 * Jupiter V6 API client for Solana token swaps.
 *
 * Jupiter is the dominant DEX aggregator on Solana, providing the best
 * routes across all Solana liquidity sources (Raydium, Orca, Meteora, etc.).
 *
 * Endpoints used:
 *   GET  /quote            — Get swap quote (route + amounts)
 *   POST /swap             — Build swap transaction (base64 serialized)
 *   GET  /tokens           — Token list
 *
 * @see https://station.jup.ag/docs/apis/swap-api
 */

import { logger } from "@/lib/logger";

const JUPITER_API_BASE = "https://quote-api.jup.ag/v6";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JupiterQuoteRequest = {
  inputMint: string;
  outputMint: string;
  /** Amount in base units (lamports for SOL, smallest unit for SPL tokens) */
  amount: string;
  /** Slippage in basis points (e.g., 50 = 0.5%) */
  slippageBps?: number;
  /** Use "ExactIn" or "ExactOut" */
  swapMode?: "ExactIn" | "ExactOut";
  /** Restrict to specific DEXes */
  onlyDirectRoutes?: boolean;
  /** Max accounts to use (lower = more compatible with versioned txs) */
  maxAccounts?: number;
};

export type JupiterRoutePlanStep = {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
};

export type JupiterQuoteResponse = {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: JupiterRoutePlanStep[];
  contextSlot?: number;
  timeTaken?: number;
};

export type JupiterSwapRequest = {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  /** Wrap/unwrap SOL automatically */
  wrapAndUnwrapSol?: boolean;
  /** Use shared accounts to reduce tx size */
  useSharedAccounts?: boolean;
  /** Priority fee in lamports */
  computeUnitPriceMicroLamports?: number;
  /** Use versioned transactions (recommended) */
  asLegacyTransaction?: boolean;
};

export type JupiterSwapResponse = {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
};

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export async function getJupiterQuote(
  params: JupiterQuoteRequest,
): Promise<JupiterQuoteResponse> {
  const url = new URL(`${JUPITER_API_BASE}/quote`);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", params.amount);
  url.searchParams.set("slippageBps", String(params.slippageBps ?? 50));
  if (params.swapMode) url.searchParams.set("swapMode", params.swapMode);
  if (params.onlyDirectRoutes) url.searchParams.set("onlyDirectRoutes", "true");
  if (params.maxAccounts) url.searchParams.set("maxAccounts", String(params.maxAccounts));

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.error("Jupiter quote failed", {
      status: response.status,
      error: errorText.slice(0, 500),
    });
    throw new Error(`Jupiter quote failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  return (await response.json()) as JupiterQuoteResponse;
}

export async function getJupiterSwapTransaction(
  params: JupiterSwapRequest,
): Promise<JupiterSwapResponse> {
  const response = await fetch(`${JUPITER_API_BASE}/swap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
      useSharedAccounts: params.useSharedAccounts ?? true,
      computeUnitPriceMicroLamports: params.computeUnitPriceMicroLamports,
      asLegacyTransaction: params.asLegacyTransaction ?? false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.error("Jupiter swap tx build failed", {
      status: response.status,
      error: errorText.slice(0, 500),
    });
    throw new Error(`Jupiter swap tx build failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  return (await response.json()) as JupiterSwapResponse;
}

// ---------------------------------------------------------------------------
// Well-known Solana token mints
// ---------------------------------------------------------------------------

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_SOL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_SOL_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
