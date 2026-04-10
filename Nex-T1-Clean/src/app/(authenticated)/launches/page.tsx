import { Suspense } from "react";
import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LaunchesGrid } from "@/components/launchpad/launches-grid";
import { LaunchesNav } from "@/components/launchpad/launches-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { parseLaunchesFilterState } from "@/lib/launchpad/filters";
import type { LaunchesFilterState } from "@/lib/launchpad/filters";
import { getLaunchesData } from "@/lib/launchpad/data-access";

type LaunchesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Launches | Nex-T1",
  description:
    "Browse AI agent launch campaigns in a token-board style layout with sortable launch intelligence across EVM and Solana.",
  alternates: {
    canonical: "/launches",
  },
};

function LaunchesPageSkeleton() {
  return (
    <div className="flex h-full min-h-full w-full gap-4 p-4">
      <Skeleton className="h-full w-56 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function LaunchesPage({ searchParams }: LaunchesPageProps) {
  const filters = parseLaunchesFilterState(await searchParams);

  return (
    <DashboardShell insetClassName="h-full min-h-full overflow-hidden bg-background">
      <Suspense fallback={<LaunchesPageSkeleton />}>
        <LaunchesPageContent filters={filters} />
      </Suspense>
    </DashboardShell>
  );
}

async function LaunchesPageContent({ filters }: { filters: LaunchesFilterState }) {
  const launches = await getLaunchesData(filters);

  return (
    <div className="flex h-full min-h-full w-full">
      <LaunchesNav counts={launches.counts} viewCounts={launches.viewCounts}>
        <LaunchesGrid items={launches.items} viewMode={filters.viewMode} />
      </LaunchesNav>
    </div>
  );
}
