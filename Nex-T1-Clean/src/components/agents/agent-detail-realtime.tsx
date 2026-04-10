"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";

import type { AgentDetail, AgentDeployment, AgentListingSummary, AgentVersion } from "@/lib/agents/types";
import { createClient } from "@/lib/supabase/client";
import { AgentDetailHeader } from "@/components/agents/agent-detail-header";
import { AgentMeta } from "@/components/agents/agent-meta";
import { AgentPricingPanel } from "@/components/agents/agent-pricing-panel";
import { DeployStatusBar } from "@/components/agents/deploy-status-bar";
import { LogsStream } from "@/components/agents/logs-stream";
import { trackAgentEvent } from "@/modules/analytics/events";
import { AgentPerformancePanel } from "@/components/agents/agent-performance-panel";
import { AgentListingsManager } from "@/components/agents/agent-listings-manager";
import { AgentControlsPanel } from "@/components/agents/agent-controls-panel";
import { AgentTradeHistoryPanel } from "@/components/agents/agent-trade-history-panel";
import { AgentCampaignManager } from "@/components/agents/agent-campaign-manager";

type LogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

type AgentUsageEventRow = {
  id: string;
  type: string;
  created_at: string;
  amount_base_units?: string | null;
};

type AgentDetailRealtimeProps = {
  agent: AgentDetail["agent"];
  listings: AgentListingSummary[];
  versions: AgentVersion[];
  deployments: AgentDeployment[];
  logs: LogEntry[];
  canManage: boolean;
  canViewPrivateConfig: boolean;
};

export function AgentDetailRealtime({ agent, listings, versions, deployments, logs, canManage, canViewPrivateConfig }: AgentDetailRealtimeProps) {
  const [currentListings, setListings] = useState(listings);
  const [currentDeployments, setDeployments] = useState<AgentDeployment[]>(deployments);
  const [currentLogs, setLogs] = useState<LogEntry[]>(logs);
  const canViewRealtimeLogs = canManage || canViewPrivateConfig;

  useEffect(() => setListings(listings), [listings]);

  useEffect(() => {
    const supabase = createClient();
    const deploymentChannel = supabase
      .channel(`agent_deployment:${agent.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_deployment", filter: `agent_id=eq.${agent.id}` },
        (payload: RealtimePostgresChangesPayload<Record<string, UntypedJson>>) => {
          const next = payload.new as AgentDeployment | null;
          if (!next) return;
          setDeployments((prev) => {
            const existingIndex = prev.findIndex((item) => item.id === next.id);
            if (existingIndex >= 0) {
              const clone = [...prev];
              clone[existingIndex] = next;
              return clone.sort(sortDeployments);
            }
            const clone = [...prev, next];
            return clone.sort(sortDeployments);
          });

          const status = next.status.toLowerCase();
          toast.success(`Deployment ${status}`, {
            description: `Container ${next.containerId ?? "pending"} is ${status}.`,
          });

          trackAgentEvent("deploy_status_updated", {
            agent_id: agent.id,
            deployment_id: next.id,
            status,
          });

          setLogs((prev) => [
            {
              id: `${next.id}-${Date.now()}`,
              message: `Deployment ${status}`,
              timestamp: next.updatedAt ?? next.createdAt,
            },
            ...prev,
          ]);
        },
      )
      .subscribe();

    const logChannel = canViewRealtimeLogs
      ? supabase
          .channel(`agent_logs:${agent.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "agent_usage_event", filter: `agent_id=eq.${agent.id}` },
            (payload: RealtimePostgresChangesPayload<Record<string, UntypedJson>>) => {
              const row = payload.new as AgentUsageEventRow | null;
              if (!row) return;
              setLogs((prev) => [
                {
                  id: row.id,
                  message: row.type ?? "usage_event",
                  timestamp: row.created_at,
                },
                ...prev,
              ]);
              trackAgentEvent("agent_usage_event", {
                agent_id: agent.id,
                event_id: row.id,
                type: row.type,
              });
            },
          )
          .subscribe()
      : null;

    return () => {
      deploymentChannel.unsubscribe();
      supabase.removeChannel(deploymentChannel);
      if (logChannel) {
        logChannel.unsubscribe();
        supabase.removeChannel(logChannel);
      }
    };
  }, [agent.id, canViewRealtimeLogs]);

  const latestDeployment = useMemo(() => currentDeployments[0], [currentDeployments]);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden ">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8 no-scrollbar">
        <AgentDetailHeader
          agent={agent}
          versionsCount={versions.length}
          latestDeployment={latestDeployment ? { status: latestDeployment.status, provider: latestDeployment.teeProvider } : undefined}
        />
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <AgentControlsPanel agent={agent} versions={versions} canManage={canManage} canViewPrivateConfig={canViewPrivateConfig} />
            <AgentMeta agent={agent} versions={versions} />
            <AgentPerformancePanel agentId={agent.id} />
            <AgentTradeHistoryPanel agentId={agent.id} />
            {canViewRealtimeLogs ? (
              <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <header>
                  <h2 className="text-lg font-regular text-white">Realtime logs</h2>
                  <p className="text-sm text-muted-foreground">Owner/admin telemetry with sensitive data redacted.</p>
                </header>
                <LogsStream logs={currentLogs} />
              </section>
            ) : (
              <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <header>
                  <h2 className="text-lg font-regular text-white">Realtime logs</h2>
                  <p className="text-sm text-muted-foreground">
                    Realtime telemetry is restricted to the agent owner and workspace admins.
                  </p>
                </header>
              </section>
            )}
          </div>
          <div className="space-y-6">
            <AgentPricingPanel agentId={agent.id} listings={currentListings} />
            <AgentListingsManager agentId={agent.id} canManage={canManage} />
            <AgentCampaignManager agentId={agent.id} canManage={canManage} />
            <DeployStatusBar deployments={currentDeployments} />
          </div>
        </div>
      </main>
    </div>
  );
}

function sortDeployments(a: AgentDeployment, b: AgentDeployment) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
