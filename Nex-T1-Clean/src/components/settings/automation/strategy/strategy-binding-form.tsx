"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BindingFormState } from "@/components/settings/automation/strategy/strategy-types";

type StrategyBindingFormProps = {
  strategyId: string;
  bindingForm: BindingFormState;
  isPending: boolean;
  onFieldChange: <K extends keyof BindingFormState>(
    key: K,
    value: BindingFormState[K],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function StrategyBindingForm({
  strategyId,
  bindingForm,
  isPending,
  onFieldChange,
  onSubmit,
}: StrategyBindingFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3"
    >
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`binding-agent-${strategyId}`}>
            Agent identifier
          </Label>
          <Input
            id={`binding-agent-${strategyId}`}
            value={bindingForm.agentIdentifier}
            onChange={(event) =>
              onFieldChange("agentIdentifier", event.target.value)
            }
            placeholder="agent:portfolio-balancer"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`binding-metadata-${strategyId}`}>
            Metadata (optional)
          </Label>
          <Textarea
            id={`binding-metadata-${strategyId}`}
            rows={2}
            value={bindingForm.metadata}
            onChange={(event) => onFieldChange("metadata", event.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add binding"
          )}
        </Button>
      </div>
    </form>
  );
}
