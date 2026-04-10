"use client";

import { useState, type ChangeEvent } from "react";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { chainLabel } from "@/components/settings/agent-spend/utils";
import type { PolicyRow } from "@/components/settings/agent-spend/types";
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

type PolicySavePayload = {
  chainId: number;
  enabled: boolean;
  resetIntervalSeconds: number;
  policy: Record<string, UntypedJson>;
};

type AgentSpendLimitsTabProps = {
  rows: PolicyRow[];
  isLoading: boolean;
  saving: string | null;
  onSave: (row: PolicyRow, next: PolicySavePayload) => Promise<void>;
};

export function AgentSpendLimitsTab({
  rows,
  isLoading,
  saving,
  onSave,
}: AgentSpendLimitsTabProps) {
  return (
    <BentoCard noPadding>
      <SettingsTable>
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            <SettingsTableHead>Chain</SettingsTableHead>
            <SettingsTableHead>Wallet</SettingsTableHead>
            <SettingsTableHead>Enabled</SettingsTableHead>
            <SettingsTableHead>Reset interval (s)</SettingsTableHead>
            <SettingsTableHead>Policy (JSON)</SettingsTableHead>
            <SettingsTableHead className="text-right">
              Actions
            </SettingsTableHead>
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
          ) : rows.length ? (
            rows.map((row) => (
              <PolicyTableRow
                key={row.chain_id}
                row={row}
                saving={saving === String(row.chain_id)}
                onSave={async (next) => {
                  await onSave(row, next);
                }}
              />
            ))
          ) : (
            <SettingsTableRow>
              <SettingsTableEmptyCell colSpan={6} className="p-6">
                No policies found yet. Open the wallets page to trigger
                provisioning.
              </SettingsTableEmptyCell>
            </SettingsTableRow>
          )}
        </SettingsTableBody>
      </SettingsTable>
    </BentoCard>
  );
}

function PolicyTableRow({
  row,
  saving,
  onSave,
}: {
  row: PolicyRow;
  saving: boolean;
  onSave: (next: PolicySavePayload) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(row.enabled);
  const [reset, setReset] = useState(String(row.reset_interval_seconds));
  const [policyJson, setPolicyJson] = useState(
    JSON.stringify(row.policy ?? {}, null, 0),
  );

  return (
    <SettingsTableRow>
      <SettingsTableCell>{chainLabel(row.chain_id)}</SettingsTableCell>
      <SettingsTableCell className="mono-value text-xs">
        {row.safe_address ?? "—"}
      </SettingsTableCell>
      <SettingsTableCell>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </SettingsTableCell>
      <SettingsTableCell className="max-w-[180px]">
        <Input
          animateNumeric
          className="h-8 font-mono text-xs"
          value={reset}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setReset(e.target.value)
          }
          inputMode="numeric"
        />
      </SettingsTableCell>
      <SettingsTableCell className="max-w-[380px]">
        <Input
          className="h-8 font-mono text-xs"
          value={policyJson}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPolicyJson(e.target.value)
          }
        />
      </SettingsTableCell>
      <SettingsTableCell className="text-right">
        <Button
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={async () => {
            const parsed = JSON.parse(policyJson || "{}") as Record<
              string,
              UntypedJson
            >;
            await onSave({
              chainId: row.chain_id,
              enabled,
              resetIntervalSeconds:
                Number.parseInt(reset, 10) || row.reset_interval_seconds,
              policy: parsed,
            });
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </SettingsTableCell>
    </SettingsTableRow>
  );
}
