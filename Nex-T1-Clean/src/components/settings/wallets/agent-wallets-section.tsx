"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  walletLedgerCountBadgeClass,
  walletLedgerDescriptionClass,
  walletLedgerHeaderClass,
  walletLedgerSectionBodyClass,
  walletLedgerSurfaceClass,
  walletLedgerTitleClass,
} from "@/lib/ui/wallet-ledger";

import { useAgentWallets } from "./agents/lib/use-agent-wallets";
import { AgentWalletGroup } from "./agents/agent-wallet-group";
import { JwtCopyBanner } from "./agents/jwt-copy-banner";

/* ------------------------------------------------------------------ */
/*  Main Section (public API unchanged)                                */
/* ------------------------------------------------------------------ */

export function AgentWalletsSection() {
  const {
    agents,
    isLoading,
    error,
    provisionMutation,
    exportJwtMutation,
    provisioningAgentId,
    exportingJwtAgentId,
    exportedJwt,
    setExportedJwt,
    handleProvision,
    handleExportJwt,
  } = useAgentWallets();

  const agentsWithWallets = useMemo(
    () => (agents ?? []).filter((a) => a.wallets.length > 0),
    [agents],
  );

  const agentsWithoutWallets = useMemo(
    () => (agents ?? []).filter((a) => a.wallets.length === 0),
    [agents],
  );

  /* Loading state */
  if (isLoading) {
    return (
      <div className={walletLedgerSurfaceClass}>
        <div className={walletLedgerHeaderClass}>
          <div>
            <h2 className={walletLedgerTitleClass}>Agent Wallets</h2>
            <p className={walletLedgerDescriptionClass}>
              Nex Wallets assigned to your AI agents.
            </p>
          </div>
        </div>
        <div className={walletLedgerSectionBodyClass}>
          <Skeleton className="h-16 w-full bg-[var(--settings-elevated)]" />
          <Skeleton className="h-16 w-full bg-[var(--settings-elevated)]" />
        </div>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className={walletLedgerSurfaceClass}>
        <div className={walletLedgerHeaderClass}>
          <div>
            <h2 className={walletLedgerTitleClass}>Agent Wallets</h2>
            <p className={walletLedgerDescriptionClass}>
              Nex Wallets assigned to your AI agents.
            </p>
          </div>
        </div>
        <div className="px-4 py-6 text-center text-sm text-[var(--settings-foreground-muted)] sm:px-5">
          Failed to load agent wallets. Please try again later.
        </div>
      </div>
    );
  }

  const allAgents = agents ?? [];

  /* Empty state */
  if (allAgents.length === 0) {
    return (
      <div className={walletLedgerSurfaceClass}>
        <div className={walletLedgerHeaderClass}>
          <div>
            <h2 className={walletLedgerTitleClass}>Agent Wallets</h2>
            <p className={walletLedgerDescriptionClass}>
              Nex Wallets assigned to your AI agents.
            </p>
          </div>
        </div>
        <div className="px-4 py-6 text-center text-sm text-[var(--settings-foreground-muted)] sm:px-5">
          No agents found. Create an agent to provision wallets.
        </div>
      </div>
    );
  }

  return (
    <div className={walletLedgerSurfaceClass}>
      <div className={walletLedgerHeaderClass}>
        <div>
          <h2 className={walletLedgerTitleClass}>Agent Wallets</h2>
          <p className={walletLedgerDescriptionClass}>
            Nex Wallets assigned to your AI agents.
          </p>
        </div>
        {agentsWithWallets.length > 0 && (
          <Badge variant="outline" className={walletLedgerCountBadgeClass}>
            {agentsWithWallets.length} agent{agentsWithWallets.length !== 1 ? "s" : ""} with wallets
          </Badge>
        )}
      </div>

      <div className={walletLedgerSectionBodyClass}>
        {/* JWT export banner */}
        {exportedJwt && (
          <JwtCopyBanner
            jwt={exportedJwt.jwt}
            expiresAt={exportedJwt.expiresAt}
            onDismiss={() => setExportedJwt(null)}
          />
        )}

        {/* Provision/export error banners */}
        {provisionMutation.error && (
          <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            Provisioning failed: {provisionMutation.error.message}
          </div>
        )}
        {exportJwtMutation.error && (
          <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            JWT export failed: {exportJwtMutation.error.message}
          </div>
        )}

        {/* Agents with wallets first */}
        {agentsWithWallets.map((agent) => (
          <AgentWalletGroup
            key={agent.id}
            agent={agent}
            isOwner
            onProvision={handleProvision}
            onExportJwt={handleExportJwt}
            isProvisioning={provisioningAgentId === agent.id}
            isExportingJwt={exportingJwtAgentId === agent.id}
          />
        ))}

        {/* Agents without wallets */}
        {agentsWithoutWallets.map((agent) => (
          <AgentWalletGroup
            key={agent.id}
            agent={agent}
            isOwner
            onProvision={handleProvision}
            onExportJwt={handleExportJwt}
            isProvisioning={provisioningAgentId === agent.id}
            isExportingJwt={exportingJwtAgentId === agent.id}
          />
        ))}
      </div>
    </div>
  );
}
