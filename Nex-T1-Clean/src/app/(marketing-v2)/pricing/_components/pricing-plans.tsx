"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Assuming sonner or similar usage
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useBilling } from "@/lib/hooks/billing/use-billing";
import {
  STRIPE_DEFAULT_ENTERPRISE_PRICE_ID,
  STRIPE_DEFAULT_PRO_PRICE_ID,
  STRIPE_DEFAULT_TRADER_PRICE_ID,
  STRIPE_DEFAULT_ULTRA_PRICE_ID,
} from "@/lib/billing/stripe-pricing";


import { logger } from '@/lib/logger';
type PlanFeature = {
  label: string;
};

type Plan = {
  id: string;
  priceId?: string;
  name: string;
  headline: string;
  price: string;
  cadence: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  features: PlanFeature[];
  isHighlighted?: boolean;
};

const launchPlanHref = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    headline: "For builders getting started",
    price: "$0",
    cadence: "per month",
    description: "Test Nex-T1 with a focused starter credit pool and no card required.",
    ctaLabel: "Start for free",
    ctaHref: launchPlanHref,
    features: [
      { label: "30 credits per month" },
      { label: "Nex Instant model access" },
      { label: "Community support" },
    ],
  },
  {
    id: "pro",
    priceId: STRIPE_DEFAULT_PRO_PRICE_ID,
    name: "Pro",
    headline: "For advanced individual users",
    price: "$29.99",
    cadence: "per month",
    description: "Best entry point for serious usage with paid tool access and weighted credit billing.",
    ctaLabel: "Subscribe Pro",
    isHighlighted: true,
    features: [
      { label: "600 credits per month" },
      { label: "Nex Copilot, Nex Code, Nex Degen" },
      { label: "Overages: 150 credits for $10" },
    ],
  },
  {
    id: "trader",
    priceId: STRIPE_DEFAULT_TRADER_PRICE_ID,
    name: "Trader",
    headline: "For active traders",
    price: "$79.99",
    cadence: "per month",
    description: "Higher monthly credits and faster throughput for market-heavy workflows.",
    ctaLabel: "Subscribe Trader",
    features: [
      { label: "1,800 credits per month" },
      { label: "Real-time market insights" },
      { label: "Priority routing and expanded tool budgets" },
    ],
  },
  {
    id: "ultra",
    priceId: STRIPE_DEFAULT_ULTRA_PRICE_ID,
    name: "Ultra",
    headline: "For high-velocity desks",
    price: "$199.99",
    cadence: "per month",
    description: "Unlock MAX-grade model access with room for heavier research and code workflows.",
    ctaLabel: "Subscribe Ultra",
    features: [
      { label: "5,000 credits per month" },
      { label: "Includes Nex Ultra (MAX)" },
      { label: "Priority support + team workflows" },
    ],
  },
    {
    id: "enterprise",
    priceId: STRIPE_DEFAULT_ENTERPRISE_PRICE_ID,
    name: "Enterprise",
    headline: "For enterprise-scale operations",
    price: "$599.99",
    cadence: "per month",
    description: "Highest included credits, governance controls, and SLA-backed reliability.",
    ctaLabel: "Subscribe Enterprise",
    features: [
      { label: "15,000 credits per month" },
      { label: "Dedicated success manager + SLA" },
      { label: "Enterprise governance and controls" },
    ],
  },
];

export function PricingPlans() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { plan: currentPlan, loading: billingLoading, stripeCustomerId } = useBilling();

  const handleSubscribe = async (plan: Plan) => {
    // If they are on this plan already, redirect to manage subscription
    if (plan.id === currentPlan && stripeCustomerId) {
      setLoadingId(plan.id);
      try {
        const response = await fetch("/api/stripe/portal", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ returnUrl: window.location.href }),
        });
        if (response.ok) {
           const data = await response.json();
           window.location.href = data.url;
        } else {
           throw new Error("Failed to open billing portal");
        }
      } catch {
         toast.error("Could not open billing settings.");
      } finally {
         setLoadingId(null);
      }
      return;
    }

    if (!plan.priceId) {
      if (plan.ctaHref) router.push(plan.ctaHref);
      return;
    }

    try {
      setLoadingId(plan.id);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          returnUrl: window.location.href,
          mode: "subscription",
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
            router.push(buildAuthSignInUrl({ redirectTo: "/pricing" }));
            return;
        }
        throw new Error("Failed to start checkout");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      logger.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="bg-[#101010] pb-20 pt-14 md:pb-24 md:pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex h-full flex-col gap-6 rounded-3xl border border-white/8 bg-[#111111] p-6 shadow-[0_40px_70px_rgba(3,3,3,0.6)] transition-transform duration-300 hover:-translate-y-1",
                plan.isHighlighted && "border-white/20 bg-background",
              )}
            >
              {plan.isHighlighted ? (
                <Badge className="absolute right-6 top-6 border border-emerald-400/40 bg-[#8eb94f]/15 text-emerald-200">
                  Popular
                </Badge>
              ) : null}
              <header className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-white/80">{plan.name}</h2>
                  <p className="text-xs text-white/50 min-h-[40px]">{plan.headline}</p>
                </div>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.price !== '$0' && <span className="text-[10px] uppercase tracking-wider text-white/40">/mo</span>}
                </div>
                <p className="text-xs leading-relaxed text-white/60 min-h-[60px]">{plan.description}</p>
              </header>
              <Button
                size="lg"
                variant={plan.isHighlighted ? "default" : "outline"}
                className={cn(
                  "w-full",
                  plan.isHighlighted
                    ? "bg-[#8eb94f] text-black hover:bg-emerald-400"
                    : "border-white/20 text-white hover:bg-white/10",
                  // Dim button if it's the current plan
                  plan.id === currentPlan && "opacity-80"
                )}
                onClick={() => handleSubscribe(plan)}
                disabled={loadingId !== null || billingLoading}
              >
                {loadingId === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {plan.id === currentPlan 
                  ? "Manage Subscription" 
                  : plan.ctaLabel}
              </Button>

              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-white/35">Includes</p>
                <ul className="space-y-2 text-xs text-white/70">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2">
                       <span className="mt-1 inline-flex size-1.5 shrink-0 rounded-full bg-emerald-400/60" aria-hidden />
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
