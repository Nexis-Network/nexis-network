import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Gauge, Layers, Rocket, ShieldCheck, Workflow } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Agent Launchpad | Ship Autonomous Strategies",
  description:
    "Design, simulate, and deploy autonomous DeFi strategies with audited guardrails, approvals, and enterprise-grade controls.",
  alternates: {
    canonical: "/launchpad",
  },
};

const featureCards = [
  {
    title: "Strategy Builder",
    description: "Compose multi-step automation flows with drag-and-drop blocks and verified templates.",
    icon: <Boxes className="h-5 w-5 text-[#68EDFC]" />,
  },
  {
    title: "Risk Simulation",
    description: "Replay strategies against historical blocks and slippage curves before deployment.",
    icon: <Gauge className="h-5 w-5 text-[#68EDFC]" />,
  },
  {
    title: "Scoped Permissions",
    description: "Enforce wallet, chain, and spend limits per agent using session keys.",
    icon: <ShieldCheck className="h-5 w-5 text-[#68EDFC]" />,
  },
  {
    title: "Deployment Registry",
    description: "Version, publish, and roll back strategy deployments across teams and orgs.",
    icon: <Layers className="h-5 w-5 text-[#68EDFC]" />,
  },
];

const workflowSteps = [
  {
    title: "Design",
    detail: "Map intent to on-chain actions with templates for swaps, yield, and portfolio hedging.",
  },
  {
    title: "Simulate",
    detail: "Run pre-trade simulations, slippage checks, and permission validation.",
  },
  {
    title: "Deploy",
    detail: "Publish to your org registry with audit trails and approval gates.",
  },
  {
    title: "Monitor",
    detail: "Track runtime KPIs, profit deltas, and safety events in real time.",
  },
];

export default function LaunchpadPage() {
  return (
    <ServicePageShell>
      <ServiceSection variant="gradient" className="pt-[120px] pb-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6">
            <ServiceEyebrow>Agent Launchpad</ServiceEyebrow>
            <h1 className="font-sans text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
              Ship autonomous strategies {" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFFFFF_30%,#68EDFC_100%)]">
                with confidence.
              </span>
            </h1>
            <p className="text-[13.7px] leading-[22px] text-white/70 max-w-[560px]">
              Launchpad is the control plane for strategy design, simulation, and deployment. Build on-chain
              automation that stays inside user-approved limits and enterprise compliance rules.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/agents/strategy-lab"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#D1D1D1] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f0f10] border border-white/60"
              >
                Open Launchpad
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="#workflow"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
              >
                View Workflow
              </Link>
            </div>
          </div>

          <div className="relative rounded-[30px] border border-white/10 bg-[#0f0f10] p-6">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/40">
              <span>Launchpad Pipeline</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] tracking-[0.24em] text-white/60">
                Live
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { title: "Strategy v2.4", status: "Simulating", note: "Curve + Aave loop" },
                { title: "Vault Guardian", status: "Approved", note: "Risk limits enforced" },
                { title: "Momentum Grid", status: "Deployed", note: "Base + Arbitrum" },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div className="text-sm text-white">{item.title}</div>
                    <div className="text-[11px] text-white/50">{item.note}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/60">
                    <span className="h-2 w-2 rounded-full bg-[#68EDFC]" style={{ opacity: 0.6 + index * 0.2 }} />
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f0f10] px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-white/50">
              <Rocket className="mr-2 inline h-4 w-4 text-[#68EDFC]" />
              Deployments synchronized across orgs
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="dark" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <ServiceCard key={card.title} {...card} />
          ))}
        </div>
      </ServiceSection>

      <ServiceSection id="workflow" variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Workflow</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              A launch sequence built for safe execution.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[24px] border border-white/10 bg-[#0f0f10] p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[12px] text-white/70">
                    0{index + 1}
                  </div>
                  <h3 className="text-lg text-white">{step.title}</h3>
                </div>
                <p className="mt-3 text-[12.6px] leading-[19px] text-white/60">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[30px] border border-white/10 bg-[#0f0f10] p-6">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/50">
                <Workflow className="h-4 w-4 text-[#68EDFC]" />
                Orchestration
              </div>
              <h3 className="mt-4 text-2xl text-white">Human-in-the-loop approvals.</h3>
              <p className="mt-3 text-[12.8px] leading-[19px] text-white/60">
                Every deployment ships with approval workflows, multi-sig enforcement, and deterministic
                rollback paths.
              </p>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-[#0f0f10] p-6">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/50">
                <ShieldCheck className="h-4 w-4 text-[#68EDFC]" />
                Compliance
              </div>
              <h3 className="mt-4 text-2xl text-white">Guardrails by default.</h3>
              <p className="mt-3 text-[12.8px] leading-[19px] text-white/60">
                Policies map to org roles, enforce chain allowlists, and record every action in an audit log.
              </p>
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="rounded-[40px] border border-black/10 bg-white px-8 py-10 md:px-12 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <ServiceEyebrow className="text-black/50">Ready to launch?</ServiceEyebrow>
              <h2 className="font-sans text-3xl md:text-[36px] tracking-[-1px] text-black">
                Build and deploy in minutes.
              </h2>
              <p className="text-[13px] text-black/60 max-w-[420px]">
                Start with a verified template or import your own strategy graph and publish to the Launchpad.
              </p>
            </div>
            <Link
              href="/agents/strategy-lab"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0f0f10] px-7 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
            >
              Launch Strategy Builder
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
