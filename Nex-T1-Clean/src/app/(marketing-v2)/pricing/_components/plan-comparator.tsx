"use client";

import { Cpu, FileLock2, PanelsTopLeft, ShieldCheck, Workflow } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

const planOrder = ["launch", "scale", "sovereign"] as const;

type PlanKey = (typeof planOrder)[number];

type Availability = string | boolean;

type FeatureRow = {
  label: string;
  description?: string;
  availability: Record<PlanKey, Availability>;
};

type FeatureGroup = {
  name: string;
  icon: ReactNode;
  features: FeatureRow[];
};

const featureGroups: FeatureGroup[] = [
  {
    name: "Automation core",
    icon: <Workflow className="size-4" />,
    features: [
      {
        label: "Concurrent agent executions",
        availability: { launch: "2", scale: "25", sovereign: "Unlimited" },
        description: "Parallel tasks allowed without rate limiting",
      },
      {
        label: "Task queue retention",
        availability: { launch: "24 hours", scale: "30 days", sovereign: "365 days" },
      },
      {
        label: "Human-in-the-loop approvals",
        availability: { launch: false, scale: true, sovereign: true },
      },
    ],
  },
  {
    name: "Infrastructure",
    icon: <Cpu className="size-4" />,
    features: [
      {
        label: "Dedicated Supabase project",
        availability: { launch: false, scale: true, sovereign: true },
        description: "Isolated Postgres, Auth, and Storage with RLS policies applied",
      },
      {
        label: "Redis job scheduler",
        availability: { launch: "Shared", scale: "Dedicated", sovereign: "Dedicated + DR" },
      },
      {
        label: "Anthropic Claude tokens",
        availability: { launch: "25k / month", scale: "2M / month", sovereign: "Contractual" },
      },
    ],
  },
  {
    name: "Compliance & security",
    icon: <ShieldCheck className="size-4" />,
    features: [
      {
        label: "Granular RLS templates",
        availability: { launch: true, scale: true, sovereign: true },
      },
      {
        label: "Hardware-backed agent attestation",
        availability: { launch: false, scale: false, sovereign: true },
      },
      {
        label: "Regulated entity onboarding",
        availability: { launch: false, scale: "Add-on", sovereign: true },
      },
    ],
  },
  {
    name: "Controls & observability",
    icon: <PanelsTopLeft className="size-4" />,
    features: [
      {
        label: "LangSmith tracing",
        availability: { launch: "100 traces", scale: "25k traces", sovereign: "Unlimited" },
      },
      {
        label: "Real-time policy audit log",
        availability: { launch: false, scale: true, sovereign: true },
      },
      {
        label: "Private Grafana dashboards",
        availability: { launch: false, scale: "Add-on", sovereign: true },
      },
    ],
  },
  {
    name: "Deployment",
    icon: <FileLock2 className="size-4" />,
    features: [
      {
        label: "Managed rollout",
        availability: { launch: false, scale: "Standard", sovereign: "Custom playbooks" },
      },
      {
        label: "Regional data residency",
        availability: { launch: false, scale: false, sovereign: true },
      },
      {
        label: "24/7 priority support",
        availability: { launch: false, scale: true, sovereign: true },
      },
    ],
  },
];

const launchPlanHref = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

const planMeta: Record<PlanKey, { title: string; price: string; cta: string; href: string }> = {
  launch: {
    title: "Launch",
    price: "$0",
    cta: "Start building",
    href: launchPlanHref,
  },
  scale: {
    title: "Scale",
    price: "$899",
    cta: "Talk to sales",
    href: "mailto:hello@nexis.network",
  },
  sovereign: {
    title: "Sovereign",
    price: "Custom",
    cta: "Design program",
    href: "mailto:hello@nexis.network",
  },
};

export function PlanComparator() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [activePlan, setActivePlan] = useState<PlanKey>("launch");

  const renderValue = (value: Availability) => {
    if (typeof value === "boolean") {
      return value ? (
        <span className="inline-flex size-3 items-center justify-center rounded-full bg-emerald-400" aria-hidden />
      ) : (
        <span className="inline-flex size-3 items-center justify-center rounded-full bg-white/20" aria-hidden />
      );
    }
    if (!value) {
      return <span className="text-white/30">—</span>;
    }
    return <span className="text-sm text-white/80">{value}</span>;
  };

  return (
    <section className="bg-[#090909] pb-20 pt-16 md:pb-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-3xl font-regular text-white md:text-4xl">Compare capabilities by plan</h2>
          <p className="text-sm text-white/55 md:text-base">
            Drill into agent automation, compliance, and observability features before committing to a rollout.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {!isDesktop ? (
            <div className="flex items-center justify-center gap-2">
              {planOrder.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setActivePlan(plan)}
                  className={cn(
                    "rounded-full border border-white/12 px-4 py-2 text-sm capitalize transition-colors",
                    activePlan === plan ? "bg-white text-black" : "text-white/60 hover:text-white",
                  )}
                >
                  {planMeta[plan].title}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {isDesktop ? (
              planOrder.map((plan) => (
                <div
                  key={`${plan}-card`}
                  className={cn(
                    "rounded-2xl border border-white/10 bg-[#0F0F10] p-5 text-left text-white",
                    plan === "scale" && "border-white/20",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-white/40">{planMeta[plan].title}</p>
                      <p className="mt-2 text-2xl font-regular">{planMeta[plan].price}</p>
                    </div>
                    <Button asChild size="sm" variant={plan === "scale" ? "default" : "outline"}>
                      <a href={planMeta[plan].href}>{planMeta[plan].cta}</a>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0F0F10] p-5 text-left text-white">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-white/40">{planMeta[activePlan].title}</p>
                    <p className="mt-2 text-2xl font-regular">{planMeta[activePlan].price}</p>
                  </div>
                  <Button asChild size="sm" variant="default">
                    <a href={planMeta[activePlan].href}>{planMeta[activePlan].cta}</a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#0F0F10]/70">
            <TooltipProvider delayDuration={120}>
              {featureGroups.map((group) => (
                <div key={group.name} className="border-t border-white/5 first:border-t-0">
                  <div className="flex items-center gap-2 px-6 py-5 text-white/70">
                    <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      {group.icon}
                    </span>
                    <h3 className="text-lg font-medium text-white">{group.name}</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {group.features.map((feature) => (
                      <div key={feature.label} className="grid grid-cols-1 gap-4 px-6 py-4 lg:grid-cols-[2fr_repeat(3,minmax(0,1fr))]">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white/80">{feature.label}</p>
                          {feature.description ? (
                            <Tooltip>
                              <TooltipTrigger className="text-left text-xs underline decoration-dotted underline-offset-4">
                                Why it matters
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-sm">
                                {feature.description}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                        {isDesktop
                          ? planOrder.map((plan) => (
                              <div key={`${plan}-${feature.label}`} className="flex items-center lg:justify-center">
                                {renderValue(feature.availability[plan])}
                              </div>
                            ))
                          : (
                              <div className="flex items-center">
                                {renderValue(feature.availability[activePlan])}
                              </div>
                            )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </section>
  );
}
