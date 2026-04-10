"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { chainLabel } from "@/components/settings/agent-spend/utils";
import type { SafeTxRequestListItem } from "@/components/settings/agent-spend/types";
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

type AgentSpendTransactionsTabProps = {
  items: SafeTxRequestListItem[];
  isLoading: boolean;
};

export function AgentSpendTransactionsTab({
  items,
  isLoading,
}: AgentSpendTransactionsTabProps) {
  return (
    <BentoCard noPadding>
      <SettingsTable>
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            <SettingsTableHead>Time</SettingsTableHead>
            <SettingsTableHead>Status</SettingsTableHead>
            <SettingsTableHead>Chain</SettingsTableHead>
            <SettingsTableHead>Wallet</SettingsTableHead>
            <SettingsTableHead>To</SettingsTableHead>
            <SettingsTableHead className="text-right">Notes</SettingsTableHead>
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
          ) : items.length ? (
            items.map((row) => (
              <SettingsTableRow key={row.id}>
                <SettingsTableCell className="mono-value text-xs">
                  {new Date(row.created_at).toLocaleString()}
                </SettingsTableCell>
                <SettingsTableCell>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {row.status}
                  </Badge>
                </SettingsTableCell>
                <SettingsTableCell>
                  {chainLabel(row.chain_id)}
                </SettingsTableCell>
                <SettingsTableCell className="mono-value text-xs">
                  {row.safe_address}
                </SettingsTableCell>
                <SettingsTableCell className="mono-value text-xs">
                  {row.to_address}
                </SettingsTableCell>
                <SettingsTableCell className="text-right text-xs">
                  {row.last_error
                    ? row.last_error
                    : row.requires_mfa
                      ? "MFA required"
                      : "—"}
                </SettingsTableCell>
              </SettingsTableRow>
            ))
          ) : (
            <SettingsTableRow>
              <SettingsTableEmptyCell colSpan={6} className="p-6">
                No transactions yet.
              </SettingsTableEmptyCell>
            </SettingsTableRow>
          )}
        </SettingsTableBody>
      </SettingsTable>
    </BentoCard>
  );
}
