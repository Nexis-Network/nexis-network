"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import { isNonZeroEVMAddress, isValidSolanaAddress } from "@/lib/utils/token-utils";
import type { WalletPortfolio } from "@/lib/user/profile";
import {
  portfolioChainMatchesFilter,
  toPortfolioRequestChainId,
} from "@/lib/portfolio/chain-filter";
import { resolveChainId } from "@/modules/tokens/chains";
import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";
import {
  buildPortfolioTokenItems,
  getPortfolioDefaultAssetIds,
} from "@/modules/tokens/portfolio/token-items";
import type {
  FetchedPortfolioToken,
  PortfolioTokenItem,
} from "@/modules/tokens/portfolio/types";

function mapFetchedPortfolioTokens(items: UntypedJson[]): FetchedPortfolioToken[] {
  return items.flatMap((item: UntypedJson) => {
    if (!item?.ok || !Array.isArray(item.data?.tokens)) {
      return [];
    }

    const chainId = resolveChainId(item.chainId ?? item.data?.chain ?? undefined);
    if (!chainId) {
      return [];
    }

    return (item.data.tokens as UntypedJson[]).flatMap((token) => {
      if (typeof token?.token_address !== "string") {
        return [];
      }

      return [{
        token_address: token.token_address,
        name: typeof token.name === "string" ? token.name : undefined,
        symbol: typeof token.symbol === "string" ? token.symbol : undefined,
        logo: typeof token.logo === "string" ? token.logo : undefined,
        thumbnail: typeof token.thumbnail === "string" ? token.thumbnail : undefined,
        decimals: typeof token.decimals === "number" ? token.decimals : undefined,
        balance: typeof token.balance === "string" ? token.balance : undefined,
        usd_price: typeof token.usd_price === "number" ? token.usd_price : undefined,
        usd_price_24hr_percent_change:
          typeof token.usd_price_24hr_percent_change === "number"
            ? token.usd_price_24hr_percent_change
            : undefined,
        usd_price_7d_percent_change:
          typeof token.usd_price_7d_percent_change === "number"
            ? token.usd_price_7d_percent_change
            : undefined,
        usd_value: typeof token.usd_value === "number" ? token.usd_value : undefined,
        chainId,
        priceHistory: Array.isArray(token.priceHistory)
          ? token.priceHistory.filter((value: unknown): value is number => typeof value === "number")
          : undefined,
      }];
    });
  });
}

export function usePortfolioTokenItems(wallets: WalletPortfolio[], filterChainId?: string) {
  const chainId = resolveChainId(filterChainId);
  const registry = useTokenRegistry({ chainId: chainId ?? undefined, includeCustom: true });
  const walletInputs = useMemo(
    () =>
      wallets
        .filter((wallet) => {
          const meta = wallet.metadata as Record<string, UntypedJson> | undefined;
          const resolved = toPortfolioRequestChainId(meta?.chainId ?? null, {
            walletType: wallet.walletType,
            providerName: wallet.providerName,
            metadata: meta ?? null,
          });
          if (resolved === null) return false;
          if (filterChainId && filterChainId !== "all" && !portfolioChainMatchesFilter(resolved, filterChainId)) {
            return false;
          }

          return resolved === "solana"
            ? isValidSolanaAddress(wallet.address ?? "")
            : isNonZeroEVMAddress(wallet.address ?? "");
        })
        .slice(0, 20)
        .map((wallet) => {
          const meta = wallet.metadata as Record<string, UntypedJson> | undefined;
          return {
            address: wallet.address ?? "",
            chainId: toPortfolioRequestChainId(meta?.chainId ?? null, {
              walletType: wallet.walletType,
              providerName: wallet.providerName,
              metadata: meta ?? null,
            }),
          };
        })
        .filter((wallet): wallet is { address: string; chainId: number | "solana" } => wallet.chainId !== null),
    [filterChainId, wallets],
  );
  const { data: fetchedTokens = [], error, isLoading } = useSWR(
    walletInputs.length > 0 ? ["portfolio-token-items", walletInputs] : null,
    async () => {
      const response = await fetch("/api/portfolio/wallet-data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: walletInputs }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Failed to load portfolio tokens"));
      }
      const items = unwrapApiPayload<{ items?: UntypedJson[] }>(payload)?.items;
      return Array.isArray(items) ? mapFetchedPortfolioTokens(items) : [];
    },
    { refreshInterval: 60_000 },
  );

  const tokens = useMemo<PortfolioTokenItem[]>(
    () =>
      buildPortfolioTokenItems({
        fetchedTokens,
        registryTokens: registry.tokens,
        defaultAssetIds: getPortfolioDefaultAssetIds(registry.snapshot, chainId ?? undefined),
      }),
    [chainId, fetchedTokens, registry.snapshot, registry.tokens],
  );

  return {
    tokens,
    isLoading: isLoading || registry.loading,
    isError: error ?? registry.error,
  };
}
