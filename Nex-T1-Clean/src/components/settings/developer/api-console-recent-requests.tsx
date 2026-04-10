"use client";

import { formatDistanceToNow } from "date-fns";

import type { DeveloperRequestLog } from "@/components/settings/developer/developer-api-data";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
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

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export function ApiConsoleRecentRequests({
  logs,
}: {
  logs: DeveloperRequestLog[];
}) {
  return (
    <BentoCard>
      <BentoCardHeader title="Recent requests" />
      <SettingsTableShell>
        <SettingsTable>
          <SettingsTableHeader>
            <SettingsTableHeaderRow>
              <SettingsTableHead>Request</SettingsTableHead>
              <SettingsTableHead>Product</SettingsTableHead>
              <SettingsTableHead>Spend</SettingsTableHead>
              <SettingsTableHead>Credits</SettingsTableHead>
              <SettingsTableHead>Latency</SettingsTableHead>
            </SettingsTableHeaderRow>
          </SettingsTableHeader>
          <SettingsTableBody>
            {logs.length === 0 ? (
              <SettingsTableRow>
                <SettingsTableEmptyCell colSpan={5}>
                  No requests yet for this project.
                </SettingsTableEmptyCell>
              </SettingsTableRow>
            ) : (
              logs.slice(0, 8).map((log) => (
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
                      {log.status}
                    </div>
                  </SettingsTableCell>
                  <SettingsTableCell className="font-mono text-xs text-[var(--settings-foreground-muted)]">
                    {formatUsd(log.totalCostUsd)}
                  </SettingsTableCell>
                  <SettingsTableCell className="font-mono text-xs text-[var(--settings-foreground-muted)]">
                    {log.billedCredits.toLocaleString()}
                  </SettingsTableCell>
                  <SettingsTableCell className="font-mono text-xs text-[var(--settings-foreground-muted)]">
                    {log.responseLatencyMs ? `${log.responseLatencyMs} ms` : "—"}
                  </SettingsTableCell>
                </SettingsTableRow>
              ))
            )}
          </SettingsTableBody>
        </SettingsTable>
      </SettingsTableShell>
    </BentoCard>
  );
}
