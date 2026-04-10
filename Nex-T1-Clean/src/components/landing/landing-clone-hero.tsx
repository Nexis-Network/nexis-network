"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UnicornScene } from "@/components/landing/unicorn-scene";
import { ClipDefs } from "@/components/landing/clip-defs";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";
import { ArrowRight, Search, Globe, Activity } from "lucide-react";

interface LandingCloneHeroProps {
  onReady?: () => void;
}

const LANDING_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export function LandingCloneHero({ onReady }: LandingCloneHeroProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <section className="relative w-full min-h-dvh flex items-center justify-center overflow-hidden bg-[#0F0F10] p-4 md:p-6">
      {/* 1. Background Layer (Dark) */}
      {/* UnicornScene moved to inner card */}

      <ClipDefs />

      {/* Hero Container */}
      <div className="relative z-10 w-full max-w-[1540px] h-[94vh] min-h-[770px]">
        
        {/* 2. Glass Frame Background (Clipped) */}
        <div 
            className="absolute inset-0 bg-white/0 shadow-2xl overflow-hidden"
            style={{
                clipPath: "url(#heroFrameClip)",
            }}
        >
             <UnicornScene
                className="h-full w-full"
                width="100%"
                height="100%"
            />
            {/* Overlay for glass effect/tint if needed */}
            <div className="absolute inset-0 bg-white/1 pointer-events-none" />
        </div>

        {/* Border Overlay (SVG matching the clip path) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <path 
                d="
                M 0.03,0 
                H 0.132
                Q 0.152,0 0.162,0.02
                L 0.182,0.06
                Q 0.192,0.08 0.212,0.08
                H 0.97
                Q 1,0.08 1,0.11
                V 0.95 
                Q 1,1 0.97,1 
                H 0.35 
                Q 0.33,1 0.32,0.98
                L 0.30,0.94
                Q 0.29,0.92 0.27,0.92
                H 0.03 
                Q 0,0.92 0,0.89 
                V 0.03 
                Q 0,0 0.03,0 
                Z
                "
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                pathLength="1"
            />
        </svg>

        {/* 3. Content Layer (Unclipped & Layered) */}
        <div className="relative z-30 w-full h-full flex flex-col pt-[8vh] pb-[8vh] px-8">
            
            {/* Top Left: Brand Icon & Nav */}
            <div className="absolute top-4 left-8 flex items-center gap-6">
                 {/* Logo */}
                 <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg">
                       <Image
                         src="/logo/nexis-logo-only.svg" 
                         alt="Nex-T1"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                         onError={(e) => {
                            e.currentTarget.style.display = 'none';
                         }}
                       />
                       <span className="text-white font-bold text-lg leading-none hidden">N</span>
                    </div>
                </div>

                {/* Nav Pills - Floating Near Top Left */}
                <nav className="hidden md:flex items-center gap-1 bg-black/20 backdrop-blur-md border border-white/5 rounded-full px-2 py-1.5 shadow-lg">
                    {['Home', 'About', 'Services'].map((item) => (
                        <button key={item} className="px-5 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                            {item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Top Right: Utility + CTA (Sitting in the Tab) */}
            <div className="absolute top-4 right-8 z-40 flex items-center gap-3">
                 <div className="hidden sm:flex items-center gap-2 px-3 py-2">
                    <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <Globe size={16} />
                    </button>
                     <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <Activity size={16} />
                    </button>
                 </div>
                 
                 <Link 
                    href={LANDING_LOGIN_HREF}
                    className="flex items-center gap-2 bg-white text-black font-semibold text-xs rounded-full pl-5 pr-2 py-2 hover:bg-white/90 transition-all shadow-glow"
                 >
                    JOIN NOW
                    <span className="w-7 h-7 bg-black rounded-full flex items-center justify-center text-white">
                        <ArrowRight size={14} />
                    </span>
                 </Link>
            </div>

            {/* Center Stage Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-10">
                 <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white uppercase drop-shadow-2xl">
                    <div>Welcome to the</div>
                    <div>Future of Payments</div>
                 </h1>
                 <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl font-light tracking-wide">
                    Experience seamless transactions and cutting-edge security in the palm of your hand
                 </p>
            </div>

            {/* Bottom Left: Search Pill (Sitting in the Tab) */}
            {/* Note: In the clip path, the tab is at the very bottom. */}
            <div className="absolute bottom-4 left-8 hidden md:flex items-center gap-3 z-40">
                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 rounded-full pl-4 pr-2 py-2 w-[340px] text-white/50 text-sm hover:border-white/20 transition-colors shadow-lg">
                    <Search size={18} />
                    <span className="flex-1 truncate">Experience seamless transactions...</span>
                    <button className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <ArrowRight size={14} className="-rotate-45" />
                    </button>
                </div>
            </div>

            {/* Bottom Center: Terms */}
            {/* Adjusted position to sit above the bottom edge */}
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                 <button className="hover:text-white transition-colors">Privacy</button>
                 <span className="w-px h-3 bg-white/10" />
                 <button className="hover:text-white transition-colors">Terms</button>
                 <button className="ml-2 w-4 h-4 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">+</button>
            </div>

            {/* Bottom Right: Widget Card */}
            <div className="absolute bottom-[10%] right-8 hidden md:block">
                <div className="w-[280px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-white/90">Join the Revolution</span>
                        <div className="flex -space-x-2">
                             <div className="w-6 h-6 rounded-full bg-blue-500 border border-[#1C1C1C]" />
                             <div className="w-6 h-6 rounded-full bg-indigo-500 border border-[#1C1C1C] flex items-center justify-center text-[8px] text-white font-bold">+1</div>
                        </div>
                    </div>
                    
                    <div className="relative h-24 w-full flex items-center justify-center my-2">
                        {/* Ring Visual Mockup */}
                        <div className="w-20 h-20 rounded-full border-[3px] border-white/5 border-t-white/80 border-r-white/40 rotate-45" />
                        <div className="absolute text-blue-400 text-sm font-bold">95%</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-[10px] leading-tight text-white/40">
                            Step into the future of finance with NeonCard.
                        </p>
                        <button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] uppercase font-bold px-4 py-2 rounded-full transition-colors">
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </section>
  );
}
