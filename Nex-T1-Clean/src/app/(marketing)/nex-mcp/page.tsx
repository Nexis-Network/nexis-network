import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, Code2, Plug, ShieldCheck } from "lucide-react";

import {
  ServiceCard,
  ServiceEyebrow,
  ServicePageShell,
  ServiceSection,
} from "@/components/landing/service-page-shell";

export const metadata: Metadata = {
  title: "Nex MCP | Give Your Agent Hands",
  description:
    "Nex MCP is the Model Context Protocol server for DeFi, giving AI agents native on-chain tools.",
  alternates: {
    canonical: "/nex-mcp",
  },
};

const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "nex-defi": {
      "command": "docker",
      "args": ["run", "--tee", "nexis-network/mcp-server"]
    }
  }
}`;

export default function NexMcpPage() {
  return (
    <ServicePageShell>
      <ServiceSection variant="gradient" className="pt-[120px] pb-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-6">
            <ServiceEyebrow>Nex MCP</ServiceEyebrow>
            <h1 className="font-sans text-4xl md:text-[56px] leading-tight tracking-[-1.4px]">
              Give your agent {" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFFFFF_30%,#68EDFC_100%)]">
                hands.
              </span>
            </h1>
            <p className="text-[13.7px] leading-[22px] text-white/70 max-w-[520px]">
              The Model Context Protocol server for DeFi. Connect Claude, OpenAI, or Llama to the blockchain
              instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="https://mcp.nex-t1.ai/mcp"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#D1D1D1] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f0f10] border border-white/60"
              >
                Install Server
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="#toolset"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 hover:text-white"
              >
                View Tool Registry
              </Link>
            </div>
          </div>
          <div className="relative rounded-[30px] border border-white/10 bg-[#0f0f10] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Brain className="h-4 w-4 text-[#68EDFC]" />
                  <span className="text-[12px] uppercase tracking-[0.24em]">AI</span>
                </div>
                <p className="mt-4 text-[12px] text-white/60">Intent and reasoning models</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Code2 className="h-4 w-4 text-[#68EDFC]" />
                  <span className="text-[12px] uppercase tracking-[0.24em]">Chain</span>
                </div>
                <p className="mt-4 text-[12px] text-white/60">On-chain state and execution</p>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0f0f10] text-[10px] uppercase tracking-[0.28em] text-white/70">
              MCP
            </div>
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="dark" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-3">
          <ServiceCard
            title="Plug & Play"
            description="Compatible with Cursor, Claude Desktop, and any MCP-compliant client."
            icon={<Plug className="h-5 w-5 text-[#68EDFC]" />}
          />
          <ServiceCard
            title="Chain Agnostic"
            description="Write one prompt and execute across Solana, Ethereum, Base, or Arbitrum."
            icon={<Code2 className="h-5 w-5 text-[#68EDFC]" />}
          />
          <ServiceCard
            title="Safe by Default"
            description="All tools run through Nex Runtime verification before signing." 
            icon={<ShieldCheck className="h-5 w-5 text-[#68EDFC]" />}
          />
        </div>
      </ServiceSection>

      <ServiceSection
        id="toolset"
        variant="muted"
        className="py-[96px]"
        containerClassName="max-w-[1200px]"
      >
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">The Toolset</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              A standard library for financial action.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {["swap_tokens()", "deploy_contract()", "get_wallet_balance()", "bridge_assets()"].map((tool) => (
              <div
                key={tool}
                className="rounded-[24px] border border-white/10 bg-[#0f0f10] p-5 font-space-mono text-[13px] text-white"
              >
                {tool}
                <div className="mt-3 text-[11px] text-white/50">
                  High-level primitives for on-chain execution
                </div>
              </div>
            ))}
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="gradient" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] items-center">
          <div className="space-y-4">
            <ServiceEyebrow className="text-white/50">Usage</ServiceEyebrow>
            <h2 className="font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              One config. Infinite capabilities.
            </h2>
            <p className="text-[12.8px] leading-[18px] text-white/60">
              Point your MCP client at Nex MCP and unlock wallets, swaps, and on-chain data instantly.
            </p>
          </div>
          <pre className="rounded-[24px] border border-white/10 bg-[#0f0f10] p-6 text-[12px] text-white/70 overflow-x-auto">
            {MCP_CONFIG_SNIPPET}
          </pre>
        </div>
      </ServiceSection>

      <ServiceSection variant="dark" className="py-[96px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col gap-10">
          <div className="text-center">
            <ServiceEyebrow className="text-white/50">Use Cases</ServiceEyebrow>
            <h2 className="mt-4 font-sans text-3xl md:text-[39px] tracking-[-1.1px]">
              Agents that execute, not just explain.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceCard
              title="Autonomous Portfolio Manager"
              description="Monitor gas and bridge assets automatically when conditions are met."
            />
            <ServiceCard
              title="DevOps Agent"
              description="Use Cursor + Nex MCP to deploy contracts and run tests without leaving your IDE."
            />
            <ServiceCard
              title="Liquidity Commander"
              description="Rebalance LP positions in real time to reduce impermanent loss."
            />
          </div>
        </div>
      </ServiceSection>

      <ServiceSection variant="paper" className="py-[80px]" containerClassName="max-w-[1200px]">
        <div className="flex flex-col items-center text-center gap-4">
          <ServiceEyebrow className="text-black/40">Connect your tools</ServiceEyebrow>
          <h2 className="font-sans text-3xl md:text-[34px] tracking-[-0.9px] text-[#080808]">
            Turn any LLM into an on-chain operator.
          </h2>
          <p className="text-[12.8px] text-black/60 max-w-[520px]">
            Nex MCP standardizes access to DeFi so your agents can act with confidence.
          </p>
          <Link
            href="https://mcp.nex-t1.ai/mcp"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0f0f10] px-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
          >
            Install Nex MCP
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </ServiceSection>
    </ServicePageShell>
  );
}
