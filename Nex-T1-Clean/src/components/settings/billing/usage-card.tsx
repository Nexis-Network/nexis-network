"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { InfoButton, PlusIcon } from "@/components/sidebar-03/animated-icons";

import { useCreditsContext } from "@/components/providers/credits-provider";
import { Button } from "@/components/settings/shared/settings-button";
import { Progress } from "@/components/ui/progress";
import { resolveUsageCreditLimit } from "@/lib/constants/billing-limits";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import {
  getOverageCheckoutLabel,
  STRIPE_DEFAULT_OVERAGE_PRICE_ID,
  STRIPE_DEFAULT_OVERAGE_SOURCE,
} from "@/lib/billing/stripe-pricing";

async function openOverageCheckout(): Promise<string | null> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId: STRIPE_DEFAULT_OVERAGE_PRICE_ID,
      returnUrl: window.location.href,
      mode: "payment",
      metadata: { source: STRIPE_DEFAULT_OVERAGE_SOURCE },
    }),
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({}));
  const url = payload?.data?.url || payload?.url;
  return typeof url === "string" ? url : null;
}

export function UsageCard() {
  const {
    credits,
    loading,
    plan,
    monthlyRemaining,
    overageCredits,
    limit,
  } = useCreditsContext();

  const monthlyLimit =
    typeof limit === "number" && limit > 0
      ? limit
      : resolveUsageCreditLimit(plan);

  const hasData = monthlyLimit !== null && credits !== null;
  const total = monthlyLimit || 100;
  const monthlyCreditsLeft =
    typeof monthlyRemaining === "number"
      ? Math.max(monthlyRemaining, 0)
      : Math.min(Math.max(credits || 0, 0), total);
  const extraCredits = Math.max(overageCredits || 0, 0);
  const remaining = Math.max(credits || 0, 0);
  const used = Math.max(0, total - monthlyCreditsLeft);
  const percentage = Math.min(100, Math.max(0, (used / total) * 100));

  const overageCheckout = useMutation({
    mutationFn: openOverageCheckout,
    onSuccess: (url) => {
      if (url) {
        window.location.assign(url);
      } else {
        toast.error("Unable to start checkout");
      }
    },
    onError: () => {
      toast.error("Something went wrong. Please try again later.");
    },
  });

  return (
    <BentoCard>
      <BentoCardHeader title="Usage Tracking" action={<Zap className="h-4 w-4 text-[var(--bento-text-muted)]" />} />

      <p className="settings-card-description mb-4">
        Your monthly credit usage progress.
      </p>

      {loading && !hasData ? (
        <div className="flex items-center gap-2 text-xs text-[var(--bento-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading usage data...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium font-mono tabular-nums text-[var(--bento-text-primary)]">
                {used.toLocaleString()} <span className="text-[var(--bento-text-muted)]">/ {total.toLocaleString()} credits</span>
              </span>
              <span className="font-mono tabular-nums text-[var(--bento-text-muted)]">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="grid gap-4 border-t border-[var(--settings-border)]/8 pt-4 text-xs sm:grid-cols-2">
            <div>
              <div className="settings-section-label">Total remaining</div>
              <div className="mt-1 font-mono text-[var(--bento-text-primary)]">
                {remaining.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="settings-section-label">Overage balance</div>
              <div className="mt-1 font-mono text-[var(--bento-text-primary)]">
                {extraCredits.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="settings-inline-section flex items-start gap-2">
            <div className="flex items-start gap-2 text-xs text-[var(--bento-text-muted)]">
              <InfoButton className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Included credits renew at the start of your billing cycle. Extra credits are consumed after your monthly allocation runs out.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-4">
          <Button
            variant="outline"
            className="h-[28px] w-full rounded-[5px] border-[var(--bento-border)] bg-transparent text-[12px] text-[var(--bento-text-primary)] hover:bg-[var(--settings-elevated)]"
            onClick={() => overageCheckout.mutate()}
            disabled={overageCheckout.isPending}
          >
            {overageCheckout.isPending ? "Loading..." : getOverageCheckoutLabel()}
            {!overageCheckout.isPending && <PlusIcon className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      )}
    </BentoCard>
  );
}
