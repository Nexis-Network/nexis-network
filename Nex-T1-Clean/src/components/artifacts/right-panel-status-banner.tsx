"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type { RightPanelMode } from "@/components/artifacts/right-panel-routing";

type RightPanelStatusBannerProps = {
  loading?: boolean;
  error?: string | null;
  panelMode: RightPanelMode;
  canRetry?: boolean;
  onRetry?: () => void;
};

const MODE_LABEL: Record<RightPanelMode, string> = {
  workbench: "workbench activity",
  workflow: "workflow canvas",
  table: "table artifact",
  market_terminal: "market terminal",
  pumpfun_v2: "Pump.fun trading panel",
  agent_wallets: "wallet artifact",
  agent_daos: "DAO directory",
  dao_workspace: "DAO workspace",
  dao_proposals: "DAO proposals",
  dao_treasury: "DAO treasury",
  burn_rate: "burn-rate analysis",
  empty: "artifact panel",
};

export function RightPanelStatusBanner({
  loading = false,
  error = null,
  panelMode,
  canRetry = false,
  onRetry,
}: RightPanelStatusBannerProps) {
  if (!loading && !error) return null;

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        <span>Streaming {MODE_LABEL[panelMode]}…</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle className="mt-0.5 size-3 shrink-0" />
        <span className="break-words">{error}</span>
      </div>
      {canRetry ? (
        <button
          className="shrink-0 rounded-md border border-destructive/40 px-2 py-1 text-[11px] hover:bg-destructive/20"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
