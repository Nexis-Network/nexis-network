"use client";

import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchDeveloperProjects,
  fetchDeveloperRequestLogs,
} from "@/components/settings/developer/developer-api-data";
import { BentoCard } from "@/components/settings/shared/bento-card";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export default function ApiRequestLogsContent() {
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

  const logsQuery = useQuery({
    queryKey: ["developer-request-logs", selectedProjectId],
    queryFn: () =>
      fetchDeveloperRequestLogs({
        projectId: selectedProjectId,
        limit: 50,
      }),
    enabled: selectedProjectId.length > 0,
  });

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Request Logs"
        description="Inspect billed credits, runtime/tool breakdown, and latency for every public API request."
      />

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Project logs</h3>
            <p className="settings-card-description">
              Request logs are written before the usage dashboards roll up, so this view is the fastest way to reconcile billing.
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

          {logsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading request logs...
            </div>
          ) : logsQuery.error ? (
            <div className="text-sm text-destructive">
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "Failed to load request logs."}
            </div>
          ) : (
            <SettingsTableShell>
              <SettingsTable>
                <SettingsTableHeader>
                  <SettingsTableHeaderRow>
                    <SettingsTableHead>Request</SettingsTableHead>
                    <SettingsTableHead>Product</SettingsTableHead>
                    <SettingsTableHead>Usage</SettingsTableHead>
                    <SettingsTableHead>Tools</SettingsTableHead>
                    <SettingsTableHead>Credits</SettingsTableHead>
                    <SettingsTableHead>Latency</SettingsTableHead>
                  </SettingsTableHeaderRow>
                </SettingsTableHeader>
                <SettingsTableBody>
                  {(logsQuery.data ?? []).length === 0 ? (
                    <SettingsTableRow>
                      <SettingsTableEmptyCell colSpan={6}>
                        No request logs for this project yet.
                      </SettingsTableEmptyCell>
                    </SettingsTableRow>
                  ) : (
                    (logsQuery.data ?? []).map((log) => (
                      <SettingsTableRow key={log.id}>
                        <SettingsTableCell>
                          <div className="font-mono text-xs text-[var(--settings-foreground-strong)]">
                            {log.requestId}
                          </div>
                          <div className="text-xs text-[var(--settings-foreground-muted)]">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </SettingsTableCell>
                        <SettingsTableCell>
                          <div className="text-sm text-[var(--settings-foreground-strong)]">
                            {log.product}
                          </div>
                          <div className="text-xs text-[var(--settings-foreground-muted)]">
                            {log.provider} · {log.status}
                          </div>
                        </SettingsTableCell>
                        <SettingsTableCell className="text-xs text-[var(--settings-foreground-muted)]">
                          <div>In: {log.inputTokens.toLocaleString()}</div>
                          <div>Out: {log.outputTokens.toLocaleString()}</div>
                          <div>Cost: {formatUsd(log.totalCostUsd)}</div>
                        </SettingsTableCell>
                        <SettingsTableCell className="text-xs text-[var(--settings-foreground-muted)]">
                          {log.toolNames.length > 0 ? log.toolNames.join(", ") : "No tools"}
                        </SettingsTableCell>
                        <SettingsTableCell className="text-sm text-[var(--settings-foreground-strong)]">
                          {log.billedCredits.toLocaleString()}
                        </SettingsTableCell>
                        <SettingsTableCell className="text-xs text-[var(--settings-foreground-muted)]">
                          {log.responseLatencyMs ? `${log.responseLatencyMs} ms` : "—"}
                        </SettingsTableCell>
                      </SettingsTableRow>
                    ))
                  )}
                </SettingsTableBody>
              </SettingsTable>
            </SettingsTableShell>
          )}
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
