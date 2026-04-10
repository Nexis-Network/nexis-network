"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import Link from "next/link";
import { FileIcon } from "@/components/sidebar-03/animated-icons";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";
import { formatCurrency } from "@/lib/utils";
import {
  BentoCard,
  BentoCardHeader,
} from "@/components/settings/shared/bento-card";
import {
  extractStripeInvoices,
  type StripeInvoiceSummary,
} from "@/lib/billing/stripe-invoices";

async function fetchInvoices(): Promise<StripeInvoiceSummary[]> {
  const res = await fetch("/api/stripe/invoices");
  if (!res.ok) {
    throw new Error("Failed to fetch invoices");
  }
  const payload = await res.json().catch(() => null);
  return extractStripeInvoices(payload);
}

export function BillingHistory() {
  const { isAuthenticated } = useAuthContext();
  const canQuery = typeof window !== "undefined" && isAuthenticated;

  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["all-invoices"],
    queryFn: fetchInvoices,
    enabled: canQuery,
    staleTime: 60_000,
  });

  return (
    <BentoCard>
      <BentoCardHeader title="Billing History" />

      <p className="settings-card-description mb-4">
        View detailed history of your payments and invoices.
      </p>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-xs text-[var(--bento-text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading invoices...
        </div>
      ) : error ? (
        <div className="flex h-32 items-center justify-center text-xs text-red-400">
          Failed to load billing history.
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-xs text-[var(--bento-text-muted)]">
          <FileIcon className="h-8 w-8 opacity-50" />
          <p>No invoices found.</p>
        </div>
      ) : (
        <SettingsTableShell>
          <SettingsTable>
            <SettingsTableHeader>
              <SettingsTableHeaderRow>
                <SettingsTableHead>Date</SettingsTableHead>
                <SettingsTableHead>Amount</SettingsTableHead>
                <SettingsTableHead>Status</SettingsTableHead>
                <SettingsTableHead className="text-right">
                  Invoice
                </SettingsTableHead>
              </SettingsTableHeaderRow>
            </SettingsTableHeader>
            <SettingsTableBody>
              {invoices.map((invoice) => (
                <SettingsTableRow key={invoice.id}>
                  <SettingsTableCell className="text-xs text-[var(--settings-foreground-strong)]">
                    {new Date(invoice.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </SettingsTableCell>
                  <SettingsTableCell className="font-mono tabular-nums text-xs text-[var(--settings-foreground-strong)]">
                    {formatCurrency(invoice.amount / 100)}
                  </SettingsTableCell>
                  <SettingsTableCell>
                    <Badge
                      variant={
                        invoice.status === "paid" ? "outline" : "secondary"
                      }
                      className={
                        invoice.status === "paid"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </SettingsTableCell>
                  <SettingsTableCell className="text-right">
                    {invoice.pdf ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[var(--bento-text-muted)] hover:bg-white/5 hover:text-[var(--bento-text-primary)]"
                        asChild
                      >
                        <Link
                          href={invoice.pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="sr-only">Download Invoice</span>
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-[var(--bento-text-muted)]">
                        Not available
                      </span>
                    )}
                  </SettingsTableCell>
                </SettingsTableRow>
              ))}
            </SettingsTableBody>
          </SettingsTable>
        </SettingsTableShell>
      )}
    </BentoCard>
  );
}
