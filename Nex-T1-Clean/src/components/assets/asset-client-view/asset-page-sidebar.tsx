"use client";

import Image from "next/image";
import { Globe, Twitter } from "lucide-react";

import type { AssetTick } from "@/lib/utils/asset-normalization";
import { Button } from "@/components/ui/button";
import { SwapWidget } from "@/components/swap/swap-widget";
import { TokenSecurityCard, TokenTradeVolume } from "@/components/assets/token-stats";
import { createManualImportedTokenAsset } from "@/modules/tokens/registry/custom-tokens";
import { resolveChainId } from "@/modules/tokens/chains";
import { AssetBalanceCard } from "./asset-balance-card";
import {
  isSolanaAsset,
  resolveAssetExplorerUrl,
} from "@/components/assets/asset-client-view/asset-page.utils";

interface AssetPageSidebarProps {
  asset: AssetTick;
  securityData: Parameters<typeof TokenSecurityCard>[0]["security"];
  tradeData: Parameters<typeof TokenTradeVolume>[0]["data"];
}

function buildSwapDefaultToken(asset: AssetTick) {
  return {
    ...createManualImportedTokenAsset(resolveChainId(asset.chainId) ?? 1, asset.address),
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals || 18,
    logoURI: asset.logoUrl,
  };
}

export function AssetPageSidebar({
  asset,
  securityData,
  tradeData,
}: AssetPageSidebarProps) {
  const explorerUrl = resolveAssetExplorerUrl(asset);
  const isSolana = isSolanaAsset(asset);

  return (
    <div className="w-full lg:w-[450px] flex-shrink-0 p-8 space-y-6 bg-background">
      <div className="mb-6 flex justify-center">
        <SwapWidget defaultToken={buildSwapDefaultToken(asset)} />
      </div>

      <AssetBalanceCard
        address={asset.address}
        chainId={asset.chainId}
        logoUrl={asset.logoUrl}
        symbol={asset.symbol}
      />

      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-foreground">Info</h3>
        <div className="flex flex-wrap gap-2">
          {asset.websiteUrl ? (
            <a href={asset.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-card hover:bg-accent text-xs font-normal border border-border/60"
              >
                <Globe className="w-3 h-3 mr-2 opacity-70" />
                Website
              </Button>
            </a>
          ) : null}

          {asset.twitterUrl ? (
            <a href={asset.twitterUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-card hover:bg-accent text-xs font-normal border border-border/60"
              >
                <Twitter className="w-3 h-3 mr-2 opacity-70" />
                Twitter
              </Button>
            </a>
          ) : null}

          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-card hover:bg-accent text-xs font-normal border border-border/60 pl-2.5"
            >
              <Image
                src={isSolana ? "/assets/solscan-logo-dark.svg" : "/assets/asset-page/etherscan.svg"}
                alt="Explorer"
                width={14}
                height={14}
                className="mr-2 opacity-80"
              />
              Explorer
            </Button>
          </a>
        </div>

        <div className="text-sm text-muted-foreground leading-relaxed">
          {asset.description ||
            `${asset.name} is a decentralized digital currency that enables instant payments to anyone, anywhere in the world.`}
          <button className="block mt-2 text-primary hover:text-primary/80 font-medium">
            Show more
          </button>
        </div>

        <TokenTradeVolume data={tradeData ?? null} />
        <TokenSecurityCard security={securityData ?? null} />
      </div>
    </div>
  );
}
