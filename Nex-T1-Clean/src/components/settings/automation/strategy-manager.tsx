"use client";

import { Loader2 } from "lucide-react";
import { useAnchorAutomationStrategy, useAutomationStrategies, useCreateAutomationStrategy, useDeactivateAutomationStrategy, useUpdateAutomationStrategy } from "@/modules/automation/hooks";
import { useState, useMemo } from "react";

import type { AutomationStrategyRecord } from "@/modules/automation/types";
import { useToast } from "@/hooks/ui/use-toast";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AnchorFormState, StrategyFormState } from "@/components/settings/automation/strategy/strategy-types";
import {
  DEFAULT_STRATEGY_FORM,
  describeError,
  safeParseJson,
  SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE,
} from "@/components/settings/automation/strategy/strategy-types";
import { StrategyHeader } from "@/components/settings/automation/strategy/strategy-header";
import { StrategyCreateForm } from "@/components/settings/automation/strategy/strategy-create-form";
import { StrategyListItem } from "@/components/settings/automation/strategy/strategy-list";
import { StrategyDetails } from "@/components/settings/automation/strategy/strategy-details";

export function StrategyManager() {
  const { data, isLoading, error, refetch, isRefetching } = useAutomationStrategies();
  const createStrategy = useCreateAutomationStrategy();
  const updateStrategy = useUpdateAutomationStrategy();
  const anchorStrategy = useAnchorAutomationStrategy();
  const deactivateStrategy = useDeactivateAutomationStrategy();
  const { toast } = useToast();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<StrategyFormState>(DEFAULT_STRATEGY_FORM);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [anchorForms, setAnchorForms] = useState<Record<string, AnchorFormState>>({});

  const sorted = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [data],
  );

  function applyTemplate(): void {
    setFormState({
      name: SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE.name,
      description: SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE.description,
      parameters: JSON.stringify(SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE.parameters, null, 2),
      metadata: JSON.stringify(SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE.metadata, null, 2),
    });
    setShowCreateForm(true);
  }

  function resetAndClose(): void {
    setFormState(DEFAULT_STRATEGY_FORM);
    setShowCreateForm(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (createStrategy.isPending) return;
    let parameters: Record<string, UntypedJson> = {};
    let metadata: Record<string, UntypedJson> | undefined;
    try {
      parameters = safeParseJson(formState.parameters || "{}");
      metadata = formState.metadata.trim().length > 0 ? safeParseJson(formState.metadata) : undefined;
    } catch (err) {
      toast({ title: "Invalid JSON", description: describeError(err, "Invalid JSON in parameters or metadata."), variant: "destructive" });
      return;
    }
    try {
      await createStrategy.mutateAsync({ name: formState.name.trim(), description: formState.description.trim() || undefined, parameters, metadata });
      toast({ title: "Strategy created", description: "Automation strategy is ready for binding to agents." });
      resetAndClose();
    } catch (err) {
      toast({ title: "Failed to create strategy", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  async function handleToggle(strategy: AutomationStrategyRecord): Promise<void> {
    try {
      await updateStrategy.mutateAsync({ id: strategy.id, payload: { isActive: !strategy.isActive } });
      toast({
        title: strategy.isActive ? "Strategy paused" : "Strategy activated",
        description: strategy.isActive ? "Agents will no longer use this automation pipeline." : "Strategy is now available to approved agents.",
      });
    } catch (err) {
      toast({ title: "Failed to update strategy status", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  async function handleAnchor(strategyId: string): Promise<void> {
    const state = anchorForms[strategyId] ?? { chainSlug: "", txHash: "" };
    if (!state.chainSlug.trim() || !state.txHash.trim()) {
      toast({ title: "Anchor details required", description: "Provide both chain slug and transaction hash.", variant: "destructive" });
      return;
    }
    try {
      await anchorStrategy.mutateAsync({ id: strategyId, payload: { anchoredChain: state.chainSlug.trim(), anchoredTxHash: state.txHash.trim() } });
      toast({ title: "Strategy anchored", description: "On-chain confirmation recorded." });
      setAnchorForms((prev) => { const next = { ...prev }; delete next[strategyId]; return next; });
    } catch (err) {
      toast({ title: "Failed to anchor strategy", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  async function handleDeactivate(strategyId: string): Promise<void> {
    try {
      await deactivateStrategy.mutateAsync(strategyId);
      toast({ title: "Strategy deactivated", description: "Agents will skip it during plan selection." });
    } catch (err) {
      toast({ title: "Failed to deactivate strategy", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  return (
    <Card className="bg-[var(--bento-card)] border-[var(--bento-border)] rounded-[20px]">
      <StrategyHeader
        isLoading={isLoading}
        isRefetching={isRefetching}
        showCreateForm={showCreateForm}
        onApplyTemplate={applyTemplate}
        onRefresh={() => refetch()}
        onToggleCreateForm={() => setShowCreateForm((p) => !p)}
      />
      <CardContent className="space-y-6">
        {showCreateForm && (
          <StrategyCreateForm
            formState={formState}
            isPending={createStrategy.isPending}
            onFieldChange={(key, value) => setFormState((p) => ({ ...p, [key]: value }))}
            onSubmit={handleCreate}
            onCancel={resetAndClose}
          />
        )}
        {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}
        {isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] px-3 py-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="size-4 animate-spin" />Loading strategies...
          </div>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-[var(--bento-text-muted)]">
            No automation strategies configured yet. Create a strategy to formalize how agents should execute tasks.
          </p>
        )}
        {sorted.map((strategy) => {
          const isExpanded = Boolean(expandedIds[strategy.id]);
          const anchor = anchorForms[strategy.id] ?? { chainSlug: strategy.anchoredChain ?? "", txHash: strategy.anchoredTxHash ?? "" };
          return (
            <StrategyListItem
              key={strategy.id}
              strategy={strategy}
              isExpanded={isExpanded}
              onToggle={() => setExpandedIds((p) => ({ ...p, [strategy.id]: !p[strategy.id] }))}
            >
              <StrategyDetails
                strategy={strategy}
                anchorState={anchor}
                onAnchorStateChange={(next) => setAnchorForms((p) => ({ ...p, [strategy.id]: next }))}
                onToggleStrategy={handleToggle}
                onAnchorStrategy={() => handleAnchor(strategy.id)}
                onDeactivate={() => handleDeactivate(strategy.id)}
                toggleMutation={{ isPending: updateStrategy.isPending, targetId: updateStrategy.variables?.id ?? null }}
                anchorMutation={{ isPending: anchorStrategy.isPending, targetId: anchorStrategy.variables?.id ?? null }}
                deactivateMutation={{ isPending: deactivateStrategy.isPending, targetId: typeof deactivateStrategy.variables === "string" ? deactivateStrategy.variables : null }}
              />
            </StrategyListItem>
          );
        })}
      </CardContent>
      <CardFooter className="text-xs text-[var(--bento-text-muted)]">
        Anchor hashes link automation strategies to on-chain governance so agents can verify immutable intent before executing.
      </CardFooter>
    </Card>
  );
}
