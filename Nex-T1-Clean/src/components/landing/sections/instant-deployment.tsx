"use client";

import { useState, useEffect } from "react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Terminal, Code2, Database, Box, Layers, Cpu, Globe } from "lucide-react";
import { GlassCodeBlock, CodeTab, CodeSnippetLine } from "@/components/ui/glass-code-block";
import ActiveTabContext from "components/pages/home/instant-provisioning/active-tab-context";
import DotsAnimation from "components/pages/home/instant-provisioning/dots-animation/dots-animation";

const TABS: CodeTab[] = [
  { id: "nextjs", name: "Next.js", icon: Globe },
  { id: "drizzle", name: "Drizzle", icon: Database },
  { id: "prisma", name: "Prisma", icon: Layers },
  { id: "python", name: "Python", icon: Code2 },
  { id: "ruby", name: "Ruby", icon: Terminal },
  { id: "rust", name: "Rust", icon: Box },
  { id: "go", name: "Go", icon: Cpu },
];

const CODE_SNIPPETS: Record<string, CodeSnippetLine[]> = {
  nextjs: [
    { text: 'import { createAgent } from "@nex-t1/sdk";', color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: 'export const agent = createAgent({', color: "#AFB1B6", indent: 0 },
    { text: 'name: "YieldMaximizer",', color: "#AFB1B6", indent: 1 },
    { text: 'strategy: "delta_neutral",', color: "#AFB1B6", indent: 1 },
    { text: 'risk: "medium",', color: "#AFB1B6", indent: 1 },
    { text: 'assets: ["USDC", "ETH"],', color: "#AFB1B6", indent: 1 },
    { text: '});', color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: '// Deploy instantly', color: "#7D8187", indent: 0 },
    { text: 'await agent.deploy();', color: "#AFB1B6", indent: 0 },
  ],
  drizzle: [
    { text: "import { drizzle } from 'drizzle-orm/neon';", color: "#AFB1B6", indent: 0 },
    { text: "import { neon } from '@neondatabase/serverless';", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "const sql = neon(process.env.DATABASE_URL);", color: "#AFB1B6", indent: 0 },
    { text: "export const db = drizzle(sql);", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "// Query your agent data", color: "#7D8187", indent: 0 },
    { text: "const result = await db.select().from(agents);", color: "#AFB1B6", indent: 0 },
  ],
  prisma: [
    { text: "import { PrismaClient } from '@prisma/client';", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "const prisma = new PrismaClient();", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "// Connect to Nex-T1 infra", color: "#7D8187", indent: 0 },
    { text: "await prisma.$connect();", color: "#AFB1B6", indent: 0 },
    { text: "const agents = await prisma.agent.findMany();", color: "#AFB1B6", indent: 0 },
  ],
  python: [
    { text: "from nex_t1 import Agent", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "agent = Agent(", color: "#AFB1B6", indent: 0 },
    { text: 'name="YieldBot",', color: "#AFB1B6", indent: 1 },
    { text: 'strategy="arbitrage"', color: "#AFB1B6", indent: 1 },
    { text: ")", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "# Execute sync", color: "#7D8187", indent: 0 },
    { text: "agent.deploy(sync=True)", color: "#AFB1B6", indent: 0 },
  ],
  ruby: [
    { text: "require 'nex_t1'", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "client = NexT1::Client.new", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "# Fetch active agents", color: "#7D8187", indent: 0 },
    { text: "agents = client.agents.list", color: "#AFB1B6", indent: 0 },
    { text: "puts agents.first.status", color: "#AFB1B6", indent: 0 },
  ],
  rust: [
    { text: "use nex_t1::prelude::*;", color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "#[tokio::main]", color: "#AFB1B6", indent: 0 },
    { text: "async fn main() -> Result<()> {", color: "#AFB1B6", indent: 0 },
    { text: 'let client = Client::new("API_KEY");', color: "#AFB1B6", indent: 1 },
    { text: "client.deploy_agent().await?;", color: "#AFB1B6", indent: 1 },
    { text: "Ok(())", color: "#AFB1B6", indent: 1 },
    { text: "}", color: "#AFB1B6", indent: 0 },
  ],
  go: [
    { text: 'package main', color: "#AFB1B6", indent: 0 },
    { text: 'import "github.com/nex-t1/sdk"', color: "#AFB1B6", indent: 0 },
    { text: "", indent: 0 },
    { text: "func main() {", color: "#AFB1B6", indent: 0 },
    { text: 'client := nex.NewClient("API_KEY")', color: "#AFB1B6", indent: 1 },
    { text: "err := client.Deploy()", color: "#AFB1B6", indent: 1 },
    { text: "}", color: "#AFB1B6", indent: 0 },
  ]
};

