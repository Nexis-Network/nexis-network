"use client";

import { Loader2, Activity, BadgeDollarSign, Gauge, KeyRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  buildInsightSummary,
  buildProductBreakdown,
  buildRecentActivity,
  buildToolBreakdown,
} from "@/components/settings/developer/api-console-analytics";
import { ApiConsoleCharts } from "@/components/settings/developer/api-console-charts";
import { ApiConsolePlanCard } from "@/components/settings/developer/api-console-plan-card";
import { ApiConsoleRecentRequests } from "@/components/settings/developer/api-console-recent-requests";
import { ApiKeyCreateForm } from "@/components/settings/developer/api-key-create-form";
import { ApiKeysTable } from "@/components/settings/developer/api-keys-table";
import { ApiProjectForm } from "@/components/settings/developer/api-project-form";
import {
  fetchApiKeys,
  fetchDeveloperBilling,
  fetchDeveloperProjects,
  fetchDeveloperRequestLogs,
  fetchDeveloperUsage,
  fetchOrganizations,
  fetchPublicDeveloperModels,
} from "@/components/settings/developer/developer-api-data";
import { BentoCard } from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--settings-foreground-muted)]">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[var(--settings-foreground-muted)]" />
      </div>
      <p className="mt-3 font-mono text-2xl text-[var(--settings-foreground-strong)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
        {detail}
      </p>
    </div>
  );
}

async function rotateApiKey(id: string) {
  const response = await fetch("/api/auth/api-key/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "Failed to rotate API key.");
  }
}

async function revokeApiKey(id: string) {
  const response = await fetch("/api/auth/api-key/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "Failed to revoke API key.");
  }
}

export default function ApiConsoleContent() {
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const organizationsQuery = useQuery({ queryKey: ["developer-organizations"], queryFn: fetchOrganizations, staleTime: 60_000 });
  const projectsQuery = useQuery({ queryKey: ["developer-projects"], queryFn: fetchDeveloperProjects });
  const apiKeysQuery = useQuery({ queryKey: ["developer-api-keys"], queryFn: fetchApiKeys });
  const modelsQuery = useQuery({ queryKey: ["developer-public-models"], queryFn: fetchPublicDeveloperModels, staleTime: 60_000 });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const usageQuery = useQuery({
    queryKey: ["developer-usage", selectedProjectId],
    queryFn: () => fetchDeveloperUsage(selectedProjectId),
    enabled: selectedProjectId.length > 0,
  });
  const billingQuery = useQuery({
    queryKey: ["developer-billing", selectedProjectId],
    queryFn: () => fetchDeveloperBilling(selectedProjectId),
    enabled: selectedProjectId.length > 0,
  });
  const logsQuery = useQuery({
    queryKey: ["developer-request-logs", selectedProjectId],
    queryFn: () => fetchDeveloperRequestLogs({ projectId: selectedProjectId, limit: 40 }),
    enabled: selectedProjectId.length > 0,
  });

  const rotateKey = useMutation({
    mutationFn: rotateApiKey,
    onSuccess: () => {
      toast.success("API key rotated.");
      void apiKeysQuery.refetch();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to rotate API key."),
  });
  const deleteKey = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success("API key revoked.");
      void apiKeysQuery.refetch();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to revoke API key."),
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const insights = useMemo(() => buildInsightSummary(logs), [logs]);
  const activityData = useMemo(() => buildRecentActivity(logs), [logs]);
  const productData = useMemo(() => buildProductBreakdown(logs), [logs]);
  const toolData = useMemo(() => buildToolBreakdown(logs), [logs]);
  const currentPlanId = billingQuery.data?.plan.id ?? null;
  const nextPlan = useMemo(() => {
    const plans = modelsQuery.data?.plans ?? [];
    const index = plans.findIndex((plan) => plan.id === currentPlanId);
    return index >= 0 && index < plans.length - 1 ? plans[index + 1] : null;
  }, [currentPlanId, modelsQuery.data?.plans]);

  if (projectsQuery.isLoading) {
    return (
      <SettingsPage>
        <SettingsPageHeader title="API" description="Loading your public API console..." />
        <BentoCard>
          <div className="flex items-center gap-2 text-sm text-[var(--settings-foreground-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading API console...
          </div>
        </BentoCard>
      </SettingsPage>
    );
  }

  if (projects.length === 0) {
    return (
      <SettingsPage>
        <SettingsPageHeader title="API" description="Create a developer project to issue public API keys and start tracking usage, spend, and limits." />
        <BentoCard className="space-y-4">
          <div>
            <h3 className="settings-card-title">Bootstrap your API workspace</h3>
            <p className="settings-card-description">Projects own spend caps, billing context, request logs, and the keys that call the public Nex API.</p>
          </div>
          <ApiProjectForm organizations={organizationsQuery.data ?? []} onCreated={() => void projectsQuery.refetch()} />
        </BentoCard>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage>
      <SettingsPageHeader title="API" description="Monitor your public Nex API plan, issue project-scoped keys, and track live request economics from one settings surface." />

      <BentoCard className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="settings-card-title">Project console</h3>
            <p className="settings-card-description">Switch between developer projects to compare limits, spend, and request behavior.</p>
          </div>
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-10 w-full rounded-md border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring lg:max-w-[320px]">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </BentoCard>

      {usageQuery.data && billingQuery.data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard icon={Gauge} label="Monthly requests" value={usageQuery.data.monthly.requests.toLocaleString()} detail={`${billingQuery.data.plan.requestsPerMinute} RPM on ${billingQuery.data.plan.label}`} />
            <MetricCard icon={BadgeDollarSign} label="Monthly spend" value={formatUsd(usageQuery.data.monthly.spendUsd)} detail={`${billingQuery.data.overageCredits.toLocaleString()} overage credits`} />
            <MetricCard icon={Activity} label="Success rate" value={`${insights.successRate}%`} detail={`${insights.averageLatencyMs} ms average latency`} />
            <MetricCard icon={KeyRound} label="Active keys" value={apiKeysQuery.data?.filter((key) => key.projectId === selectedProjectId).length.toString() ?? "0"} detail={`${insights.uniqueTools} distinct public tools used`} />
          </div>

          <ApiConsolePlanCard billing={billingQuery.data} usage={usageQuery.data} nextPlan={nextPlan} />
          <ApiConsoleCharts activityData={activityData} productData={productData} toolData={toolData} />
          <ApiConsoleRecentRequests logs={logs} />
        </>
      ) : (
        <BentoCard>
          <div className="flex items-center gap-2 text-sm text-[var(--settings-foreground-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading project analytics...
          </div>
        </BentoCard>
      )}

      <BentoCard className="space-y-4">
        <div>
          <h3 className="settings-card-title">Issue API keys</h3>
          <p className="settings-card-description">Create keys against the selected project, restrict product access, and rotate or revoke credentials without leaving the page.</p>
        </div>
        <ApiKeyCreateForm organizations={organizationsQuery.data ?? []} products={modelsQuery.data?.data ?? []} projects={projects} onCreated={() => void apiKeysQuery.refetch()} />
        <ApiKeysTable apiKeys={(apiKeysQuery.data ?? []).filter((key) => key.projectId === selectedProjectId)} projects={projects} rotatePending={rotateKey.isPending} deletePending={deleteKey.isPending} onRotate={(id) => rotateKey.mutate(id)} onDelete={(id) => deleteKey.mutate(id)} />
      </BentoCard>
    </SettingsPage>
  );
}
