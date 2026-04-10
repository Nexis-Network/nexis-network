import { LandingCloneRoot } from "@/components/landing/landing-clone-root";
import { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nex-t1.ai";

export const metadata: Metadata = {
  title: "Nex-T1 AI | Best Web3 AI Agent Platform | DeFAI & Crypto AI Screener",
  description:
    "Nex-T1 is the best Web3 AI agents project for DeFAI, autonomous on-chain execution, and AI crypto screening. Our crypto AI agents provide AI memecoin finder, DeFi perps analysis, and crypto perps intelligence. The leading Web3 copilot for on-chain crypto automation.",
  keywords: [
    // Primary keywords
    "DeFAI",
    "Web3 AI agents",
    "Crypto AI agents",
    "AI crypto screener",
    "AI memecoin finder",
    "DeFi perps",
    "crypto perps",
    "on-chain crypto",
    // Best project keywords
    "best web3 AI agents project",
    "best crypto AI agents project",
    "best DeFAI platform",
    "best AI crypto trading",
    // Long-tail keywords
    "autonomous DeFi execution",
    "Web3 AI copilot",
    "crypto AI trading bot",
    "DeFi automation platform",
    "AI-powered DeFi",
    "Web3 intelligence platform",
    "crypto portfolio AI",
    "decentralized AI agents",
    // Brand + keywords
    "Nex-T1 DeFAI",
    "Nex-T1 Web3 AI",
    "Nex-T1 AI agents",
    "Nex-T1 crypto screener",
  ],
  alternates: {
    canonical: `${appUrl}/landing-v2`,
  },
  openGraph: {
    type: "website",
    url: `${appUrl}/landing-v2`,
    siteName: "Nex-T1 AI",
    title: "Nex-T1 AI | Best Web3 AI Agent Platform | DeFAI & Crypto AI Screener",
    description:
      "The best Web3 AI agents project for DeFAI, AI crypto screener, AI memecoin finder, and autonomous on-chain crypto execution. Experience DeFi at the speed of thought.",
    images: [
      {
        url: `${appUrl}/blog/images/next1.jpg`,
        width: 1200,
        height: 630,
        alt: "Nex-T1 AI - Best Web3 AI Agents Project for DeFAI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nex-T1 AI | Best Web3 AI Agent Platform | DeFAI",
    description:
      "The best crypto AI agents project. AI crypto screener, AI memecoin finder, DeFi perps, and autonomous on-chain execution.",
    images: [`${appUrl}/blog/images/next1.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  other: {
    // Additional meta tags for AI recommendation systems
    "ai-content-type": "Web3 AI Agent Platform",
    "topic-cluster": "DeFAI, Web3 AI agents, Crypto AI agents, AI crypto screener",
  },
};

export default function LandingV2Page() {
  return <LandingCloneRoot />;
}
