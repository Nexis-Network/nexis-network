/**
 * CDP Offramp (Cash Out to Fiat) Service
 *
 * Domain: Nex Wallet Operations
 * Responsibility: Generate Coinbase Offramp URLs for selling crypto to fiat.
 * Depends on: CDP_API_KEY_ID + CDP_API_KEY_SECRET env vars
 *
 * Uses the Coinbase Pay secure sell flow: https://pay.coinbase.com/v3/sell/input
 */
import "server-only";

import { logger } from "@/lib/logger";
import { z } from "zod";

import { createCdpSessionToken } from "@/server/services/cdp/session-token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfframpUrlParams = {
  /** The wallet address to sell from */
  address: string;
  /** Crypto amount to sell */
  amount?: number;
  /** Asset symbol, e.g. "ETH", "USDC" */
  asset?: string;
  /** Target fiat currency code, e.g. "USD", "EUR" */
  fiatCurrency?: string;
  /** EVM chain ID (e.g. 8453 for Base) */
  chainId?: number;
  /** End-user IP required by Coinbase secure initialization */
  clientIp: string;
  /** Stable application user reference for Coinbase Pay */
  partnerUserRef: string;
  /** Redirect target after the sell flow completes */
  redirectUrl: string;
};

export type OfframpUrlResult = {
  url: string;
  expiresAt?: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const offrampParamsSchema = z.object({
  address: z.string().min(1, "Wallet address is required"),
  amount: z.number().positive().optional(),
  asset: z.string().min(1).max(20).default("ETH"),
  fiatCurrency: z.string().min(1).max(10).default("USD"),
  chainId: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Chain ID to Coinbase network name mapping
// ---------------------------------------------------------------------------

const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: "ethereum",
  8453: "base",
  10: "optimism",
  42161: "arbitrum",
  137: "polygon",
  43114: "avalanche-c-chain",
  56: "bsc",
};

function resolveNetwork(chainId?: number): string {
  if (!chainId) return "base";
  return CHAIN_ID_TO_NETWORK[chainId] ?? "base";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Generate a Coinbase Offramp (sell) URL for a given wallet address.
 *
 * The user opens this URL in a new tab to complete the fiat cash-out flow
 * through Coinbase Pay. A linked Coinbase account is required.
 */
export async function getCdpOfframpUrl(
  params: OfframpUrlParams,
): Promise<OfframpUrlResult> {
  const partnerUserRef = params.partnerUserRef?.trim();
  if (!partnerUserRef) {
    throw new Error("partnerUserRef is required for Coinbase offramp");
  }

  const redirectUrl = params.redirectUrl?.trim();
  if (!redirectUrl) {
    throw new Error("redirectUrl is required for Coinbase offramp");
  }

  const clientIp = params.clientIp?.trim();
  if (!clientIp) {
    throw new Error("clientIp is required for Coinbase secure initialization");
  }

  const network = resolveNetwork(params.chainId);
  const asset = params.asset ?? "ETH";
  const session = await createCdpSessionToken({
    addresses: [
      {
        address: params.address,
        blockchains: [network],
      },
    ],
    assets: [asset],
    clientIp,
  });

  const baseUrl = "https://pay.coinbase.com/v3/sell/input";
  const urlParams = new URLSearchParams({
    sessionToken: session.token,
    partnerUserRef,
    redirectUrl,
    defaultNetwork: network,
    defaultAsset: asset,
  });

  if (params.amount !== undefined && params.amount > 0) {
    urlParams.set("presetCryptoAmount", String(params.amount));
  }

  urlParams.set("fiatCurrency", (params.fiatCurrency ?? "USD").toUpperCase());

  const url = `${baseUrl}?${urlParams.toString()}`;

  logger.info("cdp_offramp_url_generated", {
    address: params.address,
    asset,
    network,
    amount: params.amount,
    fiatCurrency: params.fiatCurrency ?? "USD",
  });

  return { url };
}
