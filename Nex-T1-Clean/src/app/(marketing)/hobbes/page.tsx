import type { Metadata } from "next";
import { HobbesFullWidthSpline } from "@/components/landing/hobbes-full-width-spline";
import { HobbesSmoothScroll } from "@/components/landing/hobbes-smooth-scroll";
import { Header } from "@/components/new-header/header";
import { HobbesTop } from "@/app/(marketing)/hobbes/_components/hobbes-top";
import { HobbesMiddle } from "@/app/(marketing)/hobbes/_components/hobbes-middle";
import { HobbesComparison } from "@/app/(marketing)/hobbes/_components/hobbes-comparison";
import { HobbesBottom } from "@/app/(marketing)/hobbes/_components/hobbes-bottom";

export const metadata: Metadata = {
  title: "Nex Copilot | Autonomous DeFi Copilot for Secure Multichain Execution",
  description:
    "Use Nex Copilot to run secure multichain DeFi workflows with HITL approvals, live integrations, persistent runtime, and stateful AI memory.",
  keywords: [
    "nex-t1",
    "autonomous defi copilot",
    "multichain workflow automation",
    "human in the loop approvals",
    "policy governed execution",
    "mcp integrations",
    "e2b sandbox runtime",
    "session keys",
    "safe multisig",
    "redis conversation memory",
    "pgvector semantic memory",
    "graph knowledge base",
    "ethereum base arbitrum optimism polygon solana",
    "moralis uniswap cow swap hyperliquid ccxt",
    "web3 ai agent",
  ],
  alternates: {
    canonical: "/hobbes",
  },
  openGraph: {
    title: "Nex Copilot | Autonomous DeFi Copilot for Secure Multichain Execution",
    description:
      "Autonomous DeFi execution with HITL guardrails, MCP tools, persistent runtime context, and multichain support.",
    url: "/hobbes",
    type: "website",
    images: [
      {
        url: "/web-preview.png",
        width: 1200,
        height: 630,
        alt: "Nex Copilot autonomous DeFi copilot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nex Copilot | Autonomous DeFi Copilot for Secure Multichain Execution",
    description:
      "Run secure multichain DeFi workflows with HITL governance, MCP integrations, and persistent AI memory.",
    images: ["/web-preview.png"],
  },
};

export default function HobbesPage() {
  return (
    <main className="relative bg-[#03040c] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <HobbesSmoothScroll />
      <div className="fixed inset-x-0 top-0 z-50">
        <Header />
      </div>
      <HobbesTop />
      <HobbesMiddle />

      <HobbesFullWidthSpline />
      <HobbesComparison />
      <HobbesBottom />
    </main>
  );
}
