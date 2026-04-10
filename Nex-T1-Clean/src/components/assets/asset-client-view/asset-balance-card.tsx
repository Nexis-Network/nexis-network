"use client";

import Image from "next/image";
import { Wallet } from "lucide-react";

import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { usePortfolioTokenItems } from "@/modules/tokens/hooks/use-portfolio-token-items";
import { resolveChainId } from "@/modules/tokens/chains";
import { buildTokenAssetId } from "@/modules/tokens/utils/asset-id";

interface AssetBalanceCardProps {
  address: string;
  chainId?: string;
  logoUrl?: string;
  symbol: string;
}

export function AssetBalanceCard({
  address,
  chainId,
  logoUrl,
  symbol,
}: AssetBalanceCardProps) {
  const { data: profile } = useProfileAggregate();
  const resolvedChainId = resolveChainId(chainId ?? undefined);
  const { tokens } = usePortfolioTokenItems(profile?.wallets ?? [], chainId);

  const assetId = resolvedChainId
    ? buildTokenAssetId({ chainId: resolvedChainId, address })
    : null;
  const token = assetId
    ? tokens.find((item) => item.asset.assetId === assetId)
    : tokens.find((item) => item.asset.symbol.toUpperCase() === symbol.toUpperCase());
  const balance = token ? parseFloat(token.balance) : 0;
  const value = token?.usd_value ?? 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Your balance</h3>
      <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <Image src={logoUrl} alt={symbol} width={32} height={32} className="object-cover" />
            ) : (
              <Wallet className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <div className="text-sm font-mono font-normal text-foreground">${value.toFixed(2)}</div>
            <div className="text-xs font-mono font-normal text-muted-foreground">
              {balance.toFixed(4)} {symbol}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
