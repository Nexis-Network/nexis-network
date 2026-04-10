"use client";

import { UserPresenceAvatar } from "@/components/ui/user-presence-avatar";
import { PercentPill } from "@/components/ui/percent-pill";
import { WalletSparkline } from "@/components/ui/wallet-sparkline";
import { cn } from "@/lib/utils";
import { useAssetSparkline, type AssetSparklineQuery } from "@/hooks/use-asset-sparkline";

type Props = {
  name: string;
  symbol: string;
  logoUrl: string | null;
  valueUsd: number | null;
  balanceText: string | null;
  change24hPercent: number | null;
  sparkline?: AssetSparklineQuery | null;
  className?: string;
};

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function WalletAssetRow({
  name,
  symbol,
  logoUrl,
  valueUsd,
  balanceText,
  change24hPercent,
  sparkline,
  className,
}: Props) {
  const { data } = useAssetSparkline(sparkline ?? { chainKind: "evm" }, Boolean(sparkline));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <UserPresenceAvatar icon={logoUrl} name={symbol || name} size={18} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{symbol || name}</span>
          <PercentPill value={change24hPercent} />
        </div>
        {balanceText ? <div className="text-[10px] text-muted-foreground">{balanceText}</div> : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <WalletSparkline values={data?.values ?? []} tone={data?.direction ?? "neutral"} />
        <div className="w-[92px] text-right text-xs text-muted-foreground">
          {valueUsd != null && Number.isFinite(valueUsd) ? USD_FORMAT.format(valueUsd) : "\u2014"}
        </div>
      </div>
    </div>
  );
}

