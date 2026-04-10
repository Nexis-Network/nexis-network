"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateStrategyBinding,
  useDeleteStrategyBinding,
  useStrategyBindings,
  useUpdateStrategyBinding,
} from "@/modules/automation/hooks";
import type { AutomationStrategyRecord, StrategyBindingRecord } from "@/modules/automation/types";
import { useToast } from "@/hooks/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AnchorFormState, BindingFormState, BindingStatus, StrategyMutationState } from "@/components/settings/automation/strategy/strategy-types";
import { DEFAULT_BINDING_FORM, describeError, safeParseJson, truncateMiddle } from "@/components/settings/automation/strategy/strategy-types";
import { StrategyBindingForm } from "@/components/settings/automation/strategy/strategy-binding-form";
import { StrategyBindingList } from "@/components/settings/automation/strategy/strategy-binding-list";

export type StrategyDetailsProps = {
  strategy: AutomationStrategyRecord;
  anchorState: AnchorFormState;
  onAnchorStateChange: (state: AnchorFormState) => void;
  onToggleStrategy: (strategy: AutomationStrategyRecord) => void;
  onAnchorStrategy: () => void;
  onDeactivate: () => void;
  toggleMutation: StrategyMutationState;
  anchorMutation: StrategyMutationState;
  deactivateMutation: StrategyMutationState;
};

export function StrategyDetails({
  strategy, anchorState, onAnchorStateChange, onToggleStrategy,
  onAnchorStrategy, onDeactivate, toggleMutation, anchorMutation, deactivateMutation,
}: StrategyDetailsProps) {
  const bindingsQuery = useStrategyBindings(strategy.id, true);
  const createBinding = useCreateStrategyBinding(strategy.id);
  const updateBinding = useUpdateStrategyBinding(strategy.id);
  const deleteBinding = useDeleteStrategyBinding(strategy.id);
  const { toast } = useToast();
  const [bindingForm, setBindingForm] = useState<BindingFormState>(DEFAULT_BINDING_FORM);

  const isTogglePending = toggleMutation.isPending && toggleMutation.targetId === strategy.id;
  const isAnchorPending = anchorMutation.isPending && anchorMutation.targetId === strategy.id;
  const isDeactivatePending = deactivateMutation.isPending && deactivateMutation.targetId === strategy.id;

  async function handleCreateBinding(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    let metadata: Record<string, UntypedJson> | undefined;
    try {
      metadata = bindingForm.metadata.trim().length > 0 ? safeParseJson(bindingForm.metadata) : undefined;
    } catch (err) {
      toast({ title: "Invalid metadata", description: describeError(err, "Binding metadata contains invalid JSON."), variant: "destructive" });
      return;
    }
    try {
      await createBinding.mutateAsync({ agentIdentifier: bindingForm.agentIdentifier.trim(), metadata });
      toast({ title: "Binding created", description: "Agent must approve strategy usage before autonomously executing." });
      setBindingForm(DEFAULT_BINDING_FORM);
    } catch (err) {
      toast({ title: "Failed to create binding", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  async function handleUpdateBindingStatus(binding: StrategyBindingRecord, status: BindingStatus, sig?: string): Promise<void> {
    try {
      const trimmedSig = sig?.trim();
      await updateBinding.mutateAsync({ bindingId: binding.id, payload: { status, confirmationSignature: status === "approved" && trimmedSig ? trimmedSig : undefined } });
      toast({ title: "Binding updated", description: `Binding status changed to ${status}.` });
    } catch (err) {
      toast({ title: "Failed to update binding", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  async function handleDeleteBinding(bindingId: string): Promise<void> {
    try {
      await deleteBinding.mutateAsync({ bindingId });
      toast({ title: "Binding removed", description: "Agent can no longer invoke this strategy." });
    } catch (err) {
      toast({ title: "Failed to remove binding", description: describeError(err, "An unknown error occurred."), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4 bg-white/[0.03] p-4 text-sm text-[var(--bento-text-muted)]">
      {/* Parameters & metadata */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3">
          <h3 className="text-sm font-regular text-[var(--bento-text-primary)]">Parameters</h3>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-white/[0.03] p-3 text-xs text-[var(--bento-text-primary)]">
            {JSON.stringify(strategy.parameters, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3">
          <h3 className="text-sm font-regular text-[var(--bento-text-primary)]">Metadata</h3>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-white/[0.03] p-3 text-xs text-[var(--bento-text-primary)]">
            {JSON.stringify(strategy.metadata ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      {/* Anchor chain inputs */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`anchor-chain-${strategy.id}`}>Anchored chain</Label>
          <Input id={`anchor-chain-${strategy.id}`} placeholder="base, optimism, arbitrum, solana" value={anchorState.chainSlug} onChange={(e) => onAnchorStateChange({ ...anchorState, chainSlug: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`anchor-tx-${strategy.id}`}>Anchor transaction hash</Label>
          <Input id={`anchor-tx-${strategy.id}`} placeholder="0x..." value={anchorState.txHash} onChange={(e) => onAnchorStateChange({ ...anchorState, txHash: e.target.value })} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onToggleStrategy(strategy)} disabled={isTogglePending}>
          {isTogglePending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {strategy.isActive ? "Pause strategy" : "Activate strategy"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onAnchorStrategy} disabled={isAnchorPending}>
          {isAnchorPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Anchor hash
        </Button>
        <Button size="sm" variant="outline" onClick={onDeactivate} disabled={isDeactivatePending}>
          {isDeactivatePending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Deactivate
        </Button>
        {strategy.anchoredChain && strategy.anchoredTxHash && (
          <Badge variant="outline" className="ml-auto">
            Anchored on {strategy.anchoredChain} @ {truncateMiddle(strategy.anchoredTxHash, 10)}
          </Badge>
        )}
      </div>

      {/* Bindings section */}
      <div className="space-y-3 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-regular text-[var(--bento-text-primary)]">Agent bindings</h3>
            <p className="text-xs text-[var(--bento-text-muted)]">Approve which agents can enact this strategy and record approvals for auditability.</p>
          </div>
          {bindingsQuery.isRefetching && <Loader2 className="size-4 animate-spin text-[var(--bento-text-muted)]" />}
        </div>
        <StrategyBindingForm
          strategyId={strategy.id}
          bindingForm={bindingForm}
          isPending={createBinding.isPending}
          onFieldChange={(key, value) => setBindingForm((p) => ({ ...p, [key]: value }))}
          onSubmit={handleCreateBinding}
        />
        {bindingsQuery.error && <Alert variant="destructive"><AlertDescription>{bindingsQuery.error.message}</AlertDescription></Alert>}
        {(bindingsQuery.data ?? []).length === 0 && !bindingsQuery.isLoading && (
          <p className="text-xs text-[var(--bento-text-muted)]">No bindings yet. Agents must be explicitly added before use.</p>
        )}
        <StrategyBindingList
          bindings={bindingsQuery.data ?? []}
          updateBinding={updateBinding}
          deleteBinding={deleteBinding}
          onUpdateStatus={handleUpdateBindingStatus}
          onDelete={handleDeleteBinding}
        />
      </div>
    </div>
  );
}
