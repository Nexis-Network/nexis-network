"use client";

import { useMemo } from "react";

import ContributionGraph from "@/components/smoothui/contribution-graph";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { useOverviewActivity } from "@/lib/hooks/settings/use-overview-activity";

type SettingsActivityGraphCardProps = {
  title: string;
  description: string;
};

export function SettingsActivityGraphCard({
  title,
  description,
}: SettingsActivityGraphCardProps) {
  const { data, isLoading } = useOverviewActivity();
  const graphData = useMemo(
    () =>
      (data?.days ?? []).map((day) => ({
        date: day.date,
        count:
          day.metrics.accesses +
          day.metrics.credits +
          day.metrics.transactions +
          day.metrics.swaps +
          day.metrics.bridges +
          day.metrics.agentRuns,
        level: day.value,
      })),
    [data?.days],
  );

  return (
    <SettingsPanel
      title={title}
      description={description}
      action={
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{data?.activeDayCount ?? 0} active days</span>
          <span>{data?.totalCredits ?? 0} credits</span>
          <span>{data?.totalTransactions ?? 0} transactions</span>
        </div>
      }
    >
        {isLoading && !data ? (
          <div className="h-44 animate-pulse rounded-lg bg-muted" />
        ) : (
          <ContributionGraph
            year={data?.year}
            data={graphData}
            className="w-full"
          />
        )}
    </SettingsPanel>
  );
}
