"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTokenUnlocks } from "@/hooks/market/use-market-overview";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage, formatRelativeTime } from "@/modules/prices/market-overview/formatters";

import { RIGHT_RAIL_FONT_STACK, RIGHT_RAIL_PANEL_CLASS, RIGHT_RAIL_WIDTH_CLASS } from "./constants";

const UNLOCKS_LIMIT = 6;

function formatUnlockDateLabel(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const dt = new Date(ms);
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function formatCountdownLabel(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const deltaMs = ms - Date.now();
  if (deltaMs <= 0) return "soon";
  const minutes = Math.ceil(deltaMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `in ${days}d`;
}

export function TokenUnlocksCard() {
  const query = useTokenUnlocks({ limit: UNLOCKS_LIMIT, hideSmallUnlocks: true });
  const unlocks = query.data?.data ?? [];
  const isLoading = query.isLoading && unlocks.length === 0;
  const hasConfigError = Boolean(query.data?.fallback) && (query.data?.error?.includes("CRYPTORANK_API_KEY") ?? false);

  return (
    <section
      className={`flex w-full flex-col gap-2 ${RIGHT_RAIL_WIDTH_CLASS}`}
      style={{ fontFamily: RIGHT_RAIL_FONT_STACK }}
    >
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex flex-col text-foreground">
          <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">Token Unlocks</span>
          <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">Upcoming cliffs</span>
        </div>
        <span className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">
          {query.data?.fetchedAt ? formatRelativeTime(query.data.fetchedAt) : "—"}
        </span>
      </div>

      <div className={RIGHT_RAIL_PANEL_CLASS}>
        {isLoading ? (
          <TokenUnlocksSkeleton />
        ) : unlocks.length ? (
          <div className="flex flex-col divide-y divide-border/50">
            {unlocks.slice(0, UNLOCKS_LIMIT).map((row) => (
              <UnlockRow key={row.id} row={row} />
            ))}
          </div>
        ) : hasConfigError ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Add <span className="font-mono">CRYPTORANK_API_KEY</span> to enable token unlock radar.
          </p>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">Token unlock feed unavailable.</p>
        )}

        <p
          className="px-4 pb-3 pt-1 text-[11px] text-muted-foreground"
          title={query.data?.error ?? undefined}
        >
          Source · CryptoRank
        </p>
      </div>
    </section>
  );
}

type UnlockRowProps = {
  row: {
    id: string;
    symbol: string;
    name: string;
    marketCapUsd: number | null;
    nextUnlockDate: string | null;
    nextUnlockValueUsd: number | null;
    nextUnlockOfCirculating: number | null;
  };
};

function UnlockRow({ row }: UnlockRowProps) {
  const unlockValue = formatCurrency(row.nextUnlockValueUsd, { compact: true, currency: "USD" });
  const percentCirc = row.nextUnlockOfCirculating != null ? formatPercentage(row.nextUnlockOfCirculating, { sign: false }) : "—";
  const dateLabel = formatUnlockDateLabel(row.nextUnlockDate);
  const countdown = formatCountdownLabel(row.nextUnlockDate);

  return (
    <div className="flex items-center gap-3 px-3 py-3 text-foreground">
      <div className="flex size-8 items-center justify-center overflow-hidden rounded bg-muted">
        <span className="text-[11px] font-semibold uppercase">{row.symbol.slice(0, 3) || "—"}</span>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="truncate text-[14px] font-medium leading-[18px] tracking-[0.16px]">{row.name}</span>
          <span className="text-[12px] font-medium text-muted-foreground">{dateLabel}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10.5px] font-light uppercase tracking-[0.16px] text-muted-foreground">
            <span>{row.symbol}</span>
            <span className="text-[12px] leading-4">·</span>
            <span className="truncate">MCap {formatCurrency(row.marketCapUsd, { compact: true, currency: "USD" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">{countdown}</span>
            <span className={cn("text-[13px] font-light leading-5 tracking-[0.16px]", "text-foreground")}>
              {unlockValue} · {percentCirc}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenUnlocksSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </>
  );
}

