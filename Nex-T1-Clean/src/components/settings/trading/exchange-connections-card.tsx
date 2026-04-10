"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import { MoreHorizontal, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { PlusIcon, TrashIcon } from "@/components/sidebar-03/animated-icons";
import { ExchangeConnectionModal } from "./exchange-connection-modal";

// Exchange metadata for display
const EXCHANGE_META: Record<string, { name: string }> = {
  binance: { name: "Binance" },
  coinbase: { name: "Coinbase" },
  kraken: { name: "Kraken" },
  bybit: { name: "Bybit" },
  okx: { name: "OKX" },
  bitfinex: { name: "Bitfinex" },
  huobi: { name: "Huobi" },
  kucoin: { name: "KuCoin" },
  gemini: { name: "Gemini" },
};

export interface ExchangeConnection {
  id: string;
  exchangeId: string;
  label: string;
  isActive: boolean;
  isTestnet: boolean;
  permissions: {
    spot: boolean;
    futures: boolean;
    withdraw: boolean;
  };
  lastUsedAt?: string;
  createdAt: string;
}

interface ExchangeConnectionsCardProps {
  connections: ExchangeConnection[];
  isLoading: boolean;
  error?: string | null;
  onAdd: (data: {
    exchangeId: string;
    label: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    isTestnet: boolean;
    permissions: { spot: boolean; futures: boolean; withdraw: boolean };
  }) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

export function ExchangeConnectionsCard({
  connections,
  isLoading,
  error,
  onAdd,
  onToggle,
  onRemove,
  onRefresh,
}: ExchangeConnectionsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ExchangeConnection | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleToggle = async (connection: ExchangeConnection) => {
    setActionLoading(connection.id);
    try {
      await onToggle(connection.id, !connection.isActive);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!selectedConnection) return;
    setActionLoading(selectedConnection.id);
    try {
      await onRemove(selectedConnection.id);
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <BentoCard>
        <BentoCardHeader title="Exchange Connections" />
        <p className="text-xs text-[var(--bento-text-muted)] mb-3">Loading your connected exchanges...</p>
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  if (error) {
    return (
      <BentoCard className="border-destructive/40">
        <BentoCardHeader title="Exchange Connections" />
        <p className="text-xs text-[var(--bento-text-muted)] mb-3">
          We couldn&apos;t load your exchange connections. Please try again.
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          {onRefresh && (
            <Button tone="surface" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </BentoCard>
    );
  }

  return (
    <>
      <BentoCard>
        <BentoCardHeader
          title="Exchange Connections"
          action={
            <Button
              size="sm"
              tone="primary"
              onClick={() => setModalOpen(true)}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Exchange
            </Button>
          }
        />
        <p className="settings-card-description">
          Connect your CEX accounts for AI-powered trading execution.
        </p>
        <div className={connections.length === 0 ? "space-y-4" : "settings-inline-list"}>
          {connections.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)]">
                <PlusIcon className="h-6 w-6 text-[var(--bento-text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--bento-text-primary)]">
                  No exchanges connected
                </p>
                <p className="text-xs text-[var(--bento-text-muted)] mt-1">
                  Connect your first exchange to enable AI-powered trading.
                </p>
              </div>
              <Button
                tone="surface"
                size="sm"
                onClick={() => setModalOpen(true)}
              >
                Connect Exchange
              </Button>
            </div>
          ) : (
            connections.map((connection) => {
              const meta = EXCHANGE_META[connection.exchangeId] || {
                name: connection.exchangeId,
              };

              return (
                <div
                  key={connection.id}
                  className="settings-inline-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] text-sm font-bold text-[var(--bento-text-primary)]"
                    >
                      {meta.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--bento-text-primary)]">
                          {meta.name}
                        </span>
                        {connection.label !== "Default" && (
                          <span className="text-xs text-[var(--bento-text-muted)]">
                            ({connection.label})
                          </span>
                        )}
                        <Badge
                          variant={connection.isActive ? "default" : "secondary"}
                          className={
                            connection.isActive
                              ? "border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)]"
                              : "border-[var(--bento-border)] bg-transparent text-[var(--bento-text-muted)]"
                          }
                        >
                          {connection.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {connection.isTestnet && (
                          <Badge variant="outline" className="border-[var(--bento-border)] text-[var(--bento-text-muted)]">
                            Testnet
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--bento-text-muted)]">
                        <span>
                          {connection.permissions.spot && "Spot"}
                          {connection.permissions.futures && " • Futures"}
                          {connection.permissions.withdraw && " • Withdraw"}
                        </span>
                        {connection.lastUsedAt && (
                          <span>
                            Last used{" "}
                            {formatDistanceToNow(new Date(connection.lastUsedAt))} ago
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === connection.id}
                      >
                        {actionLoading === connection.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleToggle(connection)}>
                        {connection.isActive ? (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedConnection(connection);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </BentoCard>

      {/* Add Exchange Modal */}
      <ExchangeConnectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={onAdd}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bento-card border-[var(--bento-border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--bento-text-primary)]">
              Remove Exchange Connection?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--bento-text-muted)]">
              This will permanently delete the API connection for{" "}
              <strong className="text-[var(--bento-text-primary)]">
                {selectedConnection && EXCHANGE_META[selectedConnection.exchangeId]?.name}
              </strong>
              . Your API keys will be removed from the vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--bento-border)] bg-transparent text-[var(--bento-text-muted)] hover:bg-white/5 hover:text-[var(--bento-text-primary)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="border border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.16)] text-[var(--bento-text-primary)] hover:bg-[rgba(127,29,29,0.26)]"
            >
              {actionLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
