import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, Lock, ShieldCheck } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex Cloud | Deploy Unstoppability",
  description:
    "Nex Cloud is the serverless platform for AI agents, shipping Docker workloads into verified TEEs in seconds.",
  alternates: {
    canonical: "/nex-cloud",
  },
};

export default function NexCloudPage() {
  return (
    <ServicePageShell>
      <ServiceSection variant="gradient" className="pt-[120px] pb-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-6">
            <ServiceEyebrow>Nex Cloud</ServiceEyebrow>
            <h1 className="font-sans text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
              Deploy {" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFFFFF_40%,#68EDFC_100%)]">
                Unstoppability.
              </span>
            </h1>
            <p className="text-[13.7px] leading-[22px] text-white/70 max-w-[520px]">
              The serverless cloud for the Agentic Economy. Ship Docker containers into verified TEEs in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/agents/new"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#D1D1D1] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f0f10] border border-white/60"
              >
                Start Building
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://docs.nex-t1.ai"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
              >
                Read the Docs
              </Link>
            </div>
          </div>
          <div className="relative h-[320px] md:h-[420px] rounded-[30px] border border-white/10 bg-[#0f0f10] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(104,237,252,0.35),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.3),transparent_60%)]" />
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/20 bg-white/5 backdrop-blur-xl" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/30 bg-white/10" />
            <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-[#68EDFC]/40" />
            <div className="absolute bottom-6 left-6 text-[11px] uppercase tracking-[0.28em] text-white/50">
              TEE Core
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="dark" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] items-start">
          <div className="space-y-4">
            <ServiceEyebrow className="text-white/50">The Why</ServiceEyebrow>
            <h2 className="font-sans text-3xl md:text-[39px] tracking-[-1.1px]">The cloud, hardened.</h2>
            <p className="text-[12.8px] leading-[18px] text-white/60">
              Traditional clouds leak data. Nex Cloud wraps every container in hardware-enforced isolation.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-[#68EDFC]" />
              <div>
                <h3 className="text-[14px] font-semibold text-white">Encrypted Secrets</h3>
                <p className="text-[12px] text-white/60">
                  Environment variables are encrypted before they leave your machine.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-[#68EDFC]" />
              <div>
                <h3 className="text-[14px] font-semibold text-white">Verifiable Logs</h3>
                <p className="text-[12px] text-white/60">
                  Prove to users that your agent runs exactly the code you published.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-[#68EDFC]" />
              <div>
                <h3 className="text-[14px] font-semibold text-white">One-Command Deploy</h3>
                <p className="text-[12px] text-white/60">nex deploy. That&apos;s it.</p>
              </div>
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="muted" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Workflow</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              Infrastructure that feels like magic.
            </h2>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[#0f0f10] p-6 font-space-mono text-[12px] text-white/70">
            <div className="text-white/40">$ nex deploy agent-v1</div>
            <div className="mt-3 text-[#68EDFC]">[Verifying hardware...] OK</div>
            <div className="text-[#68EDFC]">[Encrypting secrets...] OK</div>
            <div className="text-[#68EDFC]">[Attestation issued...] OK</div>
            <div className="text-white">Deployed to TEE cluster: prod-us-west</div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection id="templates" variant="gradient" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Templates</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              Don&apos;t start from scratch. Start from finished.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="MCP Servers"
              description="Connect LLMs to Solana, EVM, and Linear instantly with pre-wired tools."
              eyebrow="Template"
            />
            <ServiceCard
              title="Confidential RAG"
              description="Vector databases that keep knowledge sealed inside the enclave."
              eyebrow="Template"
            />
            <ServiceCard
              title="Agent UIs"
              description="Pre-configured chat interfaces for your custom models and workflows."
              eyebrow="Template"
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Ready to ship?</ServiceEyebrow>
          <h2 className="font-sans text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Deploy your agent in minutes.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px]">
            Nex Cloud handles attestation, networking, and encryption so you can focus on code.
          </p>
          <Link
            href="/agents/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Start Building
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
