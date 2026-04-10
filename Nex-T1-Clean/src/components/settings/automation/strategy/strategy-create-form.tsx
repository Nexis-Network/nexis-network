"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StrategyFormState } from "@/components/settings/automation/strategy/strategy-types";

type StrategyCreateFormProps = {
  formState: StrategyFormState;
  isPending: boolean;
  onFieldChange: <K extends keyof StrategyFormState>(
    key: K,
    value: StrategyFormState[K],
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function StrategyCreateForm({
  formState,
  isPending,
  onFieldChange,
  onSubmit,
  onCancel,
}: StrategyCreateFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-4"
    >
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="automation-strategy-name">Name</Label>
          <Input
            id="automation-strategy-name"
            value={formState.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="Pass-through swap guard"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="automation-strategy-description">Description</Label>
          <Input
            id="automation-strategy-description"
            value={formState.description}
            onChange={(event) =>
              onFieldChange("description", event.target.value)
            }
            placeholder="Describes what the strategy does"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="automation-strategy-parameters">
          Parameters (JSON)
        </Label>
        <Textarea
          id="automation-strategy-parameters"
          rows={6}
          value={formState.parameters}
          onChange={(event) => onFieldChange("parameters", event.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="automation-strategy-metadata">Metadata (JSON)</Label>
        <Textarea
          id="automation-strategy-metadata"
          rows={4}
          value={formState.metadata}
          onChange={(event) => onFieldChange("metadata", event.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create strategy"
          )}
        </Button>
      </div>
    </form>
  );
}
