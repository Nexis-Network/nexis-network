import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

import { LandingHeaderV2 } from "@/components/landing/landing-header-v2";
import { LandingV2Hero } from "@/components/landing/landing-v2-hero";
import { LandingV3JsonLd } from "@/components/seo/landing-v3-json-ld";
import { SeoHiddenContent } from "@/components/seo/seo-hidden-content";

const LandingV2Ticker = dynamic(() => import("@/components/landing/landing-v2-ticker").then((mod) => mod.LandingV2Ticker));
const LandingV2Features = dynamic(() => import("@/components/landing/landing-v2-features").then((mod) => mod.LandingV2Features));
const LandingV2FAQ = dynamic(() => import("@/components/landing/landing-v2-faq").then((mod) => mod.LandingV2FAQ));
const LandingV2Leverage = dynamic(() => import("@/components/landing/landing-v2-leverage").then((mod) => mod.LandingV2Leverage));
const LandingV2Languages = dynamic(() => import("@/components/landing/landing-v2-languages").then((mod) => mod.LandingV2Languages));
const LandingV2SplineBuy = dynamic(() => import("@/components/landing/landing-v2-spline-buy").then((mod) => mod.LandingV2SplineBuy));
const SiteFooter = dynamic(() => import("@/components/marketing/site-footer").then((mod) => mod.SiteFooter));

const belowFoldStyle = (blockSize: number): CSSProperties => ({
  contentVisibility: "auto",
  containIntrinsicSize: `1px ${blockSize}px`,
});

export function LandingV3Root() {
  return (
    <main className="relative flex w-full flex-col items-center overflow-x-clip bg-[#0f0f10]">
      <LandingV3JsonLd />
      <SeoHiddenContent />

      <div className="relative z-50 w-full">
        <LandingHeaderV2 />
      </div>

      <div className="flex w-full flex-col items-center">
        <section id="landing-v3-hero" className="contents">
          <LandingV2Hero />
        </section>

        <div style={belowFoldStyle(220)} className="w-full">
          <section id="landing-v3-ticker" className="contents">
            <LandingV2Ticker />
          </section>
        </div>

        <div style={belowFoldStyle(1200)} className="w-full">
          <section id="landing-v3-features" className="contents">
            <LandingV2Features />
          </section>
        </div>

        <div style={belowFoldStyle(920)} className="w-full">
          <section id="landing-v3-faq" className="contents">
            <LandingV2FAQ />
          </section>
        </div>

        <div style={belowFoldStyle(920)} className="w-full">
          <section id="landing-v3-leverage" className="contents">
            <LandingV2Leverage />
          </section>
        </div>

        <div style={belowFoldStyle(780)} className="w-full">
          <section id="landing-v3-languages" className="contents">
            <LandingV2Languages />
          </section>
        </div>

        <div style={belowFoldStyle(1120)} className="w-full">
          <section id="landing-v3-buy" className="contents">
            <LandingV2SplineBuy />
          </section>
        </div>

        <div style={belowFoldStyle(560)} className="w-full">
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
