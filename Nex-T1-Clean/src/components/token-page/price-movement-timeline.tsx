import { Dot } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { PriceMovementEntry } from "@/types/token-page";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS } from "./constants";

type PriceMovementTimelineProps = {
  entries: PriceMovementEntry[];
};

export function PriceMovementTimeline({ entries }: PriceMovementTimelineProps) {
  if (!entries.length) {
    return null;
  }

  return (
    <section className={TOKEN_PANEL_MAX_WIDTH_CLASS}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">Latest price movement</p>
          <h2 className="text-lg font-semibold leading-6 text-foreground">Narrative tape</h2>
        </div>
      </div>
      <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, "text-foreground")}>
        <div className={cn(TOKEN_PANEL_INNER_CLASS, "relative rounded-[11px] p-5 pl-8")}>
          <span className="absolute left-4 top-3 bottom-3 w-px bg-border/50" aria-hidden />
          <div className="space-y-6">
            {entries.map((entry) => (
              <div key={entry.id} className="relative pl-6">
                <span className="absolute left-0 top-1 flex size-4 items-center justify-center rounded-full border border-border bg-background">
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16px] text-muted-foreground/80">
                  <span className="font-semibold text-foreground">{entry.title}</span>
                  <Dot className="size-3 text-muted-foreground/50" />
                  <span>{entry.relativeTime}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground">
                  {entry.price != null ? <span>{formatCurrency(entry.price, { currency: "USD" })}</span> : null}
                  {entry.deltaPercent != null ? (
                    <span
                      className={cn(
                        entry.deltaPercent >= 0 ? "text-primary" : "text-destructive",
                        "text-sm font-semibold",
                      )}
                    >
                      {formatPercentage(entry.deltaPercent, { sign: true })}
                    </span>
                  ) : null}
                  {entry.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}
