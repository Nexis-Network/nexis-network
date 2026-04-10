"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchDeveloperBilling,
  fetchDeveloperProjects,
  fetchDeveloperUsage,
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

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--settings-foreground-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium text-[var(--settings-foreground-strong)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
        {detail}
      </p>
    </div>
  );
}

export default function ApiUsageContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const projectsQuery = useQuery({
    queryKey: ["developer-projects"],
    queryFn: fetchDeveloperProjects,
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  useEffect(() => {
    if (selectedProjectId || projects.length === 0) {
      return;
    }

    setSelectedProjectId(projects[0].id);
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Usage & Billing"
        description="Monitor monthly credit burn, spend caps, and overage exposure for each public API project."
      />

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Project selector</h3>
            <p className="settings-card-description">
              Usage and billing reconcile against the request-log source of truth per project.
            </p>
          </div>

          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={projects.length === 0}
            className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {projects.length === 0 ? (
              <option value="">No developer projects yet</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </BentoCard>

      <BentoCard>
        {usageQuery.isLoading || billingQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading usage summary...
          </div>
        ) : usageQuery.error || billingQuery.error ? (
          <div className="text-sm text-destructive">
            {usageQuery.error instanceof Error
              ? usageQuery.error.message
              : billingQuery.error instanceof Error
                ? billingQuery.error.message
                : "Failed to load usage data."}
          </div>
        ) : usageQuery.data && billingQuery.data ? (
          <div className="space-y-6">
            <div>
              <h3 className="settings-card-title">Current period</h3>
              <p className="settings-card-description">
                {selectedProject?.name ?? "Selected project"} is on the {billingQuery.data.plan.label} plan with {billingQuery.data.includedCredits.toLocaleString()} included credits.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SummaryMetric
                label="Monthly credits"
                value={usageQuery.data.monthly.billedCredits.toLocaleString()}
                detail={`${usageQuery.data.monthly.requests.toLocaleString()} requests this month`}
              />
              <SummaryMetric
                label="Monthly spend"
                value={formatUsd(usageQuery.data.monthly.spendUsd)}
                detail={`${billingQuery.data.overageCredits.toLocaleString()} overage credits`}
              />
              <SummaryMetric
                label="Daily credits"
                value={usageQuery.data.daily.billedCredits.toLocaleString()}
                detail={formatUsd(usageQuery.data.daily.spendUsd)}
              />
              <SummaryMetric
                label="Invoice preview"
                value={formatUsd(billingQuery.data.spendUsd)}
                detail={`Overage priced at $${billingQuery.data.plan.overagePricePerThousandCreditsUsd}/1k credits`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                  Spend guardrails
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--settings-foreground-muted)]">
                  <p>Soft cap: {formatUsd(billingQuery.data.softSpendCapUsd ?? 0)}</p>
                  <p>Hard cap: {formatUsd(billingQuery.data.hardSpendCapUsd ?? 0)}</p>
                  <p>Overage: {billingQuery.data.overageEnabled ? "enabled" : "disabled"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                  Credit reconciliation
                </p>
                <div className="mt-3 space-y-2 text-sm text-[var(--settings-foreground-muted)]">
                  <p>Included credits: {billingQuery.data.includedCredits.toLocaleString()}</p>
                  <p>Used credits: {billingQuery.data.billedCredits.toLocaleString()}</p>
                  <p>Overage credits: {billingQuery.data.overageCredits.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--settings-foreground-muted)]">
            Create a developer project to start tracking billing and request usage.
          </p>
        )}
      </BentoCard>
    </SettingsPage>
  );
}
