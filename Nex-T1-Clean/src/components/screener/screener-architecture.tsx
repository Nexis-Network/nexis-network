"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Database, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { EconomyCard } from "./economy-card";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    id: "01",
    title: "AI Analysis",
    description: "Autonomous agents scan millions of data points across social, on-chain, and price action to identify patterns invisible to the human eye.",
    icon: Brain,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20"
  },
  {
    id: "02",
    title: "Deep Liquidity",
    description: "Real-time auditing of liquidity pools across Solana, Base, and Ethereum to detect wash-trading and verify true depth.",
    icon: Database,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20"
  },
  {
    id: "03",
    title: "Risk Engine",
    description: "Automated contract audits and rug-pull detection simulation before you even think about entering a trade.",
    icon: Shield,
    color: "text-[#8eb94f]",
    bg: "bg-[#8eb94f]/10",
    border: "border-emerald-500/20"
  }
];

export function ScreenerArchitecture() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Pin the Left Column
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      pin: leftRef.current,
      // markers: true, // debug
    });

    // 2. Active State Toggling based on Right Column sections
    const cards = document.querySelectorAll(".feature-card");
    const navItems = document.querySelectorAll(".nav-item");

    cards.forEach((card, index) => {
        ScrollTrigger.create({
            trigger: card,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => {
                if (self.isActive) {
                    // Activate Nav Item
                    navItems.forEach((nav, i) => {
                        if (i === index) {
                            nav.classList.add("text-white", "opacity-100");
                            nav.classList.remove("text-white/40", "opacity-40");
                            // Add active border visual if needed
                        } else {
                            nav.classList.remove("text-white", "opacity-100");
                            nav.classList.add("text-white/40", "opacity-40");
                        }
                    });
                }
            }
        });
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    }
  }, []);

  return (
    <section ref={containerRef} className="relative w-full bg-[#0f0f10] text-white py-24 md:py-40">
      <div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-12 lg:gap-24">
        
        {/* Left Column: Sticky Navigation (Arcium Style) */}
        <div ref={leftRef} className="hidden md:flex flex-col justify-center h-screen max-h-[600px] w-1/3 sticky top-24 pt-12">
            <h3 className="text-[46px] leading-[1.1] font-normal mb-16 max-w-xs">
                Powerful features of the Nexis Network
            </h3>

            <div className="flex flex-col gap-6 border-t border-white/10 pt-12">
                {FEATURES.map((feat, i) => (
                    <div key={i} className="nav-item flex items-center gap-6 text-white/40 opacity-40 transition-all duration-500 cursor-pointer text-3xl font-light">
                        <span className="text-xl font-mono tracking-wider">{feat.id}</span>
                        <span>{feat.title}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Column: Scrolling Cards */}
        <div ref={rightRef} className="flex-1 flex flex-col gap-[20vh] pb-[20vh] pt-[10vh]">
            {FEATURES.map((feat, i) => (
                <div key={i} className="feature-card min-h-[50vh] flex flex-col justify-center">
                    {/* Visual Card */}
                    {feat.id === "02" ? (
                        <div className="w-full aspect-[4/3] mb-12">
                             <EconomyCard />
                        </div>
                    ) : feat.id === "01" ? (
                        <div className="w-full aspect-[4/3] rounded-3xl relative overflow-hidden mb-12 group transition-all">
                             <Image 
                                src="/assets/ai-analysis-2.jpg" 
                                alt="AI Analysis" 
                                fill 
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                             />
                        </div>
                    ) : (
                        <div className={cn("w-full aspect-[4/3] rounded-3xl border flex items-center justify-center relative overflow-hidden mb-12 group", feat.border, feat.bg)}>
                              <div className={cn("absolute inset-0 bg-gradient-to-br from-transparent to-black/50 opacity-50")} />
                              {/* Large Icon */}
                              <feat.icon className={cn("w-32 h-32 relative z-10 transition-transform duration-700 group-hover:scale-110", feat.color)} strokeWidth={1} />
                              
                              {/* Decorative Grid or Particles */}
                              <div className="absolute inset-0 opacity-20" 
                                   style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
                              />
                        </div>
                    )}

                    {/* Mobile Title (Since Sticky Nav is hidden on mobile) */}
                    <div className="md:hidden flex items-center gap-4 mb-4 text-white/50 font-mono text-sm">
                        <span>{feat.id}</span>
                        <div className="h-[1px] w-8 bg-white/20" />
                        <span>{feat.title}</span>
                    </div>

                    <h4 className="text-3xl md:text-5xl font-light leading-tight mb-6">
                        {feat.title}
                    </h4>
                    <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-lg">
                        {feat.description}
                    </p>
                </div>
            ))}
        </div>

      </div>
    </section>
  );
}
