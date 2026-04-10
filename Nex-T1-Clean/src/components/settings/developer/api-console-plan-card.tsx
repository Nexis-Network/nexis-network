"use client";

import Link from "next/link";

import type {
  DeveloperBillingPlan,
  DeveloperBillingSummary,
  DeveloperUsageSummary,
} from "@/components/settings/developer/developer-api-data";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

type ApiConsolePlanCardProps = {
  billing: DeveloperBillingSummary;
  usage: DeveloperUsageSummary;
  nextPlan: DeveloperBillingPlan | null;
};

export function ApiConsolePlanCard({
  billing,
  usage,
  nextPlan,
}: ApiConsolePlanCardProps) {
  const includedCredits = Math.max(billing.includedCredits, 1);
  const creditProgress = Math.min(
    100,
    Math.max(0, (billing.billedCredits / includedCredits) * 100),
  );
  const hardCap = billing.hardSpendCapUsd ?? 0;
  const spendProgress =
    hardCap > 0 ? Math.min(100, Math.max(0, (billing.spendUsd / hardCap) * 100)) : 0;

  return (
    <BentoCard className="space-y-5">
      <BentoCardHeader
        title="Plan & limits"
        action={
          <Badge className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] text-[11px] text-[var(--bento-text-muted)]">
            {billing.plan.label}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 p-4">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="settings-section-label">Included credits used</span>
              <span className="font-mono text-[var(--settings-foreground-muted)]">
                {billing.billedCredits.toLocaleString()} / {billing.includedCredits.toLocaleString()}
              </span>
            </div>
            <Progress value={creditProgress} className="mt-3 h-2" />
            <p className="mt-3 text-xs text-[var(--settings-foreground-muted)]">
              {usage.monthly.requests.toLocaleString()} requests this month · {billing.plan.requestsPerMinute} RPM limit
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 p-4">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="settings-section-label">Spend cap progress</span>
              <span className="font-mono text-[var(--settings-foreground-muted)]">
                {formatUsd(billing.spendUsd)}
                {billing.hardSpendCapUsd ? ` / ${formatUsd(billing.hardSpendCapUsd)}` : ""}
              </span>
            </div>
            <Progress value={spendProgress} className="mt-3 h-2" />
            <p className="mt-3 text-xs text-[var(--settings-foreground-muted)]">
              Soft cap: {formatUsd(billing.softSpendCapUsd ?? 0)} · Overage {billing.overageEnabled ? "enabled" : "disabled"}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-card-bg)]/80 p-4">
          <div>
            <p className="settings-card-title">Upgrade path</p>
            <p className="mt-1 text-sm text-[var(--settings-foreground-muted)]">
              Increase included credits and RPM before your project hits hard caps or starts accruing overage.
            </p>
          </div>

          {nextPlan ? (
            <div className="rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                  Next: {nextPlan.label}
                </p>
                <span className="text-sm text-[var(--settings-foreground-muted)]">
                  ${nextPlan.monthlyPriceUsd}/mo
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--settings-foreground-muted)]">
                {nextPlan.includedCredits.toLocaleString()} included credits · {nextPlan.requestsPerMinute} RPM · ${nextPlan.overagePricePerThousandCreditsUsd}/1k overage
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-elevated)]/60 p-4">
              <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                Enterprise-ready
              </p>
              <p className="mt-2 text-xs text-[var(--settings-foreground-muted)]">
                You are already on the highest published tier. Move to enterprise pricing when you need custom throughput or a negotiated annual commit.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button asChild className="settings-primary-button h-8 rounded-[10px] px-3 text-xs">
              <Link href="/settings/workspace?view=billing">
                {nextPlan ? `Upgrade to ${nextPlan.label}` : "Open billing"}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-8 rounded-[10px] border-[var(--settings-border)] bg-transparent px-3 text-xs hover:bg-[var(--settings-elevated)]"
            >
              <Link href="/settings/developer?view=api-usage">Detailed billing</Link>
            </Button>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
