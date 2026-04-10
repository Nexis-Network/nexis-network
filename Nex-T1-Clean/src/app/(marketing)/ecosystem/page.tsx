import type { Metadata } from "next";

import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { McpCatalog } from "@/components/mcp/mcp-catalog";
import { McpHero } from "@/components/mcp/mcp-hero";
import { getMcpRegistry } from "@/lib/mcp/registry";


export const metadata: Metadata = {
  title: "Nexis Ecosystem | Apps, Tools & Integrations",
  description:
    "Explore the Nexis ecosystem. Discover apps, tools, and integrations built on Nexis Network for Web3, DeFi, and AI agents.",
  keywords: [
    "nexis ecosystem",
    "web3 apps",
    "defi tools",
    "mcp servers",
    "nexis network",
    "blockchain integrations",
  ],
  openGraph: {
    title: "Nexis Ecosystem | Apps, Tools & Integrations",
    description: "Explore the Nexis ecosystem. Discover apps, tools, and integrations built on Nexis Network.",
    images: ["/assets/mcp-seo-og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexis Ecosystem | Apps, Tools & Integrations",
    description: "Explore the Nexis ecosystem. Discover apps, tools, and integrations built on Nexis Network.",
    images: ["/assets/mcp-seo-og.png"],
  },
};

export default async function EcosystemPage() {
  const registry = await getMcpRegistry();

  return (
    <div className="flex flex-col h-full min-h-screen bg-background overflow-x-hidden">
      <LandingHeaderV2 />

      <div className="flex-1 space-y-8 w-full  overflow-hidden">
        <McpHero />

        <div className="px-4 md:px-8 max-w-[1600px] mx-auto w-full pb-20">
          <McpCatalog registry={registry} />
        </div>
      </div>
    </div>
  );
}
