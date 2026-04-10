import React from 'react';
import { GlassButton } from './GlassButton';

export function HeroSection() {
  return (
    <section className="px-4 pt-[170px] pb-0 text-center md:px-6 md:pt-40 md:pb-20">
      <div className="mx-auto">
        <div className="mb-6 flex justify-center opacity-100 transition-opacity animate-in fade-in duration-1000 ease-out">
          <GlassButton variant="announcement" href="#">
            Announcing our $20m Pre-Seed
          </GlassButton>
        </div>
        
        <h1 className="mb-[30px] text-[36px] leading-[38px] font-normal tracking-[-0.03em] text-[#191919] opacity-100 md:mb-[45px] md:text-[58px] md:leading-[64px] animate-in slide-in-from-bottom-3 fade-in duration-1000 ease-out delay-150">
          Create, discover, and remix<br className="max-sm:hidden" /> any mini-app in minutes
        </h1>
        
        <div className="mt-5 hidden flex-col items-center justify-center sm:flex animate-in slide-in-from-bottom-2 fade-in duration-1000 ease-out delay-300">
          <GlassButton variant="cta" href="#">
            Get started
          </GlassButton>
        </div>

        {/* Hero Carousel Concept - Based on Figma */}
        <div className="mx-auto mt-6 w-full max-w-[300px] sm:max-w-md md:mt-12 md:max-w-2xl lg:mt-16 lg:max-w-4xl">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-visible sm:max-w-md md:max-w-[420px] lg:max-w-[400px]">
            {/* Background elements to represent cards, since local assets are not 100% available */}
            
            {/* Left Back Card */}
            <div className="absolute top-[8%] left-[-15%] w-full h-full rounded-[24px] bg-[#2a2a2a] shadow-xl origin-bottom-left -rotate-[6deg] scale-[0.85] opacity-90 transition-transform hover:scale-[0.88]">
                <div className="w-full h-full rounded-[24px] overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/30 to-amber-700/80 mix-blend-overlay"></div>
                </div>
            </div>
            
            {/* Right Back Card */}
            <div className="absolute top-[8%] right-[-15%] w-full h-full rounded-[24px] bg-[#111111] shadow-xl origin-bottom-right rotate-[6deg] scale-[0.85] opacity-90 transition-transform hover:scale-[0.88]">
                <div className="w-full h-full rounded-[24px] overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/50 to-neutral-900/80 mix-blend-overlay"></div>
                </div>
            </div>

            {/* Front Center Card - Painting Representation */}
            <div className="absolute top-0 left-0 w-full h-full rounded-[24px] bg-[#d3dce1] shadow-2xl z-10 transition-transform hover:scale-[1.02]">
              <div className="w-full h-full rounded-[24px] overflow-hidden relative border-[1px] border-white/20">
                {/* Fallback to simple gradient representing the painted art poster */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#6b8b93] via-[#b6c6b4] to-[#455c42]"></div>
                {/* Simulated content structure based on the image */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-[4px] h-[4px] rounded-full bg-[#191919]"></div>
            <div className="w-[4px] h-[4px] rounded-full bg-[#191919]/20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
