import type { Metadata } from "next";

import { LandingV3Root } from "@/components/landing/landing-v3-root";

const DEFAULT_APP_URL = "https://nex-t1.ai";

const normalizeAppUrl = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

const appUrl =
  normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ??
  normalizeAppUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  DEFAULT_APP_URL;

const canonicalUrl = `${appUrl}/landing-v3`;

export const metadata: Metadata = {
  title: "Nex-T1 AI | Landing V3 | Autonomous DeFi Copilot",
  description:
    "Nex-T1 landing-v3 delivers autonomous DeFi execution, AI crypto screening, and multi-chain on-chain automation in a high-performance Web3 AI experience.",
  keywords: [
    "DeFAI",
    "Web3 AI agents",
    "crypto AI agents",
    "AI crypto screener",
    "AI memecoin finder",
    "autonomous DeFi execution",
    "on-chain automation",
    "DeFi copilot",
    "multi-chain DeFi",
    "Nex-T1 AI",
    "Nexis Network",
    "DeFi intelligence",
    "on-chain trading assistant",
    "smart wallet automation",
    "AI blockchain platform",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    siteName: "Nex-T1 AI",
    title: "Nex-T1 AI | Landing V3 | Autonomous DeFi Copilot",
    description:
      "Explore landing-v3: a production-optimized DeFAI experience for Web3 AI agents, AI-driven token research, and autonomous on-chain execution.",
    images: [
      {
        url: `${appUrl}/blog/images/next1.jpg`,
        width: 1200,
        height: 630,
        alt: "Nex-T1 AI landing-v3 preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nex-T1 AI | Landing V3",
    description:
      "Autonomous DeFi execution with Web3 AI agents, AI crypto screener workflows, and production-grade on-chain automation.",
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
};

export default function LandingV3Page() {
  return <LandingV3Root />;
}
