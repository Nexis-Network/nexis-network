"use client";

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WalletSnapshot } from "@/modules/wallets/profile";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCustomTokenDialog } from "./add-custom-token-dialog";

import { WalletAssetItem } from "./wallet-asset-item";
import type { WalletViewType } from "./wallet-right-panel";
import { useWalletAssets } from "@/hooks/wallets/use-wallet-assets";
import { useMarketStream } from "@/hooks/use-market-stream";
import { resolveWalletRuntimeContext } from "./components/wallet-runtime-context";
import { resolveChainId } from "@/modules/tokens/chains";
import { useTokenRegistry } from "@/modules/tokens/hooks/use-token-registry";
import { getPortfolioDefaultAssetIds } from "@/modules/tokens/portfolio/token-items";
import { buildWalletDisplayTokens } from "@/modules/tokens/portfolio/wallet-display";

import { logger } from "@/lib/logger";

interface WalletAssetsListProps {
  wallet: WalletSnapshot;
  onViewChange?: (view: WalletViewType, token?: WalletSnapshot["tokens"][number]) => void;
}

export function WalletAssetsList({
  wallet,
  onViewChange,
}: WalletAssetsListProps) {
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);

  const { chainId, type, isCdpWallet } = useMemo(
    () => resolveWalletRuntimeContext(wallet),
    [wallet],
  );
  const chainType = type;
  const registryChainId = resolveChainId(chainId);
  const tokenRegistry = useTokenRegistry({
    chainId: registryChainId ?? undefined,
    includeCustom: true,
  });

  // Fetch real-time assets (skip for Nex Wallets — they already carry tokens from snapshot)
  const { assets, nativeBalance, isLoading, error } = useWalletAssets(
    isCdpWallet ? undefined : (wallet.address ?? undefined),
    type,
  );

  const displayTokens = useMemo(() => {
    const fallbackChainId = registryChainId ?? 1;
    const commonBaseIds = getPortfolioDefaultAssetIds(
      tokenRegistry.snapshot,
      registryChainId ?? undefined,
    );

    // Nex Wallets: use snapshot tokens directly (populated by useCdpBalance in the flyout)
    if (isCdpWallet && wallet.tokens?.length > 0) {
      return buildWalletDisplayTokens({
        currentTokens: wallet.tokens,
        registryTokens: tokenRegistry.tokens,
        commonBaseIds,
        fallbackChainId,
      });
    }

    // Non-CDP: combine native + fetched assets
    let all = assets || [];
    if (nativeBalance) {
      if (!all.find((a) => a.isNative)) {
        all = [nativeBalance, ...all];
      }
    }
    
    // Map non-CDP assets to the snapshot type format to safely match and sort
    const mappedTokens: WalletSnapshot["tokens"] = all.map((token) => {
      const t = token as unknown as Record<string, unknown>;
      const tokenChain = typeof t.chain === "string" ? t.chain : "";
      const tokenUiAmount =
        typeof t.uiAmount === "number"
          ? t.uiAmount
          : typeof t.uiAmountString === "string"
            ? Number.parseFloat(t.uiAmountString)
            : 0;
      return {
        id: token.id,
        contract: token.isNative ? null : token.id,
        platform: tokenChain === "solana" ? "solana" : "evm",
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: tokenUiAmount,
        uiAmountString: typeof t.uiAmountString === "string" ? t.uiAmountString : undefined,
        chainId: tokenChain === "solana" ? 101 : (tokenChain ? Number(tokenChain) : (chainId ? Number(chainId) : null)),
        logoURI: token.logoURI,
        priceUsd: token.priceUsd ?? 0,
        valueUsd: token.valueUsd ?? 0,
        change24hPercent: token.change24hPercent ?? null,
        isNative: token.isNative,
      };
    });

    return buildWalletDisplayTokens({
      currentTokens: mappedTokens,
      registryTokens: tokenRegistry.tokens,
      commonBaseIds,
      fallbackChainId,
    });
  }, [
    assets,
    chainId,
    isCdpWallet,
    nativeBalance,
    registryChainId,
    tokenRegistry.snapshot,
    tokenRegistry.tokens,
    wallet.tokens,
  ]);

  // Real-time updates
  const tokenIds = useMemo(() => displayTokens.map(t => t.id).filter(Boolean), [displayTokens]);
  const { data: streamData } = useMarketStream(tokenIds);

  const handleAddToken = async (address: string) => {
    logger.debug("Adding custom token:", address);
    return new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(true), 1000),
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl bg-black/[0.06] dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-red-400 text-xs">
        Failed to load assets: {error}
      </div>
    );
  }

  return (
    <>
      <div className="relative flex-1 h-full min-h-0">
        <ScrollArea className="h-full min-h-0 pr-4">
          {displayTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 text-sm">
              No assets found
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-3">
              {displayTokens.map((tokenItem, idx) => {
                const isVerified = (tokenItem.valueUsd ?? 0) > 0 || tokenItem.isNative;

                // We've already mapped them to the unified format in useMemo
                // but we still want live pricing
                const livePrice = streamData[tokenItem.id]?.price;
                const currentPrice = livePrice ?? tokenItem.priceUsd ?? 0;
                const currentValue = livePrice ? (tokenItem.balance || 0) * livePrice : (tokenItem.valueUsd ?? 0);
                const change24h = streamData[tokenItem.id]?.change_24h ?? tokenItem.change24hPercent ?? null;
                
                const updatedItem = {
                    ...tokenItem,
                    priceUsd: currentPrice,
                    valueUsd: currentValue,
                    change24hPercent: change24h,
                };

                return (
                  <WalletAssetItem
                    key={`${updatedItem.id}-${idx}`}
                    token={updatedItem}
                    isVerified={isVerified}
                    onViewChange={onViewChange}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3%] bg-gradient-to-t from-white/80 via-white/40 to-transparent backdrop-blur-md dark:from-[#121212]/60 dark:via-[#121212]/35"
        />
      </div>

      <div className="mt-2 border-t border-black/10 pt-2 dark:border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[#666666] hover:bg-black/5 hover:text-[#171717] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
          onClick={() => setIsAddTokenOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add custom token</span>
        </Button>
      </div>

      <AddCustomTokenDialog
        isOpen={isAddTokenOpen}
        onClose={() => setIsAddTokenOpen(false)}
        chainType={chainType as "evm" | "solana"}
        onAdd={handleAddToken}
      />
    </>
  );
}
