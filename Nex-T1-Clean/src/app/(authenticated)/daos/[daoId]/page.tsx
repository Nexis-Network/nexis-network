import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DaoWorkspace } from "@/components/daos/dao-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getCachedDaoOverviewData } from "@/server/daos/page-data";
import { resolveDaoPageAccess } from "@/server/daos/page-access";
import { DaoServiceError } from "@/modules/daos/services/shared-service";

type PageProps = {
  params: Promise<{ daoId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { daoId } = await params;
  return {
    title: `DAO Workspace • ${daoId}`,
    description:
      "Manage DAO proposals, treasury actions, members, capabilities, and on-chain bindings.",
  };
}

export default async function DaoWorkspacePage({ params }: PageProps) {
  const { daoId } = await params;
  const access = await resolveDaoPageAccess(`/daos/${daoId}`);

  if (access.isTestModePreview) {
    return (
      <DashboardShell insetClassName="overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-dashed border-border/70 bg-card/30">
            <CardHeader>
              <CardTitle>DAO workspace preview mode</CardTitle>
              <CardDescription>
                This route is running in non-production test mode without a real
                authenticated org session, so live DAO state is intentionally
                disabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/daos">Return to DAO directory</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app">Open `/app`</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  try {
    const overview = await getCachedDaoOverviewData({
      userId: access.userId,
      orgId: access.orgId,
      daoId,
    });

    return (
      <DashboardShell insetClassName="overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <DaoWorkspace overview={overview} />
        </div>
      </DashboardShell>
    );
  } catch (error) {
    if (
      error instanceof DaoServiceError &&
      (error.status === 404 || error.code === "DAO_NOT_FOUND")
    ) {
      notFound();
    }

    logger.error("dao_workspace_page_data_failed", {
      daoId,
      userId: access.userId,
      orgId: access.orgId,
      error: error instanceof Error ? error.message : String(error),
    });

    return (
      <DashboardShell insetClassName="overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
            <CardHeader>
              <CardTitle>DAO workspace is temporarily unavailable</CardTitle>
              <CardDescription>
                The workspace data could not be rendered safely, so this page
                fell back to a stable recovery state instead of crashing the
                full route.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/daos">Return to DAO directory</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href={`/app?prompt=${encodeURIComponent(
                    `Open the DAO workspace for ${daoId} and summarize the current state.`,
                  )}`}
                >
                  Open `/app`
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }
}
