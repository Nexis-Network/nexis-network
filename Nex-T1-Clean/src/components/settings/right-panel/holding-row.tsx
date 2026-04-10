import { cn } from "@/lib/utils";
import Image from "next/image";

import { CurrencyDisplay } from "../shared/currency-display";
import { MonoValue } from "../shared/mono-value";

interface HoldingRowProps {
  symbol: string;
  name: string;
  logoUrl?: string;
  balanceUsd: number;
  changePercent: number | null;
}

export function HoldingRow({ symbol, name, logoUrl, balanceUsd, changePercent }: HoldingRowProps) {
  const hasChange = typeof changePercent === "number" && Number.isFinite(changePercent);

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]">
      {/* Logo */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5">
        {logoUrl ? (
          <Image src={logoUrl} alt={symbol} width={20} height={20} className="rounded-full" unoptimized />
        ) : (
          <span className="text-[9px] font-bold text-[var(--bento-text-muted)]">{symbol.slice(0, 2)}</span>
        )}
      </div>

      {/* Name + ticker */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-[var(--bento-text-primary)]">{symbol}</div>
        <div className="truncate text-[10px] text-[var(--bento-text-muted)]">{name}</div>
      </div>

      {/* Price + change */}
      <div className="text-right">
        <CurrencyDisplay value={balanceUsd} className="text-[12px] text-[var(--bento-text-primary)]" />
        {hasChange && (
          <div className={cn("text-[10px]", changePercent! > 0 ? "text-[#c7c7cc]" : changePercent! < 0 ? "text-[#c7c7cc]" : "text-[var(--bento-text-muted)]")}>
            <MonoValue>{changePercent! > 0 ? "+" : ""}{changePercent!.toFixed(2)}%</MonoValue>
          </div>
        )}
      </div>
    </div>
  );
}
