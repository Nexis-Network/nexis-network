"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function CtaSection() {
    return (
        <section className="w-full min-h-screen py-16 sm:py-24 md:py-32 bg-[#000000] relative overflow-hidden flex items-center justify-center">
            {/* Minimalist Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
              style={{ 
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
                backgroundSize: '80px 80px' 
              }} 
            />
            
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />

            <ScrollReveal className="container relative mx-auto px-6 z-10">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-12">
                    
                    {/* Label */}
                    <div className="flex items-center gap-2">
                        <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">[</span>
                        <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">Public Beta</span>
                        <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">]</span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-sans font-normal tracking-[-1.5px] text-white leading-[1.05]">
                        DeFi at the <br />
                        <span className="text-[#7D8187]">Speed of Thought.</span>
                    </h2>

                    <p className="text-[18px] text-[#7D8187] font-sans max-w-2xl mx-auto leading-[28px]">
                        Stop fighting the UI. Start winning the trade. Experience the first autonomous agent that executes with cryptographic proofs.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
                        <Link
                            href="/dashboard"
                            className="box-border flex flex-row justify-center items-center px-6 py-2 h-[44px] border border-white/25 rounded-full mix-blend-normal hover:bg-white/10 transition-colors font-mono text-[14px] leading-[20px] tracking-[1.4px] uppercase text-white font-normal group"
                        >
                            Start Trading <ArrowUpRight className="w-3 h-3 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>

                        <Link
                            href="/docs"
                            className="box-border flex flex-row justify-center items-center px-6 py-2 h-[44px] rounded-full bg-[#D9D9D9] text-[#080808] hover:bg-[#d9d9d9]/80 transition-colors font-mono text-[14px] leading-[20px] tracking-[1.4px] uppercase font-normal"
                        >
                            Read Docs
                        </Link>
                    </div>
                </div>
            </ScrollReveal>
        </section>
    );
}
