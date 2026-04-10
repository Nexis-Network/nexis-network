import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentDetailRealtime } from "@/components/agents/agent-detail-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgentDetail, getAgentListings } from "@/lib/agents/api";
import type { AgentListingSummary, AgentDetail } from "@/lib/agents/types";
import { canManageAgent } from "@/server/agents/access";
import { createClient as createSupabase } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { logger } from '@/lib/logger';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  try {
    const { agentId } = await params;
    const detail = await getAgentDetail(agentId);
    return {
      title: `${detail.agent.name} | Nex-T1 Agent Marketplace`,
      description: detail.agent.description ?? "Production-ready agent on the Nex-T1 marketplace.",
    };
  } catch {
    return {
      title: "Agent | Nex-T1 Agent Marketplace",
      description: "View agent details, deployment status, and pricing options.",
    };
  }
}

function AgentDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  return (
    <Suspense fallback={<AgentDetailSkeleton />}>
      <AgentDetailContent agentId={agentId} />
    </Suspense>
  );
}

async function AgentDetailContent({ agentId }: { agentId: string }) {
  const [detailResult, listingsResult] = await Promise.allSettled([
    getAgentDetail(agentId),
    getAgentListings(agentId),
  ]);

  if (detailResult.status === "rejected") {
    logger.warn("agent_detail_fetch_failed", { agentId, error: detailResult.reason });
    notFound();
  }

  const detail: AgentDetail = detailResult.value;
  const fallbackListings = listingsResult.status === "fulfilled" ? listingsResult.value : [];

  let canManage = false;
  let canViewPrivateConfig = false;
  try {
    const supabase = await createSupabase();
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;
      if (userId) {
        canViewPrivateConfig = detail.agent.ownerUserId === userId;

        const service = createServiceRoleClient();
        const { data: membership } = await service
          .from("org_member")
          .select("role")
          .eq("org_id", detail.agent.orgId)
          .eq("user_id", userId)
          .maybeSingle();

        if (membership?.role) {
          const role = membership.role as UntypedJson;
          canManage = canManageAgent(role);
          canViewPrivateConfig = canViewPrivateConfig || role === "owner" || role === "admin";
        }
      }
    }
  } catch {
    canManage = false;
    canViewPrivateConfig = false;
  }

  const listings: AgentListingSummary[] = detail.listings.length > 0
    ? detail.listings
    : fallbackListings;

  const logs = detail.deployments.map((deployment) => ({
    id: deployment.id,
    message: `${deployment.status} • ${deployment.statusReason ?? "No additional context"}`,
    timestamp: deployment.updatedAt ?? deployment.createdAt,
  }));

  return (
    <AgentDetailRealtime
      agent={detail.agent}
      versions={detail.versions}
      listings={listings}
      deployments={detail.deployments}
      logs={logs}
      canManage={canManage}
      canViewPrivateConfig={canViewPrivateConfig}
    />
  );
}
