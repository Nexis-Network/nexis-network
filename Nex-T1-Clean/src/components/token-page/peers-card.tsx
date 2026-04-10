import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { PeerAsset } from "@/types/token-page";

import { useAssetNavigator } from "@/hooks/use-asset-navigator";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS } from "./constants";

const PEERS_LIMIT = 12;

type PeersCardProps = {
  peers: PeerAsset[];
};

export function PeersCard({ peers }: PeersCardProps) {
  const navigate = useAssetNavigator();

  const items = peers.slice(0, PEERS_LIMIT);
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={cn(TOKEN_PANEL_FRAME_CLASS, "text-foreground")}>
      <div className={cn(TOKEN_PANEL_INNER_CLASS, "flex flex-col divide-y divide-border rounded-[11px]")}>
        {items.map((peer) => (
          <button
            key={peer.id}
            type="button"
            onClick={() => navigate({ type: peer.entityType === "nft" ? "nft" : "token", slug: peer.slug })}
            className="flex items-center gap-3 px-[12px] pr-[20px] py-2 text-left text-muted-foreground transition hover:bg-muted/50"
          >
            <PeerLogo symbol={peer.symbol} logoUrl={peer.logoUrl} />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <span className="truncate text-[13px] font-medium leading-[18px] tracking-[0.16px] text-foreground">
                  {peer.name}
                </span>
                <span className="text-[13px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
                  {formatCurrency(peer.priceUsd ?? null, { currency: "USD" })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <PeerMetaLabel peer={peer} />
                <PeerChange value={peer.priceChangePercent24h ?? null} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function PeerMetaLabel({ peer }: { peer: PeerAsset }) {
  const category = peer.categories?.[0]?.toUpperCase() ?? (peer.entityType === "nft" ? "NFT" : "TOKEN");

  return (
    <div className="flex items-center gap-1 text-[12px] font-light leading-4 tracking-[0.16px] text-muted-foreground">
      <span className="uppercase">{peer.symbol}</span>
      <span className="text-[12px] leading-4">·</span>
      <span className="uppercase">{category}</span>
    </div>
  );
}

function PeerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  return (
    <div className="flex size-[30px] items-center justify-center rounded-full bg-muted/50">
      {logoUrl ? (
        <div className="relative size-full overflow-hidden rounded-full bg-muted/50">
          <Image src={logoUrl} alt={symbol} fill sizes="30px" className="object-cover" unoptimized />
        </div>
      ) : (
        <span className="text-[10px] font-semibold uppercase text-foreground">{symbol.slice(0, 4)}</span>
      )}
    </div>
  );
}

function PeerChange({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">--</span>;
  }

  const isPositive = value > 0;
  const toneClass = isPositive ? "text-primary" : "text-destructive";
  const symbol = isPositive ? "+" : "-";
  const formatted = formatPercentage(Math.abs(value), { sign: false });

  return (
    <div className={cn("flex items-center gap-[4px] text-[14px] font-light leading-5 tracking-[0.16px]", toneClass)}>
      <span>{symbol}</span>
      <span>{formatted}</span>
    </div>
  );
}
