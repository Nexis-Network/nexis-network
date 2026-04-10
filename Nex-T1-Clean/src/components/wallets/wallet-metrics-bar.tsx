"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PercentPill } from "@/components/ui/percent-pill";
import { useWalletNetWorth } from "@/hooks/wallets/use-wallet-networth";
import { useWalletPnL } from "@/hooks/wallets/use-wallet-pnl";
import { useWalletVolume } from "@/hooks/wallets/use-wallet-volume";
import { useWalletActiveChains } from "@/hooks/wallets/use-wallet-active-chains";

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Props = {
  address: string | null;
  platform: "evm" | "solana";
  chainId?: number | null;
  network?: "mainnet" | "devnet";
  className?: string;
};

export function WalletMetricsBar({ address, platform, chainId, network, className }: Props) {
  const networth = useWalletNetWorth({ platform, address, chainId, network });
  const pnl = useWalletPnL({ platform, address, chainId, network, days: 30 });
  const volume = useWalletVolume({ platform, address, chainId, network, windowHours: 24 });
  const activeChains = useWalletActiveChains({ address: platform === "evm" ? address : null });

  const netWorthUsd = networth.data?.netWorthUsd ?? null;
  const pnlUsd = pnl.data?.totalUsd ?? null;
  const pnlPct = pnl.data?.roiPercent ?? null;
  const volumeUsd = volume.data?.volumeUsd ?? null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-muted/30">
          Net worth: {netWorthUsd != null ? USD_FORMAT.format(netWorthUsd) : "\u2014"}
        </Badge>
        <Badge variant="outline" className="bg-muted/30">
          PnL (30d): {pnlUsd != null ? USD_FORMAT.format(pnlUsd) : "\u2014"}{" "}
          <span className="ml-2">
            <PercentPill value={pnlPct} />
          </span>
        </Badge>
        <Badge variant="outline" className="bg-muted/30">
          Volume (24h): {volumeUsd != null ? USD_FORMAT.format(volumeUsd) : "\u2014"}
        </Badge>
      </div>

      {platform === "evm" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Active chains:</span>
          {activeChains.data?.length ? (
            activeChains.data.slice(0, 8).map((c) => (
              <span key={`${c.chain_id}:${c.chain}`} className="rounded-full border px-2 py-0.5">
                {c.chain}
              </span>
            ))
          ) : (
            <span>\u2014</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

