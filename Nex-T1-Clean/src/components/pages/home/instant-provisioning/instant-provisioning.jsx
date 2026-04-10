'use client';

import { Box, Code2, Cpu, Database, Globe, Layers, Terminal } from 'lucide-react';
import Container from 'components/shared/container';
import Link from 'components/shared/link';
import { GlassCodeBlock } from '@/components/ui/glass-code-block';

import ActiveTabContext from './active-tab-context';
import ConnectionString from './connection-string';
import DotsAnimation from './dots-animation';

const TABS = [
  { id: 'nextjs', name: 'Next.js', icon: Globe },
  { id: 'drizzle', name: 'Drizzle', icon: Database },
  { id: 'prisma', name: 'Prisma', icon: Layers },
  { id: 'python', name: 'Python', icon: Code2 },
  { id: 'ruby', name: 'Ruby', icon: Terminal },
  { id: 'rust', name: 'Rust', icon: Box },
  { id: 'go', name: 'Go', icon: Cpu },
];

const CODE_SNIPPETS = {
  nextjs: [
    { text: 'import { createAgent } from "@nex-t1/sdk";', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'export const agent = createAgent({', color: '#AFB1B6', indent: 0 },
    { text: 'name: "YieldMaximizer",', color: '#AFB1B6', indent: 1 },
    { text: 'strategy: "delta_neutral",', color: '#AFB1B6', indent: 1 },
    { text: 'risk: "medium",', color: '#AFB1B6', indent: 1 },
    { text: 'assets: ["USDC", "ETH"],', color: '#AFB1B6', indent: 1 },
    { text: '});', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '// Deploy instantly', color: '#7D8187', indent: 0 },
    { text: 'await agent.deploy();', color: '#AFB1B6', indent: 0 },
  ],
  drizzle: [
    { text: "import { drizzle } from 'drizzle-orm/neon';", color: '#AFB1B6', indent: 0 },
    { text: "import { neon } from '@neondatabase/serverless';", color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'const sql = neon(process.env.DATABASE_URL);', color: '#AFB1B6', indent: 0 },
    { text: 'export const db = drizzle(sql);', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '// Query your agent data', color: '#7D8187', indent: 0 },
    { text: 'const result = await db.select().from(agents);', color: '#AFB1B6', indent: 0 },
  ],
  prisma: [
    { text: "import { PrismaClient } from '@prisma/client';", color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'const prisma = new PrismaClient();', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '// Connect to Nex-T1 infra', color: '#7D8187', indent: 0 },
    { text: 'await prisma.$connect();', color: '#AFB1B6', indent: 0 },
    { text: 'const agents = await prisma.agent.findMany();', color: '#AFB1B6', indent: 0 },
  ],
  python: [
    { text: 'from nex_t1 import Agent', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'agent = Agent(', color: '#AFB1B6', indent: 0 },
    { text: '  name="YieldBot",', color: '#AFB1B6', indent: 1 },
    { text: '  strategy="arbitrage"', color: '#AFB1B6', indent: 1 },
    { text: ')', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '# Execute sync', color: '#7D8187', indent: 0 },
    { text: 'agent.deploy(sync=True)', color: '#AFB1B6', indent: 0 },
  ],
  ruby: [
    { text: "require 'nex_t1'", color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'client = NexT1::Client.new', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '# Fetch active agents', color: '#7D8187', indent: 0 },
    { text: 'agents = client.agents.list', color: '#AFB1B6', indent: 0 },
    { text: 'puts agents.first.status', color: '#AFB1B6', indent: 0 },
  ],
  rust: [
    { text: 'use nex_t1::prelude::*;', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: '#[tokio::main]', color: '#AFB1B6', indent: 0 },
    { text: 'async fn main() -> Result<()> {', color: '#AFB1B6', indent: 0 },
    { text: '  let client = Client::new("API_KEY");', color: '#AFB1B6', indent: 1 },
    { text: '  client.deploy_agent().await?;', color: '#AFB1B6', indent: 1 },
    { text: '  Ok(())', color: '#AFB1B6', indent: 1 },
    { text: '}', color: '#AFB1B6', indent: 0 },
  ],
  go: [
    { text: 'package main', color: '#AFB1B6', indent: 0 },
    { text: 'import "github.com/nex-t1/sdk"', color: '#AFB1B6', indent: 0 },
    { text: '', indent: 0 },
    { text: 'func main() {', color: '#AFB1B6', indent: 0 },
    { text: '  client := nex.NewClient("API_KEY")', color: '#AFB1B6', indent: 1 },
    { text: '  err := client.Deploy()', color: '#AFB1B6', indent: 1 },
    { text: '}', color: '#AFB1B6', indent: 0 },
  ],
};

const InstantProvisioning = () => (
  <section className="instant-provising safe-paddings relative mt-[168px] xl:mt-28 lg:mt-24 sm:mt-20">
    <Container className="flex flex-wrap justify-center gap-x-[58px] xl:gap-x-[29px]" size="1100">
      <ActiveTabContext>
        {/* Left column with both text blocks and CTA */}
        <div className="flex w-[384px] flex-col gap-[72px] xl:w-[352px] xl:gap-[52px] lg:w-[256px] lg:gap-8 md:w-full md:max-w-[580px] md:gap-6">
          <div>
            <h2 className="font-title text-[68px] font-medium leading-[0.9] tracking-extra-tight text-white xl:text-[56px] lg:text-[44px] sm:text-[32px]">
              Instant Provisioning
            </h2>
            <p className="mt-[18px] text-xl font-light tracking-extra-tight text-gray-new-70 xl:mt-4 xl:text-lg lg:mt-3 lg:text-base md:mt-2">
              No waiting. No config.
            </p>
          </div>

          <div>
            <h2 className="font-title text-[68px] font-medium leading-[0.9] tracking-extra-tight text-white xl:text-[56px] lg:text-[44px] md:mt-2 sm:text-[32px]">
              Works with{` `}
              <br className="md:hidden" />
              your stack
            </h2>
            <p className="mt-7 font-light tracking-extra-tight text-gray-new-70 xl:mt-5 xl:max-w-xs xl:text-lg lg:mt-4 lg:text-base md:mt-2.5 md:max-w-none">
              Integrate it into your language or framework within minutes and unlock a simpler
              developer workflow.
            </p>
            <Link
              className="relative z-10 mt-7 flex w-fit items-center text-[15px] font-medium leading-none tracking-[-0.03em] xl:mt-5 lg:mt-4 md:mt-2.5"
              to="/docs/guides/guides-intro"
              theme="white"
              withArrow
            >
              See all examples
            </Link>
          </div>
        </div>

        {/* Right column: connection string, animation, then code block */}
        <div className="relative flex w-[652px] flex-col xl:w-[580px] lg:w-[417px] md:w-full md:max-w-[580px] gap-0 md:mt-6 sm:mt-8">
          <ConnectionString url="https://mcp.nex-t1.ai/mcp" compact wrapperClassName="p-0" />

          <DotsAnimation
            className="relative aspect-[3.49726] w-full mix-blend-lighten md:h-40 md:[mask-image:linear-gradient(to_bottom,black,black_calc(100%-40px),transparent)] sm:overflow-hidden"
            src="/animations/pages/home/dots-stack.riv"
            artboard="dots"
            intersectionRootMargin="0px 0px 600px 0px"
            animationRootMargin="0px 0px 300px 0px"
          />

          <GlassCodeBlock tabs={TABS} snippets={CODE_SNIPPETS} initialTab="nextjs" className="!mt-0" />
        </div>
      </ActiveTabContext>
    </Container>
  </section>
);

export default InstantProvisioning;
