import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, Layers, ShieldCheck } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex Runtime | The Confidential OS",
  description:
    "A hyper-optimized runtime for Trusted Execution Environments, abstracting SGX/TDX into a standard Docker interface.",
  alternates: {
    canonical: "/nex-runtime",
  },
};

export default function NexRuntimePage() {
  return (
    <ServicePageShell>
      <ServiceSection
        variant="gradient"
        className="pt-[120px] pb-[96px] relative overflow-hidden"
        containerClassName="max-w-[1200px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.25),transparent_55%)] motion-safe:animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(104,237,252,0.2),transparent_55%)]" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <ServiceEyebrow>Nex Runtime</ServiceEyebrow>
          <h1 className="font-sans text-balance text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
            The Confidential OS.
          </h1>
          <p className="max-w-[620px] text-balance text-[13.7px] leading-[22px] text-white/70">
            A hyper-optimized runtime for Trusted Execution Environments. Nex Runtime abstracts SGX and TDX
            into a standard Docker interface with supercomputer-grade security.
          </p>
          <Link
            href="#architecture"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
          >
            Explore the Architecture
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>

      <ServiceSection
        id="architecture"
        variant="dark"
        className="py-[96px]"
        containerClassName="max-w-[1200px]"
      >
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">The Architecture of Trust</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-balance text-3xl md:text-[39px] tracking-[-1.1px]">
              Hardware security, exposed as software.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="Supervisor"
              description="Manages the lifecycle of the guest VM and enforces enclave boundaries."
              icon={<Layers className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="KMS"
              description="Handles key generation and rotation inside the enclave, automatically."
              icon={<KeyRound className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="RA-TLS"
              description="Secures networking by authenticating code identity before opening a connection."
              icon={<ShieldCheck className="h-5 w-5 text-[#68EDFC]" />}
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Exploded View</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-balance text-3xl md:text-[39px] tracking-[-1.1px]">
              We abstract the hardware so you can focus on the code.
            </h2>
          </div>
          <div className="relative mx-auto w-full max-w-[640px]">
            <div className="absolute left-1/2 top-6 h-[calc(100%-48px)] w-px -translate-x-1/2 bg-white/10" />
            {[
              {
                title: "Your App",
                detail: "Standard Docker container",
                accent: "bg-white/10",
              },
              {
                title: "Nex Runtime",
                detail: "Supervisor + KMS + RA-TLS",
                accent: "bg-[#68EDFC]/20",
              },
              {
                title: "Hardware",
                detail: "Intel SGX / TDX secure silicon",
                accent: "bg-white/10",
              },
            ].map((layer, index) => (
              <div
                key={layer.title}
                className="relative z-10 mb-6 last:mb-0 rounded-[24px] border border-white/10 bg-[#0f0f10] px-6 py-5 text-center"
              >
                <div
                  className={`mx-auto mb-3 h-2 w-16 rounded-full ${layer.accent} motion-safe:animate-pulse`}
                />
                <h3 className="text-[18px] font-semibold text-white text-balance">{layer.title}</h3>
                <p className="text-[12px] text-white/60 text-balance">{layer.detail}</p>
                <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/40">
                  Layer {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Build on the engine</ServiceEyebrow>
          <h2 className="font-sans text-balance text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Bring your runtime into the enclave.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px] text-balance">
            Nex Runtime gives you deterministic security without forcing you to rewrite your stack.
          </p>
          <Link
            href="/nex-cloud"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Deploy on Nex Cloud
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
