"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { WalletPortfolio } from "@/lib/user/profile";
import { isNonZeroEVMAddress, isValidSolanaAddress } from "@/lib/utils/token-utils";
import { unwrapApiPayload } from "@/lib/api-platform";
import {
  getDefaultTokensForNetwork,
  getTokenKey,
  DefaultToken,
} from "@/lib/constants/default-tokens";
import { useCustomTokens, CustomToken } from "./use-custom-tokens";
import { portfolioChainMatchesFilter, toPortfolioRequestChainId } from "@/lib/portfolio/chain-filter";

export interface TokenItem {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string;
  usd_price: number;
  usd_price_24hr_percent_change: number;
  usd_price_7d_percent_change?: number;
  usd_value: number;
  // Synthetic
  chainId: string;
  priceHistory: number[];
  isDefault?: boolean;
  isCustom?: boolean;
}

// Returns the chain ID to use for default tokens fetch
function getDefaultChainForFetch(filterChainId?: string): string {
  if (!filterChainId || filterChainId === "all") return "solana"; // Default to Solana
  return filterChainId;
}

/**
 * Convert a DefaultToken to TokenItem with zero balance
 */
function defaultTokenToTokenItem(
  token: DefaultToken,
  chainId: string
): TokenItem {
  return {
    token_address: token.contractAddress || "native",
    name: token.name,
    symbol: token.symbol,
    logo: token.logoUrl,
    decimals: token.decimals,
    balance: "0",
    usd_price: 0,
    usd_price_24hr_percent_change: 0,
    usd_value: 0,
    chainId,
    priceHistory: [0, 0],
    isDefault: true,
  };
}

/**
 * Convert a CustomToken to TokenItem with zero balance
 */
function customTokenToTokenItem(token: CustomToken): TokenItem {
  return {
    token_address: token.contract_address,
    name: token.name,
    symbol: token.symbol,
    logo: token.logo_url || undefined,
    decimals: token.decimals,
    balance: "0",
    usd_price: 0,
    usd_price_24hr_percent_change: 0,
    usd_value: 0,
    chainId: token.chain_id,
    priceHistory: [0, 0],
    isCustom: true,
  };
}

export function usePortfolioTokens(wallets: WalletPortfolio[], filterChainId?: string) {
  const eligibleWallets = useMemo(
    () =>
      wallets.filter((w) => {
        const meta = w.metadata as Record<string, UntypedJson> | undefined;
        const chainId = toPortfolioRequestChainId(meta?.chainId ?? null, {
          walletType: w.walletType,
          providerName: w.providerName,
          metadata: meta ?? null,
        });
        if (chainId === null) {
          return false;
        }

        if (filterChainId && filterChainId !== "all") {
          if (!portfolioChainMatchesFilter(chainId, filterChainId)) {
            return false;
          }
        }

        const address = w.address ?? "";
        if (chainId === "solana") {
          return isValidSolanaAddress(address);
        }

        return isNonZeroEVMAddress(address);
      }),
    [wallets, filterChainId],
  );

  const defaultChain = getDefaultChainForFetch(filterChainId);
  const { customTokens } = useCustomTokens(filterChainId);

  const walletInputs = useMemo(
    () =>
      eligibleWallets
        .slice(0, 20)
        .map((w) => {
          const meta = w.metadata as Record<string, UntypedJson> | undefined;
          const address = w.address ?? "";
          const chainId = toPortfolioRequestChainId(meta?.chainId ?? null, {
            walletType: w.walletType,
            providerName: w.providerName,
            metadata: meta ?? null,
          });
          if (chainId === null) return null;
          if (chainId === "solana" && !isValidSolanaAddress(address)) return null;
          if (typeof chainId === "number" && !isNonZeroEVMAddress(address)) return null;
          return { address, chainId };
        })
        .filter((item): item is { address: string; chainId: number | "solana" } => item !== null),
    [eligibleWallets],
  );

  const cacheKey = useMemo(() => {
    if (walletInputs.length > 0) {
      const keys = walletInputs.map((w) => `${w.address}-${w.chainId}`);
      return ["aggregated-tokens", ...keys];
    }
    return ["default-tokens", defaultChain];
  }, [walletInputs, defaultChain]);

  const { data: fetchedTokens, isLoading, error } = useSWR(
    cacheKey,
    async () => {
      if (walletInputs.length > 0) {
        const res = await fetch("/api/portfolio/wallet-data/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallets: walletInputs }),
        });
        if (!res.ok) return [] as TokenItem[];
        const json = (await res.json().catch(() => null)) as unknown;
        const payload = unwrapApiPayload<{ items?: UntypedJson[] }>(json);
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const tokens = items.flatMap((item: UntypedJson) => {
          if (!item?.ok || !item?.data?.tokens) return [];
          const chainRaw = item.chainId ?? item.data.chain ?? "";
          const chainId = chainRaw === "solana" ? "solana" : String(chainRaw);
          return (item.data.tokens as UntypedJson[]).map((t) => ({
            ...t,
            chainId,
            priceHistory: t.priceHistory || [],
          }));
        });
        return tokens as TokenItem[];
      }

      return [] as TokenItem[];
    },
    { refreshInterval: 60000 },
  );

  const tokens = useMemo(() => {
    const result: TokenItem[] = [];
    const seenKeys = new Set<string>();

    const defaultTokens = getDefaultTokensForNetwork(filterChainId || "all");
    const effectiveChainId = filterChainId || "all";

    for (const token of fetchedTokens || []) {
      const key = getTokenKey(token.token_address === "native" ? null : token.token_address, token.chainId);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(token);
      }
    }

    for (const defaultToken of defaultTokens) {
      const key = getTokenKey(defaultToken.contractAddress, effectiveChainId);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(defaultTokenToTokenItem(defaultToken, effectiveChainId));
      }
    }

    for (const customToken of customTokens) {
      const key = getTokenKey(customToken.contract_address, customToken.chain_id);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(customTokenToTokenItem(customToken));
      }
    }

    return result.sort((a, b) => {
      const aBalance = parseFloat(a.balance) || 0;
      const bBalance = parseFloat(b.balance) || 0;

      if (aBalance > 0 && bBalance === 0) return -1;
      if (bBalance > 0 && aBalance === 0) return 1;

      if (a.usd_value !== b.usd_value) return b.usd_value - a.usd_value;

      return a.symbol.localeCompare(b.symbol);
    });
  }, [fetchedTokens, customTokens, filterChainId]);

  return {
    tokens,
    isLoading,
    isError: error,
  };
}
