import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2, Lock, Zap } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex Grid | Global State. Millisecond Sync.",
  description:
    "Nex Grid is the eventually-consistent key-value store for decentralized agents, synchronizing global state in milliseconds.",
  alternates: {
    canonical: "/nex-grid",
  },
};

export default function NexGridPage() {
  return (
    <ServicePageShell>
      <ServiceSection
        variant="dark"
        className="pt-[120px] pb-[96px] relative overflow-hidden"
        containerClassName="max-w-[1200px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(104,237,252,0.2),transparent_55%)]" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <ServiceEyebrow className="text-white/60">Nex Grid</ServiceEyebrow>
          <h1 className="font-sans text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
            Global State. {" "}
            <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFFFFF_20%,#68EDFC_100%)]">
              Millisecond Sync.
            </span>
          </h1>
          <p className="max-w-[620px] text-[13.7px] leading-[22px] text-white/70">
            The eventually-consistent key-value store built for decentralized intelligence and agent fleets.
          </p>
          <Link
            href="#hive"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
          >
            Explore Nex Grid
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>

      <ServiceSection
        id="hive"
        variant="gradient"
        className="py-[96px]"
        containerClassName="max-w-[1200px]"
      >
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">The Hive Mind</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              Distributed agents need distributed memory.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="P2P Synchronization"
              description="Agents share context and market signals instantly with no central bottleneck."
              icon={<Globe2 className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="Encrypted at Rest"
              description="Data is decrypted only inside verified TEE workers, never on the host."
              icon={<Lock className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="Infinite Scale"
              description="Add nodes to increase throughput linearly across the Nexis network."
              icon={<Zap className="h-5 w-5 text-[#68EDFC]" />}
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Network Visualization</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              P2P sync with zero single points of failure.
            </h2>
          </div>
          <div className="relative h-[320px] rounded-[30px] border border-white/10 bg-[#0f0f10] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(104,237,252,0.12),transparent_65%)]" />
            {[
              { x: "15%", y: "30%", delay: 0 },
              { x: "35%", y: "18%", delay: 0.4 },
              { x: "55%", y: "28%", delay: 0.8 },
              { x: "75%", y: "22%", delay: 1.2 },
              { x: "25%", y: "62%", delay: 1.6 },
              { x: "48%", y: "58%", delay: 2.0 },
              { x: "70%", y: "64%", delay: 2.4 },
              { x: "85%", y: "52%", delay: 2.8 },
            ].map((node) => (
              <div
                key={`${node.x}-${node.y}`}
                className="absolute"
                style={{ left: node.x, top: node.y }}
              >
                <div className="relative h-3 w-3">
                  <span
                    className="absolute -inset-2 rounded-full bg-[#68EDFC]/20 blur-md motion-safe:animate-ping motion-reduce:animate-none"
                    style={{ animationDelay: `${node.delay}s`, animationDuration: "3.6s" }}
                  />
                  <span
                    className="relative block h-3 w-3 rounded-full bg-[#68EDFC] shadow-[0_0_12px_rgba(104,237,252,0.6)] motion-safe:animate-pulse motion-reduce:animate-none"
                    style={{ animationDelay: `${node.delay}s`, animationDuration: "4.2s" }}
                  />
                </div>
              </div>
            ))}
            {[
              { left: "22%", top: "42%", width: "40%", opacity: 0.6, delay: 0.2 },
              { left: "40%", top: "50%", width: "42%", opacity: 0.5, delay: 0.8 },
              { left: "30%", top: "32%", width: "35%", opacity: 0.4, delay: 1.4 },
            ].map((beam) => (
              <span
                key={`${beam.left}-${beam.top}-${beam.width}`}
                className="absolute h-px bg-gradient-to-r from-transparent via-[#68EDFC] to-transparent motion-safe:animate-pulse motion-reduce:animate-none"
                style={{
                  left: beam.left,
                  top: beam.top,
                  width: beam.width,
                  opacity: beam.opacity,
                  animationDelay: `${beam.delay}s`,
                  animationDuration: "4.8s",
                }}
              />
            ))}
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Global memory</ServiceEyebrow>
          <h2 className="font-sans text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Give your agents shared context everywhere.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px]">
            Nex Grid keeps your global state consistent without sacrificing speed.
          </p>
          <Link
            href="/nex-cloud"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Deploy with Nex Cloud
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
