"use client";

import { Bot, KeyRound, Loader2, ChevronDown } from "lucide-react";
import { PlusIcon } from "@/components/sidebar-03/animated-icons";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgentWalletCard } from "@/components/agents/agent-wallet-card";
import {
  walletLedgerIconFrameClass,
  walletLedgerInlineFrameClass,
  walletLedgerSecondaryButtonClass,
  walletLedgerSubLabelClass,
} from "@/lib/ui/wallet-ledger";

import type { AgentSummary } from "./lib/agent-wallet-types";
import { CURRENCY_FORMAT } from "./lib/agent-wallet-types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AgentWalletGroupProps = {
  agent: AgentSummary;
  isOwner: boolean;
  onProvision: (agentId: string) => void;
  onExportJwt: (agentId: string) => void;
  isProvisioning: boolean;
  isExportingJwt: boolean;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentWalletGroup({
  agent,
  isOwner,
  onProvision,
  onExportJwt,
  isProvisioning,
  isExportingJwt,
}: AgentWalletGroupProps) {
  const [open, setOpen] = useState(agent.wallets.length > 0);
  const hasWallets = agent.wallets.length > 0;
  const activeWallets = agent.wallets.filter((w) => w.status === "active");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn(walletLedgerInlineFrameClass, "overflow-hidden")}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--settings-elevated)]/70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(walletLedgerIconFrameClass, "h-11 w-11 rounded-[14px] flex-shrink-0")}>
                {agent.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="h-10 w-10 rounded-[12px] object-cover"
                  />
                ) : (
                  <Bot className="h-4 w-4 text-[var(--settings-foreground-muted)]" />
                )}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--settings-foreground-strong)]">
                    {agent.name}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/70 px-1.5 py-0 text-[10px] text-[var(--settings-foreground-muted)]"
                  >
                    Gen {agent.currentGeneration}
                  </Badge>
                  {hasWallets ? (
                    <Badge
                      variant="outline"
                      className="border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/70 px-1.5 py-0 text-[10px] text-[var(--settings-foreground-muted)]"
                    >
                      {activeWallets.length} wallet{activeWallets.length !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-[var(--settings-border-soft)] bg-transparent px-1.5 py-0 text-[10px] text-[var(--settings-foreground-subtle)]"
                    >
                      No wallets
                    </Badge>
                  )}
                </div>
                {hasWallets && (
                  <p className={walletLedgerSubLabelClass}>
                    Net worth: {CURRENCY_FORMAT.format(agent.totalNetWorthUsd)}
                  </p>
                )}
              </div>
            </div>

            <ChevronDown
              className={cn(
                "h-4 w-4 flex-shrink-0 text-[var(--settings-foreground-muted)] transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-[var(--settings-border-soft)] px-4 py-3">
            {hasWallets ? (
              <>
                {agent.wallets
                  .filter((w) => w.status !== "revoked")
                  .map((wallet) => (
                    <AgentWalletCard
                      key={`${agent.id}-${wallet.address}-${wallet.platform}`}
                      wallet={wallet}
                      agentId={agent.id}
                      isOwner={isOwner}
                    />
                  ))}
              </>
            ) : (
              <div className="py-4 text-center text-sm text-[var(--settings-foreground-muted)]">
                This agent has no provisioned wallets yet.
              </div>
            )}

            {/* Action buttons */}
            {isOwner && (
              <div className="flex items-center gap-2 border-t border-[var(--settings-border-soft)] pt-2">
                {!hasWallets && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={walletLedgerSecondaryButtonClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      onProvision(agent.id);
                    }}
                    disabled={isProvisioning}
                  >
                    {isProvisioning ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Provision Wallets
                  </Button>
                )}

                {hasWallets && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={walletLedgerSecondaryButtonClass}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportJwt(agent.id);
                        }}
                        disabled={isExportingJwt}
                      >
                        {isExportingJwt ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Export JWT
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Generate a short-lived CDP JWT for owner access
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
