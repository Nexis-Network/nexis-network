"use client";

import { Badge } from "@/components/ui/badge";

import { useLocale } from "@/components/providers/locale-provider";
import { Stats11, type Stats11Card } from "@/components/stats-11";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { buildSettingsUsageCards } from "@/components/settings-v2/sections/overview/settings-usage-stats-card-data";
import { useOverviewUsage } from "@/lib/hooks/settings/use-overview-usage";

function SettingsUsageStatsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-xl border border-border/70 bg-card"
        />
      ))}
    </div>
  );
}

export function SettingsUsageStatsCard() {
  const locale = useLocale();
  const query = useOverviewUsage();

  const cards: Stats11Card[] = query.data
    ? buildSettingsUsageCards(query.data, locale)
    : [];

  if (query.isLoading && !query.data) {
    return <SettingsUsageStatsSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <SettingsPanel title="Usage Snapshot">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to load usage metrics right now."}
        </p>
      </SettingsPanel>
    );
  }

  return (
    <section aria-label="Usage snapshot" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Usage Snapshot</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Live balance, profit, credits, AI SDK v6 message volume, tasks, and
            swap activity sourced from your Nex Wallets and settings telemetry.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground">
          {query.data.window.label}
        </Badge>
      </div>

      <Stats11 cards={cards} />
    </section>
  );
}
