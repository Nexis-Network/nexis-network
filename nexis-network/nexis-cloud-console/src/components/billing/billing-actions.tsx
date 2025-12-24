"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BillingActionResult = {
  url?: string;
  checkout_url?: string;
  portal_url?: string;
  data?: { url?: string };
};

function resolveUrl(payload: BillingActionResult | null): string | null {
  if (!payload) return null;
  return (
    payload.url ||
    payload.checkout_url ||
    payload.portal_url ||
    payload.data?.url ||
    null
  );
}

async function postForUrl(
  path: string,
  body: Record<string, unknown>,
): Promise<string | null> {
  const response = await fetch(`/api/billing/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as BillingActionResult | null;
  if (!response.ok) {
    return null;
  }
  return resolveUrl(payload);
}

export function BillingActions() {
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        (await postForUrl("portal", { return_url: window.location.href })) ||
        (await postForUrl("billing/portal", { return_url: window.location.href })) ||
        (await postForUrl("checkout", { return_url: window.location.href }));
      if (!url) {
        throw new Error("Billing provider did not return a portal URL.");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = Number.parseFloat(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter a valid top-up amount.");
      }
      const body = {
        amount: parsed,
        currency,
        return_url: window.location.href,
      };
      const url =
        (await postForUrl("topup", body)) ||
        (await postForUrl("checkout", body)) ||
        (await postForUrl("billing/topup", body));
      if (!url) {
        throw new Error("Billing provider did not return a checkout URL.");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start top-up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={openPortal} isLoading={loading}>
          Open billing portal
        </Button>
      </div>

      <div className="rounded-md border border-border-default bg-background-surface p-4 space-y-3">
        <div className="text-sm text-text-secondary">Top up credits</div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-32"
          />
          <select
            className="h-10 rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            <option value="USD">USD</option>
            <option value="USDC">USDC</option>
          </select>
          <Button type="button" variant="secondary" onClick={handleTopUp} isLoading={loading}>
            Create top-up
          </Button>
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}