function ConnectionString({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-[652px] h-[60px] bg-[rgba(255,255,255,0.03)] backdrop-blur-[2px] rounded-[14px] p-[6px] relative isolate ${className}`}>
      {/* Border 1 (Outer) */}
      <div className="absolute inset-0 border border-[rgba(255,255,255,0.04)] rounded-[14px] pointer-events-none" />
      
      {/* Border 2 (Overlay) */}
      <div className="absolute inset-[5px] border border-[rgba(255,255,255,0.04)] rounded-[10px] mix-blend-overlay pointer-events-none" />

      {/* Inner Background */}
      <div className="w-full h-full bg-[#0C0D0D] rounded-[10px] flex items-center px-[18px] gap-[14px]">
        
        {/* Status Dot Container */}
        <div className="flex flex-col justify-start pt-[4px] h-[10px] w-[6px]">
           {/* Background+Shadow */}
           <div className="w-[6px] h-[6px] bg-[#C0C0C0] rounded-full shadow-[0_0_9px_#BABABA] relative">
             {/* Background+Blur (Inner) */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[4px] h-[4px] bg-[#D9FDF1] opacity-70 blur-[0.5px] rounded-full" />
           </div>
        </div>

        {/* Text */}
        <div className="font-sans font-normal text-[13px] leading-[13px] tracking-[-0.32px] text-[#94979E]">
          https://mcp.nex-t1.ai/mcp
        </div>
      </div>
    </div>
  );
}

export function InstantDeployment() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="w-full bg-[#000000] overflow-hidden flex justify-center py-24 sm:py-28 md:py-32 relative">
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-20 items-start px-6">
        
        {/* Left Column Content */}
        <div className="flex flex-col gap-14">
          <ScrollReveal>
            <div className="max-w-xl flex flex-col gap-4">
              <h2 className="font-sans font-medium text-4xl sm:text-5xl lg:text-[61.8px] leading-[1.1] lg:leading-[61px] tracking-[-1.1px] text-white">
                Instant Provisioning
              </h2>
              <p className="font-sans font-normal text-base md:text-[15.8px] leading-[24px] text-[#7D8187]">
                No waiting. No config.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="max-w-xl flex flex-col gap-6">
              <h2 className="font-sans font-medium text-4xl sm:text-5xl lg:text-[61.2px] leading-[1.1] lg:leading-[61px] tracking-[-1.1px] text-white">
                Works with your stack
              </h2>
              <p className="font-sans font-normal text-base md:text-[15.8px] leading-[24px] text-[#7D8187]">
                Integrate it into your language or framework within minutes and unlock a simpler developer workflow.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column - Visuals */}
        <div className="w-full flex flex-col gap-6 items-start">
          <ActiveTabContext>
            <ScrollReveal delay={0.25}>
              <ConnectionString />
            </ScrollReveal>

            <ScrollReveal delay={0.28}>
              <DotsAnimation
                className="relative w-full max-w-[652px] aspect-[3.49726] md:mask-none sm:overflow-hidden"
                src="/animations/pages/home/dots-stack.riv"
                artboard="dots"
                intersectionRootMargin="0px 0px 600px 0px"
                onLoad={() => {}}
              />
            </ScrollReveal>

            <ScrollReveal delay={0.32}> 
              <GlassCodeBlock 
                tabs={TABS} 
                snippets={CODE_SNIPPETS} 
                initialTab="nextjs"
                className="w-full max-w-[652px]"
              />
            </ScrollReveal>
          </ActiveTabContext>
        </div>
      </div>
    </section>
  );
}
