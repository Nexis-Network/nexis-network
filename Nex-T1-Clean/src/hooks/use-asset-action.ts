"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AssetTick } from "@/lib/utils/asset-normalization";
import { getChainAdapter } from "@/lib/chain-adapter/chain-adapter";


import { logger } from '@/lib/logger';
export type AssetActionType = "swap" | "send" | "receive" | "bridge" | "trade";

export interface AssetAction {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function useAssetAction(asset: AssetTick) {
  const router = useRouter();

  const chainAdapter = useMemo(() => {
    return getChainAdapter(asset.chainId || asset.chain);
  }, [asset.chainId, asset.chain]);

  const actions = useMemo(() => {
    const list: Record<AssetActionType, AssetAction> = {
      swap: {
        label: "Swap",
        onClick: () => {
          // Open Swap Modal/Drawer with pre-filled asset
          // In a real app, this would toggle a global state or navigate
          logger.debug("Swap action triggered for", asset.symbol);
          router.push(`/swap?inputCurrency=${asset.address}&chain=${asset.chainId}`);
        },
      },
      send: {
        label: "Send",
        onClick: () => {
          logger.debug("Send action triggered for", asset.symbol);
          // router.push(`/send?asset=${asset.address}`);
        },
      },
      receive: {
        label: "Receive",
        onClick: () => {
          logger.debug("Receive action triggered for", asset.symbol);
          // router.push(`/receive?asset=${asset.address}`);
        },
      },
      bridge: {
        label: "Bridge",
        disabled: asset.chain === "solana", // Example constraint
        onClick: () => {
          logger.debug("Bridge action triggered for", asset.symbol);
          // router.push(`/bridge?asset=${asset.address}`);
        },
      },
      trade: {
        label: "Trade",
        onClick: () => {
           logger.debug("Trade action triggered for", asset.symbol);
           router.push(`/assets/${asset.chain}/${asset.address}`);
        }
      }
    };
    return list;
  }, [asset, router]);

  return {
    actions,
    chainAdapter,
    isSupportedChain: !!chainAdapter,
  };
}
