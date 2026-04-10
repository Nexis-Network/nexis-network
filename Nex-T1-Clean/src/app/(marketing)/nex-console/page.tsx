import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2, KeyRound, LineChart } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex Console | Mission Control",
  description:
    "Monitor TEEs, manage keys, and scale your decentralized fleet from a single command surface.",
  alternates: {
    canonical: "/nex-console",
  },
};

export default function NexConsolePage() {
  const deepDiveItems = [
    {
      title: "Real-Time Metrics",
      body: "Glowing line graphs show CPU, memory, and enclave health in real time.",
      detail: "Auto-refreshing telemetry with per-node drilldowns.",
      visual: (
        <div
          aria-hidden
          className="relative h-44 sm:h-48 rounded-[24px] border border-white/10 bg-[#0f0f10] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(104,237,252,0.2),transparent_60%)]" />
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(transparent_23px,rgba(255,255,255,0.06)_24px),linear-gradient(90deg,transparent_23px,rgba(255,255,255,0.04)_24px)] bg-[size:24px_24px]" />
          <div className="absolute left-4 top-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <LineChart className="h-3 w-3 text-[#68EDFC]" />
            <span>Telemetry</span>
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-white/50">
            Live
          </div>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 320 180"
            preserveAspectRatio="none"
          >
            <path
              d="M0 130 L40 110 L80 120 L120 82 L160 96 L200 58 L240 70 L280 44 L320 60"
              fill="none"
              stroke="rgba(104,237,252,0.7)"
              strokeWidth="2"
            />
            <path
              d="M0 150 L40 142 L80 130 L120 138 L160 120 L200 126 L240 98 L280 110 L320 96"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
            />
            <circle cx="200" cy="58" r="4" fill="#68EDFC" />
            <circle cx="280" cy="44" r="4" fill="#68EDFC" />
          </svg>
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
            {[
              { label: "CPU", value: "62%" },
              { label: "Memory", value: "71%" },
              { label: "Attest", value: "99.98%" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2"
              >
                <div className="text-[9px] uppercase tracking-[0.24em] text-white/40">
                  {metric.label}
                </div>
                <div className="mt-1 text-[12px] text-white">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Key Management",
      body: "Inject and rotate secrets without exposing them to the host machine.",
      detail: "Hardware-enforced vaulting backed by policy controls.",
      visual: (
        <div
          aria-hidden
          className="relative h-44 sm:h-48 rounded-[24px] border border-white/10 bg-[#0f0f10] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_25%,rgba(104,237,252,0.18),transparent_60%)]" />
          <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.2em] text-white/40">
            Vault
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-white/50">
            Policy
          </div>
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/5 backdrop-blur">
            <div className="absolute inset-3 rounded-full border border-white/10 bg-[#0f0f10] flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-[#68EDFC]" />
            </div>
          </div>
          <div className="absolute left-5 bottom-5 grid grid-cols-3 gap-2">
            {["Key A", "Key B", "Key C"].map((label, index) => (
              <div
                key={label}
                className="h-10 w-14 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
              >
                <div className="text-[8px] uppercase tracking-[0.22em] text-white/40">
                  {label}
                </div>
                <div className="mt-1 h-1.5 w-6 rounded-full bg-[#68EDFC]/50" />
                <div
                  className="mt-1 h-1 w-4 rounded-full bg-white/20"
                  style={{ opacity: 0.6 + index * 0.1 }}
                />
              </div>
            ))}
          </div>
          <div className="absolute right-5 bottom-5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[9px] uppercase tracking-[0.24em] text-white/50">
            Rotate
          </div>
        </div>
      ),
    },
    {
      title: "Global Map",
      body: "Track active nodes and attestations across every region.",
      detail: "Latency-aware routing and regional scaling insights.",
      visual: (
        <div
          aria-hidden
          className="relative h-44 sm:h-48 rounded-[24px] border border-white/10 bg-[#0f0f10] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(104,237,252,0.12),transparent_65%)]" />
          <div className="absolute left-4 top-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <Globe2 className="h-3 w-3 text-[#68EDFC]" />
            <span>Regions</span>
          </div>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 320 180"
            preserveAspectRatio="none"
          >
            <path
              d="M30 140 C 90 60, 160 60, 220 20"
              fill="none"
              stroke="rgba(104,237,252,0.45)"
              strokeWidth="2"
            />
            <path
              d="M80 160 C 140 110, 210 110, 290 80"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="2"
            />
          </svg>
          {[
            { x: "18%", y: "68%" },
            { x: "36%", y: "42%" },
            { x: "52%", y: "56%" },
            { x: "70%", y: "30%" },
            { x: "82%", y: "52%" },
          ].map((node) => (
            <span
              key={`${node.x}-${node.y}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-[#68EDFC] shadow-[0_0_10px_rgba(104,237,252,0.6)] motion-safe:animate-pulse"
              style={{ left: node.x, top: node.y }}
            />
          ))}
          <div className="absolute bottom-5 left-5 flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-white/40">
            <span className="h-2 w-2 rounded-full bg-[#68EDFC]/70" />
            12 Active Zones
          </div>
        </div>
      ),
    },
  ];

  return (
    <ServicePageShell>
      <ServiceSection
        variant="gradient"
        className="pt-[120px] pb-[96px] relative overflow-hidden"
        containerClassName="max-w-[1200px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.25),transparent_55%)] motion-safe:animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(104,237,252,0.2),transparent_55%)]" />
        <div className="relative z-10 grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-6">
            <ServiceEyebrow>Nex Console</ServiceEyebrow>
            <h1 className="font-sans text-balance text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
              Command Center.
            </h1>
            <p className="text-[13.7px] leading-[22px] text-white/70 max-w-[520px] text-balance">
              Complete observability over your decentralized fleet. Monitor TEE health, manage cryptographic keys,
              and provision resources from one glass surface.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="https://cloud.nex-t1.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#D1D1D1] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f0f10] border border-white/60"
              >
                Open Console
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
              >
                Explore Features
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0f0f10] p-6 shadow-[0px_16px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#68EDFC]/12 blur-3xl motion-safe:animate-pulse" />
            <div className="relative z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/40">
              <span>Fleet Overview</span>
              <span className="flex items-center gap-2 font-space-mono text-white/30">
                <span className="h-2 w-2 rounded-full bg-[#68EDFC]/80 shadow-[0_0_8px_rgba(104,237,252,0.7)] motion-safe:animate-pulse" />
                Live
              </span>
            </div>
            <div className="relative z-10 mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Active TEEs", value: "142", delta: "+6" },
                { label: "Attestations", value: "99.98%", delta: "OK" },
                { label: "Latency", value: "48ms", delta: "-12%" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                >
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                    {metric.label}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[20px] font-semibold text-white">{metric.value}</span>
                    <span className="text-[10px] text-[#68EDFC] motion-safe:animate-pulse">
                      {metric.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative z-10 mt-6 h-24 rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 motion-safe:animate-pulse" />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection
        id="features"
        variant="dark"
        className="py-[96px]"
        containerClassName="max-w-[1200px]"
      >
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Feature Grid</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-balance text-3xl md:text-[39px] tracking-[-1.1px]">
              Visibility without blind spots.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="Fleet Visibility"
              description="View CPU usage, memory pressure, and attestation status across the entire node network."
              icon={<LineChart className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="Secret Management"
              description="Inject API keys and certificates into running agents without exposing them to hosts."
              icon={<KeyRound className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="One-Click Scaling"
              description="Scale horizontally across the Nexis decentralized network with a single toggle."
              icon={<Globe2 className="h-5 w-5 text-[#68EDFC]" />}
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Deep Dive</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-balance text-3xl md:text-[39px] tracking-[-1.1px]">
              Interactive control at every layer.
            </h2>
          </div>
          <div className="grid gap-8">
            {deepDiveItems.map((item, index) => (
              <div
                key={item.title}
                className="grid gap-6 md:grid-cols-[1fr_1fr] items-center"
              >
                <div className={index % 2 === 0 ? "order-1" : "order-1 md:order-2"}>
                  <h3 className="text-[20px] font-semibold text-white text-balance">{item.title}</h3>
                  <p className="mt-3 text-[12.8px] text-white/60 text-balance">{item.body}</p>
                  <p className="mt-2 text-[12px] text-white/40 text-balance">{item.detail}</p>
                </div>
                <div
                  className={
                    index % 2 === 0
                      ? "order-2 md:order-2"
                      : "order-2 md:order-1"
                  }
                >
                  {item.visual}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Mission ready</ServiceEyebrow>
          <h2 className="font-sans text-balance text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Bring your fleet under control.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px] text-balance">
            Nex Console keeps every enclave, key, and region in a single view.
          </p>
          <Link
            href="https://cloud.nex-t1.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Open Console
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
