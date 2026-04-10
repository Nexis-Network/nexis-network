"use client";

import { useCallback } from "react";

import { LandingHeader } from "@/components/landing/landing-header";
import { HeroVideo } from "@/components/landing/hero-video";
import { LockImageSection } from "@/components/landing/sections/lock-image-section";
import { Web3LogoMarquee } from "@/components/landing/web3-logo-marquee";
import { ProductsSection } from "@/components/landing/sections/products-section";
import { CtaSection } from "@/components/landing/sections/cta-section";
import { InstantDeployment } from "@/components/landing/sections/instant-deployment";
import AiIndex from "components/pages/home/ai-index/ai-index";

export function LandingRoot() {
  const handleHeroReady = useCallback(() => {}, []);

  return (
    <main className="relative w-full bg-[#000000]">
      <LandingHeader layout="hero" />

      {/* Video Hero */}
      <HeroVideo onReady={handleHeroReady} />

      {/* Web3 Logos Marquee */}
      <Web3LogoMarquee />

      {/* Scrollable Content */}
      <div className="relative z-10 pointer-events-auto">
        <ProductsSection />
        <InstantDeployment />
        <AiIndex />
        <CtaSection />
        <LockImageSection />
      </div>
    </main>
  );
}
