"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/settings/shared/settings-button";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";
import { useBilling } from "@/lib/hooks/billing/use-billing";
import { useModelUsage } from "@/lib/hooks/billing/use-model-usage";
import { formatTokens } from "@/modules/ai/cost-monitor";
import { SettingsSection } from "@/components/settings/shared/settings-section";

interface PlanUsageSectionProps {
  className?: string;
}

async function openPortal(): Promise<string | null> {
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return typeof data?.url === "string" ? data.url : null;
}

export function PlanUsageSection({ className }: PlanUsageSectionProps) {
  const { loading: planLoading } = useBilling();
  const { modelUsage, isLoading: usageLoading } = useModelUsage();

  const portal = useMutation({
    mutationFn: openPortal,
    onSuccess: (url) => {
      if (url) {
        window.location.assign(url);
      } else {
        toast.error("Unable to open billing portal");
      }
    },
    onError: () => {
      toast.error("Something went wrong. Please try again later.");
    },
  });

  const isLoading = planLoading || usageLoading;

  return (
    <SettingsSection
      title="Your Plan Usage"
      description="Track your io.intelligence usage limits based on your current plan."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => portal.mutate()}
          disabled={portal.isPending}
          className="shrink-0 gap-2 border-[var(--bento-border)] bg-transparent text-[var(--bento-text-primary)] hover:bg-white/5"
        >
          {portal.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Upgrade Your Plan
        </Button>
      }
      className={className}
    >
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">
          Current Usage by Model
        </h3>

        <div className="bento-card !p-0">
          <SettingsTable>
            <SettingsTableHeader>
              <SettingsTableHeaderRow>
                <SettingsTableHead>Model</SettingsTableHead>
                <SettingsTableHead className="text-right">
                  Tokens
                </SettingsTableHead>
              </SettingsTableHeaderRow>
            </SettingsTableHeader>
            <SettingsTableBody>
              {isLoading ? (
                <SettingsTableRow>
                  <SettingsTableEmptyCell colSpan={2}>
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--bento-text-muted)]">
                      <Loader2 className="size-4 animate-spin" />
                      Loading...
                    </div>
                  </SettingsTableEmptyCell>
                </SettingsTableRow>
              ) : modelUsage.length === 0 ? (
                <SettingsTableRow>
                  <SettingsTableEmptyCell colSpan={2}>
                    No results.
                  </SettingsTableEmptyCell>
                </SettingsTableRow>
              ) : (
                modelUsage.map((entry) => (
                  <SettingsTableRow key={entry.model}>
                    <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                      {entry.model}
                    </SettingsTableCell>
                    <SettingsTableCell className="text-right mono-value text-[var(--settings-foreground-strong)]">
                      {formatTokens(entry.tokens)}
                    </SettingsTableCell>
                  </SettingsTableRow>
                ))
              )}
            </SettingsTableBody>
          </SettingsTable>
        </div>
      </div>
    </SettingsSection>
  );
}
