"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatUnits } from "viem";
import type { UnifiedFungibleAsset } from "@/types/wallet-unified";
import { logger } from "@/lib/logger";

type EvmTokenLike = {
  token_address?: string;
  symbol?: string;
  name?: string;
  balance?: string;
  decimals?: number | string;
  logo?: string;
  thumbnail?: string;
  usd_price?: number | string | null;
  usd_value?: number | string | null;
  usd_price_24hr_percent_change?: number | string | null;
  native_token?: boolean;
};

type AssetType = "evm" | "solana";

type WalletPortfolioResponse = {
  tokens?: UntypedJson[];
  native?: UntypedJson | null;
  error?: string;
};

type WalletPortfolioFetchError = Error & {
  status?: number;
};

export interface UnifiedAsset {
  id: string; // unique id (contract address or symbol for native)
  symbol: string;
  name: string;
  balance: string; // raw
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  priceUsd: number | null;
  valueUsd: number | null;
  change24hPercent?: number | null;
  logoURI: string | null;
  isNative: boolean;
  chain?: string;
}

const EVM_CHAIN_FETCH_BATCH_SIZE = 2;
const MAX_PORTFOLIO_RETRY_ATTEMPTS = 2;
const PORTFOLIO_RETRY_BASE_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 250;

const RETRIABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted", "AbortError");
  }

  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function isRetriableError(status: number | null): boolean {
  if (status == null) return false;
  return RETRIABLE_HTTP_STATUS.has(status);
}

