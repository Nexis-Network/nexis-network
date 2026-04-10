"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";
import {
  walletLedgerCountBadgeClass,
  walletLedgerDescriptionClass,
  walletLedgerExpandedCellClass,
  walletLedgerHeadClass,
  walletLedgerHeaderClass,
  walletLedgerSecondaryButtonClass,
  walletLedgerSectionBodyClass,
  walletLedgerSurfaceClass,
  walletLedgerTableClass,
  walletLedgerTitleClass,
} from "@/lib/ui/wallet-ledger";
import type { WalletsTableProps, WalletRow } from "./lib/wallet-table-types";
import { COLUMN_COUNT } from "./lib/wallet-formatters";
import { normalizeWalletRows } from "./lib/wallet-normalizers";
import { WalletRowComponent } from "./wallet-row";
import { WalletTableModals } from "./wallet-table-modals";

export function WalletsTable({
  wallets,
  isLoading,
  error,
  initialAction = null,
  initialWalletAddress = null,
}: WalletsTableProps) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sendAssetOpen, setSendAssetOpen] = useState(false);
  const [receiveAssetOpen, setReceiveAssetOpen] = useState(false);
  const [exportKeyOpen, setExportKeyOpen] = useState(false);
  const [activeActionWallet, setActiveActionWallet] =
    useState<WalletRow | null>(null);
  const autoOpenedActionRef = useRef<string | null>(null);

  const pageSize = 10;

  const rows = useMemo(() => normalizeWalletRows(wallets), [wallets]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage]);
  const showSkeleton = isLoading && rows.length === 0;

  const handleCopyAddress = (address: string | null) => {
    if (!address?.trim()) return;
    void navigator.clipboard?.writeText(address).catch(() => {});
  };

  const clearWalletAction =
    (setter: (v: boolean) => void) => (next: boolean) => {
      setter(next);
      if (!next) setTimeout(() => setActiveActionWallet(null), 200);
    };

  useEffect(() => {
    if (!initialAction || rows.length === 0) return;

    const normalizedTarget = initialWalletAddress?.trim().toLowerCase() ?? null;
    const actionKey = `${initialAction}:${normalizedTarget ?? "first"}`;
    if (autoOpenedActionRef.current === actionKey) return;

    const targetWallet =
      rows.find((row) => {
        if (!normalizedTarget) return true;
        const addresses = [
          row.smartAccountAddress,
          row.address,
          row.engineServerWalletAddress,
        ];
        return addresses.some(
          (candidate) => candidate?.toLowerCase() === normalizedTarget,
        );
      }) ?? null;

    if (!targetWallet) return;

    setActiveActionWallet(targetWallet);
    setSendAssetOpen(initialAction === "send");
    setReceiveAssetOpen(initialAction === "receive");
    setExportKeyOpen(initialAction === "export-private-key");
    autoOpenedActionRef.current = actionKey;
  }, [initialAction, initialWalletAddress, rows]);

  return (
    <>
      <section
        data-settings-surface="ledger"
        className={walletLedgerSurfaceClass}
      >
        <div className={walletLedgerHeaderClass}>
          <div>
            <h2 className={walletLedgerTitleClass}>Wallet overview</h2>
            <p className={walletLedgerDescriptionClass}>
              Embedded and smart wallets across your active chains.
            </p>
          </div>
          {rows.length > 0 ? (
            <Badge variant="outline" className={walletLedgerCountBadgeClass}>
              <span className="mono-value">{rows.length}</span> total
            </Badge>
          ) : null}
        </div>

        {error ? (
          <div className="border-b border-transparent bg-red-500/5 px-4 py-3 sm:px-5">
            <Alert variant="destructive">
              <AlertTitle>Unable to load wallets</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className={walletLedgerSectionBodyClass}>
          <SettingsTable className={walletLedgerTableClass}>
            <SettingsTableHeader className="border-y-0 bg-transparent">
              <SettingsTableHeaderRow className="border-0">
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[320px]`}
                >
                  Wallet
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[140px]`}
                >
                  Type
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[110px] text-right`}
                >
                  24h %
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[160px] text-right`}
                >
                  Unrealized P&amp;L
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[140px] text-right`}
                >
                  Tokens ($ worth)
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[140px] text-right`}
                >
                  NFTs ($ worth)
                </SettingsTableHead>
                <SettingsTableHead
                  className={`${walletLedgerHeadClass} normal-case w-[200px] text-right`}
                >
                  Actions
                </SettingsTableHead>
              </SettingsTableHeaderRow>
            </SettingsTableHeader>
            <SettingsTableBody>
              {showSkeleton ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SettingsTableRow key={`skeleton-${i}`} className="border-0">
                    <SettingsTableCell
                      colSpan={COLUMN_COUNT}
                      className={walletLedgerExpandedCellClass}
                    >
                      <Skeleton className="h-12 w-full bg-[var(--settings-elevated)]" />
                    </SettingsTableCell>
                  </SettingsTableRow>
                ))
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <WalletRowComponent
                    key={row.id}
                    row={row}
                    isExpanded={Boolean(expanded[row.id])}
                    onToggleExpand={(id) =>
                      setExpanded((m) => ({ ...m, [id]: !m[id] }))
                    }
                    onCopyAddress={handleCopyAddress}
                    onSendClick={(w) => {
                      setActiveActionWallet(w);
                      setSendAssetOpen(true);
                    }}
                    onReceiveClick={(w) => {
                      setActiveActionWallet(w);
                      setReceiveAssetOpen(true);
                    }}
                    onExportKeyClick={(w) => {
                      setActiveActionWallet(w);
                      setExportKeyOpen(true);
                    }}
                    onActivateClick={() => {}}
                  />
                ))
              ) : (
                <SettingsTableRow className="border-0">
                  <SettingsTableCell
                    colSpan={COLUMN_COUNT}
                    className={walletLedgerExpandedCellClass}
                  >
                    <div className="py-6 text-center text-sm text-[var(--settings-foreground-muted)]">
                      No Nex Wallets found yet.
                    </div>
                  </SettingsTableCell>
                </SettingsTableRow>
              )}
            </SettingsTableBody>
          </SettingsTable>
        </div>

        {rows.length > pageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-transparent px-4 py-3 text-xs text-[var(--settings-foreground-muted)] sm:px-5">
            <div>
              Showing{" "}
              <span className="mono-value">
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, rows.length)}
              </span>{" "}
              of <span className="mono-value">{rows.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`${walletLedgerSecondaryButtonClass} px-2.5 py-1.5 disabled:opacity-50`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <span>
                Page <span className="mono-value">{currentPage}</span> /{" "}
                <span className="mono-value">{totalPages}</span>
              </span>
              <button
                className={`${walletLedgerSecondaryButtonClass} px-2.5 py-1.5 disabled:opacity-50`}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <WalletTableModals
        sendAssetOpen={sendAssetOpen}
        onSendAssetOpenChange={clearWalletAction(setSendAssetOpen)}
        receiveAssetOpen={receiveAssetOpen}
        onReceiveAssetOpenChange={clearWalletAction(setReceiveAssetOpen)}
        exportKeyOpen={exportKeyOpen}
        onExportKeyOpenChange={clearWalletAction(setExportKeyOpen)}
        activeActionWallet={activeActionWallet}
      />
    </>
  );
}
