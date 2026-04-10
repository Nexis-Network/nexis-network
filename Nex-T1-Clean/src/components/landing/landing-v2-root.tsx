import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { LandingV2Hero } from "@/components/landing/landing-v2-hero";

import { LandingV2JsonLd } from "@/components/seo/seo-json-ld";
import { SeoHiddenContent } from "@/components/seo/seo-hidden-content";

// Dynamically import heavy below-the-fold components
const LandingV2Features = dynamic(() => import("@/components/landing/landing-v2-features").then(mod => mod.LandingV2Features));
const LandingV2SplineBuy = dynamic(() => import("@/components/landing/landing-v2-spline-buy").then(mod => mod.LandingV2SplineBuy));
const LandingV2Ticker = dynamic(() => import("@/components/landing/landing-v2-ticker").then(mod => mod.LandingV2Ticker));
const IntegrationsSection = dynamic(() => import("@/components/landing/integrations-6"));
const LandingV2FAQ = dynamic(() => import("@/components/landing/landing-v2-faq").then(mod => mod.LandingV2FAQ));

const LandingV2Languages = dynamic(() => import("@/components/landing/landing-v2-languages").then(mod => mod.LandingV2Languages));
const SiteFooter = dynamic(() => import("@/components/marketing/site-footer").then(mod => mod.SiteFooter));

const belowFoldStyle = (blockSize: number): CSSProperties => ({
  contentVisibility: "auto",
  containIntrinsicSize: `1px ${blockSize}px`,
});

export function LandingV2Root() {
  return (
    <main className="relative w-full flex flex-col items-center overflow-x-clip bg-[#0f0f10]">
      {/* SEO Smart Pixels - JSON-LD Structured Data */}
      <LandingV2JsonLd />
      {/* SEO Hidden Content for Search Engines */}
      <SeoHiddenContent />
      
      <div className="w-full relative z-50">
         <LandingHeaderV2 />
      </div>
      
      <div className="w-full flex flex-col items-center">
          <section id="landing-hero" className="contents">
            <LandingV2Hero />
          </section>

          <div style={belowFoldStyle(220)} className="w-full">
            <section id="landing-ticker" className="contents">
              <LandingV2Ticker />
            </section>
          </div>

          <div style={belowFoldStyle(1200)} className="w-full">
            <section id="landing-features" className="contents">
              <LandingV2Features />
            </section>
          </div>

          <div style={belowFoldStyle(900)} className="w-full">
            <section id="landing-faq" className="contents">
              <LandingV2FAQ />
            </section>
          </div>

          <div style={belowFoldStyle(900)} className="w-full">
            <section id="landing-leverage" className="contents">
              <IntegrationsSection />
            </section>
          </div>

          <div style={belowFoldStyle(760)} className="w-full">
            <section id="landing-languages" className="contents">
              <LandingV2Languages />
            </section>
          </div>

          <div style={belowFoldStyle(1100)} className="w-full">
            <section id="landing-buy" className="contents">
              <LandingV2SplineBuy />
            </section>
          </div>

          <div style={belowFoldStyle(520)} className="w-full">
            <SiteFooter />
          </div>
        </div>
    </main>
  );
}

// Force HMR refresh
