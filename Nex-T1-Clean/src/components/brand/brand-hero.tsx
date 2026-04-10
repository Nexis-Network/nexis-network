"use client";

import { TextShimmer } from "@/components/chat-composer/text-shimmer";

export function BrandHero() {
  return (
    <div className="mx-12 mt-[60px] px-4 w-full max-w-[1400px]">
      <section 
        className="relative flex flex-col items-center pt-[80px] pb-24 isolate bg-white w-full overflow-hidden rounded-t-3xl shadow-2xl shadow-black/50"
        style={{ minHeight: "600px" }}
      >
        
        {/* Background Ambience - subtle glow adapted for light mode */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-sky-200/40 blur-[120px] rounded-full opacity-60 pointer-events-none mix-blend-multiply" />

        <div className="relative z-10 flex flex-col items-center max-w-4xl text-center gap-8">
          
          {/* Pill Tag */}
          <div className="flex items-center justify-center">
              <div className="px-4 py-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 backdrop-blur-md">
                  <TextShimmer className="font-mono text-xs font-medium uppercase tracking-widest [--base-color:#0EA5E9] [--base-gradient-color:#000000]">
                      Design System v2.0
                  </TextShimmer>
              </div>
          </div>

          {/* Main Title - Adapted for Light Mode */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-[#0F0F10] leading-[1.1]">
              Build with <br />
              <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,#0EA5E9_0%,#38BDF8_50%,#7DD3FC_100%)]">
                  Precision.
              </span>
          </h1>

          {/* Subtitle - Adapted for Light Mode */}
          <p className="text-lg md:text-xl text-[#0F0F10]/60 max-w-2xl font-light leading-relaxed">
              The official resource for Nexis Network brand assets. <br className="hidden md:block" />
              Access logos, colors, and typography to build consistent experiences.
          </p>

        </div>
        
        {/* Bottom Graphic / Shape from LandingV2 (Simulated/Simplified) */}
         <div className="absolute left-0 right-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      </section>
    </div>
  );
}
