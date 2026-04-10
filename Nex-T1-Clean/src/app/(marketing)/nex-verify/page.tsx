import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, FileCheck, Fingerprint, ShieldCheck } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex Verify | Don't Trust. Verify.",
  description:
    "Nex Verify is the cryptographic standard for proving compute integrity and attestation truth.",
  alternates: {
    canonical: "/nex-verify",
  },
};

export default function NexVerifyPage() {
  return (
    <ServicePageShell>
      <ServiceSection
        variant="gradient"
        className="pt-[120px] pb-[96px] relative overflow-hidden"
        containerClassName="max-w-[1200px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(104,237,252,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.2),transparent_60%)]" />
        <div className="relative z-10 grid gap-10 md:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6">
            <ServiceEyebrow>Nex Verify</ServiceEyebrow>
            <h1 className="font-sans text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
              Don&apos;t Trust.{" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFFFFF_40%,#68EDFC_100%)]">
                Verify.
              </span>
            </h1>
            <p className="max-w-[540px] text-[13.7px] leading-[22px] text-white/70">
              The cryptographic standard for proving compute integrity in the age of autonomous AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="#proof"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#D1D1D1] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f0f10] border border-white/60"
              >
                View the Proof
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/nex-runtime"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
              >
                Explore Runtime
              </Link>
            </div>
          </div>
          <div className="relative h-[320px] md:h-[420px] rounded-[30px] border border-white/10 bg-[#0f0f10] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(104,237,252,0.28),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.2),transparent_60%)]" />
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/20 bg-white/5 backdrop-blur-xl" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/30 bg-white/10" />
            <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-[#68EDFC]/40" />
            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <ShieldCheck className="h-7 w-7 text-[#68EDFC]" />
            </div>
            <div className="absolute bottom-6 left-6 text-[11px] uppercase tracking-[0.28em] text-white/50">
              Attestation Quote
            </div>
            <div className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/60">
              TEE Verified
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection id="proof" variant="dark" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">The Proof of Execution</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              Mathematical truth, not marketing trust.
            </h2>
            <p className="mx-auto mt-3 max-w-[640px] text-[12.8px] leading-[18px] text-white/60">
              Nex Verify issues cryptographic quotes that prove your workload ran on genuine hardware without
              tampering.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="Code Integrity"
              description="Proves the exact container image and hash that executed."
              icon={<FileCheck className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="Hardware Authenticity"
              description="Confirms execution inside verified Intel/AMD secure enclaves."
              icon={<Cpu className="h-5 w-5 text-[#68EDFC]" />}
            />
            <ServiceCard
              title="State Continuity"
              description="Assures memory and runtime state have not been modified."
              icon={<Fingerprint className="h-5 w-5 text-[#68EDFC]" />}
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] items-center">
          <div className="space-y-4">
            <ServiceEyebrow className="text-white/50">Use Cases</ServiceEyebrow>
            <h2 className="font-sans text-3xl md:text-[34px] tracking-[-0.9px]">
              Audit-grade execution, on demand.
            </h2>
            <p className="text-[12.8px] leading-[18px] text-white/60">
              Nex Verify turns opaque AI execution into auditable evidence that regulators, partners, and
              users can trust.
            </p>
            <div className="space-y-3 text-[12px] text-white/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#68EDFC]" />
                <span>Attest every trade and model invocation in real time.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#68EDFC]" />
                <span>Provide immutable evidence of runtime integrity.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#68EDFC]" />
                <span>Protect proprietary strategy while proving compliance.</span>
              </div>
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-[#0f0f10] p-8">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Use Case</div>
            <p className="mt-4 text-[16px] text-white">
              &quot;Financial institutions use Nex Verify to audit algorithmic trading bots in real time without
              revealing the bot&apos;s proprietary strategy.&quot;
            </p>
            <p className="mt-3 text-[12px] text-white/50">Institutional compliance &amp; audit teams</p>
            <div className="mt-6 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-white/60">
              Verified execution reports
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Prove it</ServiceEyebrow>
          <h2 className="font-sans text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Turn verification into your competitive edge.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px]">
            Nex Verify makes trust measurable, auditable, and immediate.
          </p>
          <Link
            href="/nex-runtime"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Explore Nex Runtime
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