async function fetchWalletPortfolio(params: {
  address: string;
  chainFamily: AssetType;
  chainId?: string;
  signal?: AbortSignal;
}): Promise<WalletPortfolioResponse> {
  const searchParams = new URLSearchParams({
    address: params.address,
    chainFamily: params.chainFamily,
  });

  if (params.chainId) {
    searchParams.set("chainId", params.chainId);
  }

  const response = await fetch(`/api/wallets/portfolio?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: params.signal,
  });

  throwIfAborted(params.signal);

  let payload: WalletPortfolioResponse = {};

  try {
    payload = (await response.json()) as WalletPortfolioResponse;
  } catch (error) {
    if (isAbortError(error) || params.signal?.aborted) {
      throw createAbortError();
    }
  }

  if (!response.ok) {
    const error = new Error(payload.error ?? "Failed to fetch portfolio data") as WalletPortfolioFetchError;
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchWalletPortfolioWithRetry(params: {
  address: string;
  chainFamily: AssetType;
  chainId?: string;
  signal?: AbortSignal;
}): Promise<WalletPortfolioResponse> {
  let attempt = 0;

  while (true) {
    throwIfAborted(params.signal);

    try {
      return await fetchWalletPortfolio(params);
    } catch (error) {
      if (isAbortError(error) || params.signal?.aborted) {
        throw createAbortError();
      }

      const status = getHttpStatus(error);
      const shouldRetry = isRetriableError(status) && attempt < MAX_PORTFOLIO_RETRY_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }

      const jitterMs = Math.floor(Math.random() * 120);
      const backoffDelayMs = PORTFOLIO_RETRY_BASE_DELAY_MS * 2 ** attempt + jitterMs;
      await wait(backoffDelayMs, params.signal);
      attempt += 1;
    }
  }
}

function normalizeBalanceString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "0";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value).toString() : "0";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return "0";
}

function normalizeDecimals(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseFiniteNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function formatUiAmountString(balance: string, decimals: number): string {
  try {
    return formatUnits(BigInt(balance), decimals);
  } catch {
    const parsed = Number.parseFloat(balance);
    return Number.isFinite(parsed) ? parsed.toString() : "0";
  }
}

function toApproximateNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasPositiveBalance(balance: string): boolean {
  try {
    return BigInt(balance) > 0n;
  } catch {
    return Number.parseFloat(balance) > 0;
  }
}

export function useWalletAssets(address: string | undefined, type: AssetType) {
  const [assets, setAssets] = useState<UnifiedAsset[]>([]);
  const [nativeBalance, setNativeBalance] = useState<UnifiedAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequestIdRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchAssets = useCallback(async () => {
    activeRequestIdRef.current += 1;
    const requestId = activeRequestIdRef.current;
    activeControllerRef.current?.abort();

    if (!address) {
      activeControllerRef.current = null;
      setAssets([]);
      setNativeBalance(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    const isCurrentRequest = () =>
      requestId === activeRequestIdRef.current && !controller.signal.aborted;

    setIsLoading(true);
    setError(null);

    try {
      if (type === "evm") {
        // Supported Chains: Eth, Base, Op, Matic, Avax, Bnb, Linea, Arb
        const SUPPORTED_CHAINS = [
          "0x1", // Ethereum
          "0x2105", // Base
          "0xa", // Optimism
          "0x89", // Polygon
          "0xa86a", // Avalanche
          "0x38", // BNB Chain
          "0xe708", // Linea
          "0xa4b1", // Arbitrum
        ];

        const CHAIN_NATIVE_METADATA: Record<string, { symbol: string; name: string }> = {
          "0x1": { symbol: "ETH", name: "Ether" },
          "0x2105": { symbol: "ETH", name: "Ether" },
          "0xa": { symbol: "ETH", name: "Ether" },
          "0x89": { symbol: "POL", name: "Polygon Ecosystem Token" },
          "0xa86a": { symbol: "AVAX", name: "Avalanche" },
          "0x38": { symbol: "BNB", name: "BNB" },
          "0xe708": { symbol: "ETH", name: "Ether" },
          "0xa4b1": { symbol: "ETH", name: "Ether" },
        };

        const results: Array<{ tokens: UntypedJson[]; native: UntypedJson | null | undefined; chain: string }> = [];

        for (let offset = 0; offset < SUPPORTED_CHAINS.length; offset += EVM_CHAIN_FETCH_BATCH_SIZE) {
          const chainBatch = SUPPORTED_CHAINS.slice(offset, offset + EVM_CHAIN_FETCH_BATCH_SIZE);
          const batchResults = await Promise.all(
            chainBatch.map(async (chain) => {
              try {
                const { tokens, native, error: err } = await fetchWalletPortfolioWithRetry({
                  address,
                  chainFamily: "evm",
                  chainId: chain,
                  signal: controller.signal,
                });
                if (err) {
                  logger.warn(`Failed to fetch assets for chain ${chain}:`, err);
                  return { tokens: [], native: null, chain };
                }
                return { tokens: tokens || [], native, chain };
              } catch (chainError) {
                logger.warn(`Failed to fetch assets for chain ${chain}:`, chainError);
                return { tokens: [], native: null, chain };
              }
            }),
          );
          results.push(...batchResults);
        }

        if (!isCurrentRequest()) {
          return;
        }

        let allAssets: UnifiedAsset[] = [];

        results.forEach(({ tokens, native, chain }) => {
          // Map Native
          if (native) {
            const metadata = CHAIN_NATIVE_METADATA[chain] || { symbol: "ETH", name: "Ether" };
            const nativeBalanceRaw = normalizeBalanceString((native as EvmTokenLike).balance);
            const uiAmountString = formatUiAmountString(nativeBalanceRaw, 18);
            const nativeAsset: UnifiedAsset = {
              id: `native-${chain}`, // Unique ID per chain
              symbol: metadata.symbol,
              name: metadata.name,
              balance: nativeBalanceRaw,
              decimals: 18,
              uiAmount: toApproximateNumber(uiAmountString),
              uiAmountString,
              priceUsd: null,
              valueUsd: null,
              logoURI: null,
              isNative: true,
              chain,
            };
            // Only add if balance > 0 to avoid clutter
            if (hasPositiveBalance(nativeBalanceRaw)) {
              allAssets.push(nativeAsset);
            }
          }

          // Map Tokens
          const mappedTokens: UnifiedAsset[] = (tokens as EvmTokenLike[]).map((t) => {
            const decimals = normalizeDecimals(t.decimals, 18);
            const balance = normalizeBalanceString(t.balance);
            const uiAmountString = formatUiAmountString(balance, decimals);
            const priceUsd = parseFiniteNumber(t.usd_price);
            const valueUsd = parseFiniteNumber(t.usd_value);
            const change = parseFiniteNumber(t.usd_price_24hr_percent_change);
            const tokenAddress = t.token_address ?? "";
            return {
              id: tokenAddress ? `${chain}:${tokenAddress.toLowerCase()}` : `${chain}:${(t.symbol ?? "token").toLowerCase()}`,
              symbol: t.symbol ?? "TOKEN",
              name: t.name ?? t.symbol ?? "Token",
              balance,
              decimals,
              uiAmount: toApproximateNumber(uiAmountString),
              uiAmountString,
              priceUsd,
              valueUsd,
              change24hPercent: change,
              logoURI: t.logo || t.thumbnail || null,
              isNative: Boolean(t.native_token),
              chain,
            };
          });
          allAssets = [...allAssets, ...mappedTokens];
        });

        // Set nativeBalance to null because we now include native tokens in the main list
        if (!isCurrentRequest()) {
          return;
        }

        setNativeBalance(null);
        setAssets(allAssets);
      } else {
        // Solana
        const { tokens, error: err } = await fetchWalletPortfolioWithRetry({
          address,
          chainFamily: "solana",
          signal: controller.signal,
        });
        if (err) throw new Error(err);

        // tokens is now UnifiedFungibleAsset[] from Moralis adapter
        const unified: UnifiedAsset[] = ((tokens as unknown as UnifiedFungibleAsset[]) || []).map((t) => {
          const decimals = normalizeDecimals(t.decimals, 9);
          const balance = normalizeBalanceString(t.balance);
          const uiAmountString =
            typeof t.balanceFormatted === "string" && t.balanceFormatted.trim().length > 0
              ? t.balanceFormatted
              : formatUiAmountString(balance, decimals);

          return {
            id: t.address || t.id,
            symbol: t.symbol || "Unknown",
            name: t.name || "Unknown Token",
            balance,
            decimals,
            uiAmount: toApproximateNumber(uiAmountString),
            uiAmountString,
            priceUsd: t.priceUsd,
            valueUsd: t.valueUsd,
            logoURI: t.logoUrl,
            isNative: t.kind === "native",
            chain: "solana",
          };
        });

        if (!isCurrentRequest()) {
          return;
        }

        setAssets(unified);
      }
    } catch (e: UntypedJson) {
      if (isAbortError(e) || !isCurrentRequest()) {
        return;
      }

      setError(e instanceof Error ? e.message : "Failed to load assets");
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [address, type]);

  useEffect(() => {
    void fetchAssets();

    return () => {
      activeControllerRef.current?.abort();
    };
  }, [fetchAssets]);

  return { assets, nativeBalance, isLoading, error, refetch: fetchAssets };
}
