"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { chainLabel } from "@/components/settings/agent-spend/utils";
import type { EventRow } from "@/components/settings/agent-spend/types";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";

type AgentSpendEventsTabProps = {
  events: EventRow[];
  isLoading: boolean;
};

export function AgentSpendEventsTab({
  events,
  isLoading,
}: AgentSpendEventsTabProps) {
  return (
    <BentoCard noPadding>
      <SettingsTable>
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            <SettingsTableHead>Time</SettingsTableHead>
            <SettingsTableHead>Type</SettingsTableHead>
            <SettingsTableHead>Status</SettingsTableHead>
            <SettingsTableHead>Chain</SettingsTableHead>
            <SettingsTableHead>Wallet</SettingsTableHead>
            <SettingsTableHead>Message</SettingsTableHead>
          </SettingsTableHeaderRow>
        </SettingsTableHeader>
        <SettingsTableBody>
          {isLoading ? (
            <SettingsTableRow>
              <SettingsTableCell colSpan={6}>
                <div className="p-4">
                  <Skeleton className="h-8 w-full" />
                </div>
              </SettingsTableCell>
            </SettingsTableRow>
          ) : events.length ? (
            events.map((row) => (
              <SettingsTableRow key={row.id}>
                <SettingsTableCell className="mono-value text-xs">
                  {new Date(row.created_at).toLocaleString()}
                </SettingsTableCell>
                <SettingsTableCell className="mono-value text-xs">
                  {row.event_type}
                </SettingsTableCell>
                <SettingsTableCell>
                  <Badge variant="outline" className="text-xs">
                    {row.status}
                  </Badge>
                </SettingsTableCell>
                <SettingsTableCell>
                  {row.chain_id ? chainLabel(row.chain_id) : "—"}
                </SettingsTableCell>
                <SettingsTableCell className="mono-value text-xs">
                  {row.safe_address ?? "—"}
                </SettingsTableCell>
                <SettingsTableCell>{row.title}</SettingsTableCell>
              </SettingsTableRow>
            ))
          ) : (
            <SettingsTableRow>
              <SettingsTableEmptyCell colSpan={6} className="p-6">
                No wallet events yet.
              </SettingsTableEmptyCell>
            </SettingsTableRow>
          )}
        </SettingsTableBody>
      </SettingsTable>
    </BentoCard>
  );
}
