"use client";

import { Loader2, HelpCircle, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DonutChart } from "@/components/ui/donut-chart";
import { useCreditsContext } from "@/components/providers/credits-provider";
import { useCreditTransactions } from "@/lib/hooks/billing/use-credit-transactions";
import { SettingsSection } from "@/components/settings/shared/settings-section";

interface CreditsSectionProps {
  className?: string;
}

export function CreditsSection({ className }: CreditsSectionProps) {
  const router = useRouter();
  const {
    credits,
    limit,
    monthlyRemaining,
    overageCredits,
    loading: creditsLoading,
  } = useCreditsContext();
  const { transactions, isLoading: txLoading } = useCreditTransactions();

  const isLoading = creditsLoading || txLoading;
  const total = limit ?? 100;
  const remaining = Math.max(credits ?? 0, 0);
  const monthlyCreditsLeft =
    typeof monthlyRemaining === "number"
      ? Math.max(monthlyRemaining, 0)
      : Math.min(remaining, total);
  const used = Math.max(0, total - monthlyCreditsLeft);
  const extraCredits = Math.max(overageCredits ?? 0, 0);

  const handleBuyCredits = () => {
    router.push("/settings/billing");
  };

  return (
    <SettingsSection
      title="Your Credits"
      description="Check your current Nex-T1 Credit balance and usage details."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleBuyCredits}
          className="shrink-0 gap-2 border-[var(--bento-border)] bg-transparent text-[var(--bento-text-primary)] hover:bg-white/5"
        >
          <CreditCard className="size-4" />
          Buy Credits
        </Button>
      }
      className={className}
    >
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Credits Usage Donut */}
        <div className="bento-card">
          <h3 className="mb-4 text-sm font-medium text-[var(--bento-text-primary)]">
            Credits Usage
          </h3>
          <div className="flex flex-col items-center gap-4">
            {isLoading ? (
              <div className="flex size-[120px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[var(--bento-text-muted)]" />
              </div>
            ) : (
              <DonutChart
                value={used}
                total={total}
                size={120}
                strokeWidth={12}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-sm text-[var(--bento-text-muted)]">
                <span className="mono-value">{remaining.toFixed(2)}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Credits remaining until next reset</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full bg-cyan-500" />
                <span className="text-[var(--bento-text-muted)]">
                  {used.toFixed(2)} Credits used
                </span>
              </div>
              {extraCredits > 0 ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-[var(--bento-text-muted)]">
                    {extraCredits.toFixed(2)} Extra credits
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bento-card !p-0">
          <div className="flex items-center gap-2 border-b border-[var(--bento-border)] bg-black/15 px-4 py-3">
            <h3 className="text-[13px] font-medium tracking-tight text-[var(--bento-text-muted)]">
              Transactions
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 cursor-help text-[var(--bento-text-muted)]" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Credit usage history for this billing period</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <SettingsTable>
            <SettingsTableHeader>
              <SettingsTableHeaderRow>
                <SettingsTableHead>Type of Transaction</SettingsTableHead>
                <SettingsTableHead>Amount</SettingsTableHead>
                <SettingsTableHead>Datetime</SettingsTableHead>
                <SettingsTableHead>Transaction ID</SettingsTableHead>
              </SettingsTableHeaderRow>
            </SettingsTableHeader>
            <SettingsTableBody>
              {isLoading ? (
                <SettingsTableRow>
                  <SettingsTableEmptyCell colSpan={4}>
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--bento-text-muted)]">
                      <Loader2 className="size-4 animate-spin" />
                      Loading...
                    </div>
                  </SettingsTableEmptyCell>
                </SettingsTableRow>
              ) : transactions.length === 0 ? (
                <SettingsTableRow>
                  <SettingsTableEmptyCell colSpan={4}>
                    No results.
                  </SettingsTableEmptyCell>
                </SettingsTableRow>
              ) : (
                transactions.slice(0, 10).map((tx) => (
                  <SettingsTableRow key={tx.id}>
                    <SettingsTableCell className="capitalize text-[var(--settings-foreground-strong)]">
                      {tx.type}
                    </SettingsTableCell>
                    <SettingsTableCell className="mono-value text-[var(--settings-foreground-strong)]">
                      {tx.type === "deduction" ? "-" : "+"}
                      {tx.amount.toFixed(2)}
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {tx.datetime.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </SettingsTableCell>
                    <SettingsTableCell className="mono-value text-xs">
                      {tx.id.slice(0, 8)}...
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
