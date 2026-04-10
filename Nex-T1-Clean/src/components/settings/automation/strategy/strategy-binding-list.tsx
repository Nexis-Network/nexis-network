"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { TrashIcon } from "@/components/sidebar-03/animated-icons";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import type { StrategyBindingRecord } from "@/modules/automation/types";
import { useToast } from "@/hooks/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BindingStatus } from "@/components/settings/automation/strategy/strategy-types";
import { isBindingStatus, truncateMiddle } from "@/components/settings/automation/strategy/strategy-types";

type StrategyBindingListProps = {
  bindings: StrategyBindingRecord[];
  updateBinding: UseMutationResult<unknown, Error, { bindingId: string; payload: Record<string, unknown> }, unknown>;
  deleteBinding: UseMutationResult<unknown, Error, { bindingId: string }, unknown>;
  onUpdateStatus: (binding: StrategyBindingRecord, status: BindingStatus, confirmationSig?: string) => void;
  onDelete: (bindingId: string) => void;
};

export function StrategyBindingList({ bindings, updateBinding, deleteBinding, onUpdateStatus, onDelete }: StrategyBindingListProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<Record<string, BindingStatus | undefined>>({});
  const [confirmationSignature, setConfirmationSignature] = useState<Record<string, string>>({});

  function resolveStatus(binding: StrategyBindingRecord): BindingStatus | undefined {
    return selectedStatus[binding.id] ?? (isBindingStatus(binding.status) ? binding.status : undefined);
  }

  function isUpdatePending(bindingId: string): boolean {
    return updateBinding.isPending && updateBinding.variables?.bindingId === bindingId;
  }

  function isDeletePending(bindingId: string): boolean {
    return deleteBinding.isPending && deleteBinding.variables?.bindingId === bindingId;
  }

  return (
    <>
      {bindings.map((binding) => (
        <div key={binding.id} className="flex flex-col gap-3 rounded-md border border-[var(--bento-border)] bg-white/[0.03] p-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--bento-text-primary)]">
              <span className="font-regular text-[var(--bento-text-primary)]">{binding.agentIdentifier}</span>
              <Badge variant="outline">{binding.status}</Badge>
              {binding.confirmedAt && <Badge variant="secondary">Confirmed {binding.confirmedAt.toLocaleString()}</Badge>}
            </div>
            <div className="grid gap-1 text-xs text-[var(--bento-text-muted)]">
              <span>Created {binding.createdAt.toLocaleString()}</span>
              <span>Updated {binding.updatedAt.toLocaleString()}</span>
              {binding.confirmationSignature && (
                <span className="font-mono text-[11px]">Signature {truncateMiddle(binding.confirmationSignature, 16)}</span>
              )}
            </div>
            {binding.metadata && Object.keys(binding.metadata).length > 0 && (
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-white/[0.03] p-2 text-[11px] text-[var(--bento-text-primary)]">
                {JSON.stringify(binding.metadata, null, 2)}
              </pre>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-2 text-xs">
            <Select
              value={selectedStatus[binding.id] ?? (isBindingStatus(binding.status) ? binding.status : "pending")}
              onValueChange={(value) => {
                if (!isBindingStatus(value)) {
                  toast({ title: "Unsupported status", description: "Select a recognized binding status.", variant: "destructive" });
                  return;
                }
                setSelectedStatus((prev) => ({ ...prev, [binding.id]: value }) satisfies Record<string, BindingStatus | undefined>);
              }}
            >
              <SelectTrigger className="text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
            {selectedStatus[binding.id] === "approved" && (
              <Input
                placeholder="Confirmation signature (optional)"
                value={confirmationSignature[binding.id] ?? ""}
                onChange={(e) => setConfirmationSignature((prev) => ({ ...prev, [binding.id]: e.target.value }))}
                className="text-xs"
              />
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={isUpdatePending(binding.id)} onClick={() => {
                const status = resolveStatus(binding);
                if (!status) {
                  toast({ title: "Status required", description: "Choose a status before updating.", variant: "destructive" });
                  return;
                }
                onUpdateStatus(binding, status, confirmationSignature[binding.id]);
              }}>
                {isUpdatePending(binding.id) ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Update
              </Button>
              <Button size="sm" variant="destructive" disabled={isDeletePending(binding.id)} onClick={() => onDelete(binding.id)}>
                {isDeletePending(binding.id) ? <Loader2 className="mr-2 size-4 animate-spin" /> : <TrashIcon className="mr-2 size-4" />}
                Remove
              </Button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
