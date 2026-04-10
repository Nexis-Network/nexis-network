"use client";

import { Loader2, PlugZap, Sparkles } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StrategyHeaderProps = {
  isLoading: boolean;
  isRefetching: boolean;
  showCreateForm: boolean;
  onApplyTemplate: () => void;
  onRefresh: () => void;
  onToggleCreateForm: () => void;
};

export function StrategyHeader({
  isLoading,
  isRefetching,
  showCreateForm,
  onApplyTemplate,
  onRefresh,
  onToggleCreateForm,
}: StrategyHeaderProps) {
  return (
    <CardHeader className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="text-[var(--bento-text-primary)]">Automation Strategies</CardTitle>
          <CardDescription className="text-[var(--bento-text-muted)]">
            Define reusable execution plans, manage bindings, and anchor hashes
            for tamper-proof governance.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onApplyTemplate}>
            <Sparkles className="mr-2 size-4" />
            Load Solana memecoin template
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={isRefetching || isLoading}
            onClick={onRefresh}
            aria-label="Refresh strategies"
          >
            {isRefetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </Button>
          <Button
            onClick={onToggleCreateForm}
            variant={showCreateForm ? "secondary" : "default"}
          >
            <PlugZap className="mr-2 size-4" />
            {showCreateForm ? "Close form" : "New strategy"}
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
