import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { fetchBillingSummary, fetchBillingUsageSeries, type BillingUsagePoint } from "@/lib/server/service-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import Link from "next/link";
import { BillingActions } from "@/components/billing/billing-actions";
import { UsageChart } from "@/components/billing/usage-chart";

type InvoiceRecord = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function formatCurrency(value: number | null, currency: string | null) {
  if (value === null) return "—";
  const label = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: label }).format(value);
  } catch {
    return `${value.toFixed(2)} ${label}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

async function fetchInvoices(apiKey: string): Promise<{
  items: InvoiceRecord[];
  error: string | null;
}> {
  const baseUrl = process.env.NEXIS_BILLING_API_URL;
  if (!baseUrl) {
    return { items: [], error: "Billing service is not configured." };
  }
  const trimmed = baseUrl.replace(/\/$/, "");
  const paths = ["invoices", "history", "billing/invoices", ""];
  let lastError = "Unable to load invoices.";

  for (const path of paths) {
    const url = path ? `${trimmed}/${path}` : trimmed;
    try {
      const response = await fetch(url, {
        headers: { "X-API-Key": apiKey },
        cache: "no-store",
      });
      if (!response.ok) {
        lastError = `Request failed (${response.status})`;
        continue;
      }
      const payload = (await response.json()) as unknown;
      const items = extractInvoices(payload);
      return { items, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  return { items: [], error: lastError };
}

function extractInvoices(payload: unknown): InvoiceRecord[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeInvoice).filter(Boolean) as InvoiceRecord[];
  }
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.items, obj.data, obj.invoices, obj.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(normalizeInvoice).filter(Boolean) as InvoiceRecord[];
    }
  }
  return [];
}

function normalizeInvoice(raw: unknown): InvoiceRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = toString(obj.id ?? obj.invoice_id ?? obj.number);
  if (!id) return null;
  return {
    id,
    amount: toNumber(obj.amount ?? obj.total ?? obj.balance_due),
    currency: toString(obj.currency ?? obj.unit),
    status: toString(obj.status ?? obj.state),
    issuedAt: toString(obj.issuedAt ?? obj.issued_at ?? obj.created_at ?? obj.created),
    dueAt: toString(obj.dueAt ?? obj.due_at ?? obj.due_date),
    pdfUrl: toString(obj.pdf_url ?? obj.invoice_pdf ?? obj.pdf),
    hostedUrl: toString(obj.hosted_invoice_url ?? obj.url ?? obj.invoice_url),
  };
}

export default async function BillingPage() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link an API key to view billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-text-secondary">
          <p>Billing data is tied to your Nexis Cloud API key.</p>
          <Link className={buttonClassName()} href="/login?link=api-key&redirect=/dashboard/billing">
            Link API key
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [summaryResult, invoicesResult, usageResult] = await Promise.all([
    fetchBillingSummary(apiKey),
    fetchInvoices(apiKey),
    fetchBillingUsageSeries(apiKey),
  ]);

  const summary = summaryResult.summary;
  const usageSeries = usageResult.series;
  const usageCurrency =
    summary?.currency ?? (usageSeries[0]?.currency ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Billing</h1>
        <p className="text-text-secondary mt-1">Track usage costs, balances, and invoices.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Monthly spend</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl text-white">
            {formatCurrency(summary?.monthlyCost ?? null, summary?.currency ?? null)}
            <div className="text-xs text-text-muted mt-2">
              {summaryResult.error || "Current billing period"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl text-white">
            {formatCurrency(summary?.balance ?? null, summary?.currency ?? null)}
            <div className="text-xs text-text-muted mt-2">Available credits</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-secondary">
            {summary ? "Active" : "Unavailable"}
            {summaryResult.error && (
              <div className="text-xs text-text-muted mt-2">{summaryResult.error}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost over time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          {usageResult.error && (
            <div className="text-xs text-text-muted">{usageResult.error}</div>
          )}
          <UsageChart
            series={usageSeries.map((point: BillingUsagePoint) => ({
              date: point.date,
              cost: point.cost,
            }))}
            currency={usageCurrency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing actions</CardTitle>
        </CardHeader>
        <CardContent>
          <BillingActions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          {invoicesResult.error && (
            <div className="text-xs text-text-muted">{invoicesResult.error}</div>
          )}
          {invoicesResult.items.length === 0 ? (
            <div>No invoices available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-text-muted">
                  <tr className="border-b border-border-default">
                    <th className="py-2 pr-4">Invoice</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Issued</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesResult.items.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border-default/60">
                      <td className="py-2 pr-4 text-text-primary">{invoice.id}</td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {invoice.status ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {formatDate(invoice.issuedAt)}
                      </td>
                      <td className="py-2 text-text-secondary">{formatDate(invoice.dueAt)}</td>
                      <td className="py-2">
                        {invoice.pdfUrl || invoice.hostedUrl ? (
                          <a
                            className="text-accent-sky hover:text-accent-cyan"
                            href={invoice.pdfUrl || invoice.hostedUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
