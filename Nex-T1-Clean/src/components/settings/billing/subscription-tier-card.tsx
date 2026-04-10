"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { BentoCard, BentoCardHeader } from "@/components/settings/shared/bento-card";
import { isFreeStripeSubscriptionPlan, type StripeSubscriptionPlan } from "@/lib/billing/stripe-subscription";
import { STRIPE_DEFAULT_PRO_PRICE_ID } from "@/lib/billing/stripe-pricing";

type BillingTier = "free" | "pro" | "trader" | "ultra" | "enterprise";

const TIER_FEATURES: Record<BillingTier, string[]> = {
  free: [
    "30 credits per month",
    "Nex Instant model access",
    "Community support",
  ],
  pro: [
    "600 credits per month",
    "Nex Copilot, Nex Code, and Nex Degen",
    "Overages: 150 credits for $10",
  ],
  trader: [
    "1,800 credits per month",
    "Priority routing + expanded tool budgets",
    "Overages: 150 credits for $10",
  ],
  ultra: [
    "5,000 credits per month",
    "Includes Nex Ultra (MAX) model access",
    "Priority support and team workflows",
  ],
  enterprise: [
    "15,000 credits per month",
    "Dedicated success and SLA-backed support",
    "Enterprise governance and custom contracts",
  ],
};

const TIER_DESCRIPTION: Record<BillingTier, string> = {
  free: "Upgrade to unlock higher model limits and larger monthly credit pools.",
  pro: "You are currently on Pro. Start with a 14-day free trial, then pay monthly.",
  trader: "You are currently on Trader. Built for active desks with higher throughput.",
  ultra: "You are currently on Ultra. Unlock MAX-grade reasoning and larger credit pools.",
  enterprise: "You are currently on Enterprise with the largest monthly credit allocation.",
};

function normalizeTierFromPlan(plan: StripeSubscriptionPlan | null): BillingTier {
  if (!plan) return "free";
  const name = plan.product.trim().toLowerCase();
  if (name.includes("enterprise")) return "enterprise";
  if (name.includes("ultra")) return "ultra";
  if (name.includes("trader")) return "trader";
  if (name.includes("pro")) return "pro";
  return "free";
}

interface SubscriptionTierCardProps {
  plan: StripeSubscriptionPlan | null;
  isLoading: boolean;
}

async function openPortal(): Promise<string | null> {
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnUrl: window.location.href }),
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({}));
  const url = payload?.data?.url || payload?.url;
  return typeof url === "string" ? url : null;
}

async function openCheckout(priceId: string): Promise<string | null> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId,
      returnUrl: window.location.href,
      mode: "subscription"
    }),
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({}));
  const url = payload?.data?.url || payload?.url;
  return typeof url === "string" ? url : null;
}

async function cancelSubscriptionAtPeriodEnd(): Promise<boolean> {
  const res = await fetch("/api/stripe/subscription/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cancelAtPeriodEnd: true }),
  });
  if (!res.ok) return false;
  const payload = await res.json().catch(() => null);
  return Boolean(payload?.success);
}

export function SubscriptionTierCard({
  plan,
  isLoading,
}: SubscriptionTierCardProps) {
  const queryClient = useQueryClient();

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

  const checkout = useMutation({
    mutationFn: openCheckout,
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

  const cancelSubscription = useMutation({
    mutationFn: cancelSubscriptionAtPeriodEnd,
    onSuccess: (success) => {
      if (!success) {
        toast.error("Unable to cancel subscription");
        return;
      }
      toast.success("Subscription set to cancel at period end");
      void queryClient.invalidateQueries({ queryKey: ["billing-plan"] });
    },
    onError: () => {
      toast.error("Unable to cancel subscription");
    },
  });

  const normalizedTier = normalizeTierFromPlan(plan);
  const isFree = isFreeStripeSubscriptionPlan(plan) || normalizedTier === "free";
  const isActive = plan?.status === "active" || plan?.status === "trialing";

  const features = TIER_FEATURES[normalizedTier];

  const handlePortalAction = () => {
    portal.mutate();
  };

  const handleCheckoutAction = () => {
    checkout.mutate(STRIPE_DEFAULT_PRO_PRICE_ID);
  };

  if (isLoading) {
    return (
      <BentoCard className="h-full">
        <BentoCardHeader title="Current Tier" />
        <div className="space-y-3 pt-1">
          <div className="h-6 w-1/3 animate-pulse rounded-lg bg-[var(--settings-elevated)]" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-[var(--settings-elevated)]" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full animate-pulse rounded-lg bg-[var(--settings-elevated)]" />
            <div className="h-4 w-5/6 animate-pulse rounded-lg bg-[var(--settings-elevated)]" />
            <div className="h-4 w-4/6 animate-pulse rounded-lg bg-[var(--settings-elevated)]" />
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="relative overflow-hidden">
      <BentoCardHeader
        title="Current Tier"
        action={
          plan?.status ? (
            <Badge
              variant={isActive ? "outline" : "destructive"}
              className={
                isActive
                  ? "border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] text-[var(--bento-text-muted)]"
                  : ""
              }
            >
              {plan.status.toUpperCase()}
            </Badge>
          ) : undefined
        }
      />

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--bento-text-primary)]">
              {isFree ? "Free Plan" : `${plan?.product ?? "Paid"} Plan`}
            </span>
            {!isFree && (
              <Badge className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] text-[11px] text-[var(--bento-text-muted)]">
                {normalizedTier.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--bento-text-muted)]">
            {TIER_DESCRIPTION[normalizedTier]}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-[var(--bento-text-primary)]">
            {plan?.price || "$0.00"}
          </span>
          <span className="text-xs text-[var(--bento-text-muted)]">
            / {plan?.interval || "month"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--bento-text-primary)]">Included Features:</p>
          <ul className="grid gap-2 text-xs text-[var(--bento-text-muted)]">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--settings-foreground-subtle)]" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {plan?.renewsAt && (
        <div className="rounded-lg bg-[var(--settings-elevated)] p-3 text-xs text-[var(--bento-text-muted)]">
            Your plan renews on {new Date(plan.renewsAt).toLocaleDateString()}.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex w-full gap-2 sm:w-auto">
          {isFree ? (
            <Button
              onClick={handleCheckoutAction}
              tone="primary"
              size="sm"
              className="h-8 w-full sm:w-auto"
              disabled={checkout.isPending}
            >
              {checkout.isPending ? "Loading..." : "Upgrade to Pro"} <Zap className="ml-2 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              tone="surface"
              onClick={handlePortalAction}
              disabled={portal.isPending}
              size="sm"
              className="h-8"
            >
              {portal.isPending ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
        </div>

        {!isFree && (
          <Button
            tone="destructive"
            size="sm"
            className="h-8"
            onClick={() => cancelSubscription.mutate()}
            disabled={cancelSubscription.isPending}
          >
            {cancelSubscription.isPending ? "Cancelling..." : "Cancel Subscription"}
          </Button>
        )}
      </div>
    </BentoCard>
  );
}
