"use client";

import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Skiper95 } from "@/components/ui/scrollbar-new";
import { ScreenerHero } from "./screener-hero";


import { ScreenerLogoCloud } from "./screener-logo-cloud";
import { ScreenerOverview } from "./screener-overview";
import { ScreenerArchitecture } from "./screener-architecture";
import { ScreenerWorkflow } from "./screener-workflow";
import { ScreenerFeatures } from "./screener-features";
import { ScreenerComparison } from "./screener-comparison";
import { ScreenerCTA } from "./screener-cta";

export function ScreenerRoot() {
  return (
    <main className="relative w-full flex flex-col items-center overflow-x-clip bg-[#0f0f10]">
      {/* Global Noise Texture */}
      <div className="fixed inset-0 z-[60] pointer-events-none opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} 
      />
      
      <div className="w-full relative z-50">
         <LandingHeaderV2 />
      </div>
      
      <Skiper95>
        <div className="w-full flex flex-col items-center">
            <ScreenerHero />
            <ScreenerLogoCloud />
            <ScreenerOverview />
            <ScreenerArchitecture />
            <ScreenerWorkflow />
            <ScreenerFeatures />
            <ScreenerComparison />
            <ScreenerCTA />
            <SiteFooter />
        </div>
      </Skiper95>
    </main>
  );
}
