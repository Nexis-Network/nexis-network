import { Suspense } from "react";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";
import { DaoCard } from "@/components/daos/dao-card";
import { DaoDirectoryFilters } from "@/components/daos/dao-directory-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getCachedDaoDirectoryData } from "@/server/daos/page-data";
import { resolveDaoPageAccess } from "@/server/daos/page-access";
import { parseDaoDirectoryFilters } from "@/app/api/daos/_utils";

export const metadata = {
  title: "DAO Directory",
  description:
    "Search, filter, and manage user-owned and agent-managed DAOs across EVM and Solana.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DaoDirectoryData = Awaited<ReturnType<typeof getCachedDaoDirectoryData>>;

function readSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function DaoDirectorySkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </section>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function DaoDirectoryPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;

  return (
    <DashboardShell insetClassName="overflow-hidden">
      <SettingsSurfaceShell
        width="standard"
        className="h-full"
        includeFooterSpacer={false}
      >
        <Suspense fallback={<DaoDirectorySkeleton />}>
          <DaoDirectoryContent rawSearchParams={rawSearchParams} />
        </Suspense>
      </SettingsSurfaceShell>
    </DashboardShell>
  );
}

async function DaoDirectoryContent({
  rawSearchParams,
}: {
  rawSearchParams: Record<string, string | string[] | undefined>;
}) {
  const access = await resolveDaoPageAccess("/daos");

  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    const single = readSingle(value);
    if (single) {
      urlSearchParams.set(key, single);
    }
  }

  const filters = parseDaoDirectoryFilters(urlSearchParams);
  let daos: DaoDirectoryData = [];
  let directoryState: "ready" | "preview" | "degraded" =
    access.isTestModePreview ? "preview" : "ready";

  if (!access.isTestModePreview) {
    try {
      daos = await getCachedDaoDirectoryData({
        userId: access.userId,
        orgId: access.orgId,
        filters,
      });
    } catch (error) {
      directoryState = "degraded";
      logger.error("dao_directory_page_data_failed", {
        userId: access.userId,
        orgId: access.orgId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const totalTreasuryUsd = daos.reduce(
    (total, item) => total + (item.treasuryValueUsd ?? 0),
    0,
  );
  const myDaos = daos.filter((dao) => dao.isMine).length;

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">EVM + Solana</Badge>
              <Badge variant="outline">User owned</Badge>
              <Badge variant="outline">Agent managed</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">DAO Directory</CardTitle>
              <CardDescription className="max-w-3xl text-base">
                Search DAO organizations by category, chain, ownership, and
                import source. Open a workspace for proposals, treasury
                actions, memberships, capabilities, and activity.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Indexed DAOs
              </div>
              <div className="mt-2 text-2xl font-medium">{daos.length}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                My DAOs
              </div>
              <div className="mt-2 text-2xl font-medium">{myDaos}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Indexed treasury
              </div>
              <div className="mt-2 text-2xl font-medium">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: totalTreasuryUsd >= 1000 ? 0 : 2,
                }).format(totalTreasuryUsd)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Launch from `/app`</CardTitle>
            <CardDescription>
              DAO creation, import, and treasury workflows are guided by the
              agent flow with artifacts, approvals, and chain-specific
              preflight checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild>
              <Link
                href={`/app?prompt=${encodeURIComponent("Create a new DAO on EVM or Solana with treasury, council, and voting setup.")}`}
              >
                Create DAO
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={`/app?prompt=${encodeURIComponent("Import an existing DAO by Governor, Safe, Realm, or Squads address and verify ownership.")}`}
              >
                Import existing DAO
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={`/app?prompt=${encodeURIComponent("Show me an artifact with the DAOs I own or manage.")}`}
              >
                Open DAO artifact
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <DaoDirectoryFilters
        values={{
          q: readSingle(rawSearchParams.q),
          category: readSingle(rawSearchParams.category),
          chainFamily: readSingle(rawSearchParams.chainFamily),
          ownershipMode: readSingle(rawSearchParams.ownershipMode),
          importSource: readSingle(rawSearchParams.importSource),
          lifecycleState: readSingle(rawSearchParams.lifecycleState),
          mineOnly: readSingle(rawSearchParams.mineOnly),
        }}
      />

      {directoryState === "preview" ? (
        <Card className="border-dashed border-border/70 bg-card/30">
          <CardHeader>
            <CardTitle>DAO directory preview mode</CardTitle>
            <CardDescription>
              Non-production test mode is active, so this route is rendering
              without a real authenticated org session. Sign in with a real
              workspace account to query live DAO data.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {directoryState === "degraded" ? (
        <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle>DAO directory is temporarily unavailable</CardTitle>
            <CardDescription>
              The directory data could not be loaded safely, so the page
              fell back to a stable empty state instead of crashing. Retry
              the page or open `/app` for guided DAO actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/daos">Retry directory</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app">Open `/app`</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {daos.map((dao) => (
          <DaoCard key={dao.daoId} dao={dao} />
        ))}
        {daos.length === 0 && directoryState !== "degraded" ? (
          <Card className="border-dashed border-border/70 bg-card/30 md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No DAOs matched this filter set</CardTitle>
              <CardDescription>
                Adjust the search, change ownership filters, or launch a DAO
                from `/app`.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
