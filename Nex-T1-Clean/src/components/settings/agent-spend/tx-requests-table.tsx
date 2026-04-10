"use client";

import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

import type { SafeTxRequestListItem } from "@/components/settings/agent-spend/types";
import {
  chainLabel,
  explorerAddressUrl,
  truncateHex,
} from "@/components/settings/agent-spend/utils";
import { useState, useMemo } from "react";
import { Button } from "@/components/settings/shared/settings-button";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
type Props = {
  userId: string | null;
  items: SafeTxRequestListItem[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

export function TxRequestsTable({
  userId,
  items,
  isLoading,
  onRefresh,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  // SECURITY: Test mode (which bypasses cryptographic signing) is only available in
  // non-production builds. In production, window.__TEST_MODE cannot bypass tx signing.
  const isDev = process.env.NODE_ENV !== "production";
  const testMode =
    isDev &&
    ((typeof window !== "undefined" &&
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
      process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
      process.env.E2E_TEST_MODE === "true");
  // Safe owner keys removed — CDP V2 wallets handle signing.
  const localOwnerEnabled = testMode;
  const canUsePasskeys =
    !testMode &&
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  const approvals = useMemo(
    () => items.filter((i) => i.status === "proposed"),
    [items],
  );

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
            <SettingsTableHead>Nonce</SettingsTableHead>
            <SettingsTableHead className="text-right">
              Actions
            </SettingsTableHead>
          </SettingsTableHeaderRow>
        </SettingsTableHeader>
        <SettingsTableBody>
          {isLoading ? (
            <SettingsTableRow>
              <SettingsTableCell colSpan={7}>
                <div className="p-4">
                  <Skeleton className="h-8 w-full" />
                </div>
              </SettingsTableCell>
            </SettingsTableRow>
          ) : approvals.length ? (
            approvals.map((row) => (
              <SettingsTableRow key={row.id}>
                <SettingsTableCell className="font-mono text-xs">
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
                <SettingsTableCell className="font-mono text-xs">
                  {truncateHex(row.safe_address)}
                </SettingsTableCell>
                <SettingsTableCell className="font-mono text-xs">
                  {truncateHex(row.to_address)}
                </SettingsTableCell>
                <SettingsTableCell className="font-mono text-xs">
                  {row.nonce ?? "—"}
                </SettingsTableCell>
                <SettingsTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {explorerAddressUrl(row.chain_id, row.safe_address) ? (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            onClick={() => {
                              const href = explorerAddressUrl(
                                row.chain_id,
                                row.safe_address,
                              );
                              if (href)
                                window.open(
                                  href,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                            }}
                            aria-label="View wallet on explorer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          View wallet
                        </TooltipContent>
                      </Tooltip>
                    ) : null}

                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={() =>
                            window.location.assign("/settings/agent-spend")
                          }
                          aria-label="Open agent spend controls"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>
                        Spend controls
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      variant="default"
                      className="h-9"
                      disabled={
                        !localOwnerEnabled ||
                        !userId ||
                        !row.safe_tx_hash ||
                        busyId === row.id
                      }
                      onClick={async () => {
                        if (!userId || !row.safe_tx_hash) return;
                        setBusyId(row.id);
                        try {
                          // Safe owner key signing removed — use passkey flow instead.
                          const signature = "0x";
                          const res = await fetch(
                            "/api/wallets/safe/tx-requests/approve",
                            {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                requestId: row.id,
                                signature,
                              }),
                            },
                          );
                          if (!res.ok) {
                            const msg = await res.text().catch(() => "");
                            throw new Error(
                              msg || `approve_failed:${res.status}`,
                            );
                          }
                          await onRefresh();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {busyId === row.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Approve
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9"
                      disabled={
                        !userId ||
                        !row.safe_tx_hash ||
                        !canUsePasskeys ||
                        busyId === `${row.id}:passkey`
                      }
                      onClick={async () => {
                        if (!userId || !row.safe_tx_hash) return;
                        setBusyId(`${row.id}:passkey`);
                        try {
                          const optRes = await fetch(
                            "/api/wallets/safe/tx-requests/passkey/options",
                            {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ requestId: row.id }),
                            },
                          );
                          const optJson = await optRes.json().catch(() => ({}));
                          if (!optRes.ok) {
                            throw new Error(
                              String(
                                optJson?.error ??
                                  `passkey_options_failed:${optRes.status}`,
                              ),
                            );
                          }

                          const assertion = await startAuthentication({
                            optionsJSON: optJson.options,
                          });

                          const res = await fetch(
                            "/api/wallets/safe/tx-requests/passkey/approve",
                            {
                              method: "POST",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                requestId: row.id,
                                response: assertion,
                              }),
                            },
                          );
                          if (!res.ok) {
                            const json = await res.json().catch(() => ({}));
                            throw new Error(
                              String(
                                json?.error ??
                                  `passkey_approve_failed:${res.status}`,
                              ),
                            );
                          }
                          await onRefresh();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {busyId === `${row.id}:passkey` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Approve with passkey
                    </Button>
                  </div>
                </SettingsTableCell>
              </SettingsTableRow>
            ))
          ) : (
            <SettingsTableRow>
              <SettingsTableEmptyCell colSpan={7} className="p-6">
                No pending approvals.
              </SettingsTableEmptyCell>
            </SettingsTableRow>
          )}
        </SettingsTableBody>
      </SettingsTable>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--bento-border)] px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || busyId !== null}
          onClick={() => void onRefresh()}
        >
          {busyId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>
    </BentoCard>
  );
}
