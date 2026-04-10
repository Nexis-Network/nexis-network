import { NexT1ClientPage } from "@/components/nex-t1/nex-t1-client-page"
import { LandingHeaderV2 } from "@/components/landing/landing-header-v2"
import { SiteFooter } from "@/components/marketing/site-footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nex-T1 Enterprise Agent | Autonomous DeFi Execution",
  description: "The strictly typed, policy-governed developer companion for Web3. Operate E2B sandboxes, manage Gnosis Safes, and execute DeFi operations via natural language.",
  openGraph: {
    title: "Nex-T1 Enterprise Agent",
    description: "Autonomous DeFi Execution & Intelligence.",
    type: "website",
  }
}

export default function NexT1Page() {
  return (
    <NexT1ClientPage 
      header={<LandingHeaderV2 />}
      footer={<SiteFooter className="w-full bg-background border-t border-border" />}
    />
  )
}
