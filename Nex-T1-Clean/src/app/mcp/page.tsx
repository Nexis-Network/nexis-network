import type { Metadata } from "next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { getMcpRegistry } from "@/lib/mcp/registry";
import { McpCatalog } from "@/components/mcp/mcp-catalog";
import { McpHero } from "@/components/mcp/mcp-hero";
import { IconServer } from "@tabler/icons-react";


export const metadata: Metadata = {
  title: "Ultimate Web3 & DeFi MCP Servers | Ethereum, Solana, Base, & More",
  description: "Discover and enable the best on-chain Model Context Protocol (MCP) servers for Web3, DeFi, and Crypto. Support for Ethereum, Solana, Bitcoin, Aptos, XRP, Linea, Uniswap, Pump.fun, and Pump.swap.",
  keywords: [
    "web3",
    "DeFi",
    "Crypto",
    "ethereum",
    "solana",
    "bitcoin",
    "aptos",
    "xrp",
    "linea",
    "uniswap",
    "pump.fun",
    "pump.swap",
    "on-chain mcp servers",
    "mcp catalog",
    "model context protocol"
  ],
  openGraph: {
    title: "Ultimate Web3 & DeFi MCP Servers | Nexis Network",
    description: "The most comprehensive catalog of on-chain MCP servers for autonomous agents. Integrate DeFi, trading, and blockchain data instantly.",
    images: ["/assets/mcp-seo-og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ultimate Web3 & DeFi MCP Servers | Nexis Network",
    description: "Browse and enable on-chain MCP servers for Ethereum, Solana, and more. Power up your AI agents with real-time crypto capabilities.",
    images: ["/assets/mcp-seo-og.png"],
  }
};

export default async function McpPage() {
  const registry = await getMcpRegistry();

  return (
    <div className="flex flex-col h-full min-h-screen bg-background overflow-x-hidden">
      <header className="flex md:hidden h-12 shrink-0 items-center gap-2 px-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 w-full">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/app" className="flex items-center gap-2">
                  <IconServer className="h-4 w-4" />
                  MCP Catalog
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 space-y-8 w-full  overflow-hidden">
        <McpHero />
        
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto w-full pb-20">
            <McpCatalog registry={registry} />
        </div>
      </div>
    </div>
  );
}
