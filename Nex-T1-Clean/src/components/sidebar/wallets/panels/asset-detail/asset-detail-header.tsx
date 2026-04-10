import { Copy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PercentPill } from "@/components/ui/percent-pill";

type AssetDetailHeaderProps = {
  name: string;
  symbol: string;
  logoUrl?: string | null;
  address?: string | null;
  priceUsd?: number | null;
  change24hPct?: number | null;
  onCopyAddress: () => void;
};

function formatPrice(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })}`;
}

function shortenAddress(value: string | null | undefined): string {
  const address = String(value || "").trim();
  if (!address) return "Address unavailable";
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function AssetDetailHeader({
  name,
  symbol,
  logoUrl,
  address,
  priceUsd,
  change24hPct,
  onCopyAddress,
}: AssetDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/10 bg-[#c4c4c4]/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={logoUrl || undefined} alt={symbol || name} />
              <AvatarFallback className="text-xs bg-white/10 text-zinc-200">
                {(symbol || name || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{name}</div>
              <div className="truncate text-[11px] text-zinc-400">{symbol}</div>
              <div className="truncate text-[10px] font-mono text-zinc-500">{shortenAddress(address)}</div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-white tabular-nums">{formatPrice(priceUsd)}</div>
            <div className="mt-1 flex justify-end">
              <PercentPill value={change24hPct} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
          onClick={onCopyAddress}
          disabled={!address}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Copy Address
        </Button>
      </div>
    </div>
  );
}
