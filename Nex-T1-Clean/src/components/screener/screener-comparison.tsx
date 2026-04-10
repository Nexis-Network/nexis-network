"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X } from "lucide-react";

const COMPARISON_FEATURES = [
    { title: "Query Method", old: "Complex Filters / Coding", new: "Natural Language" },
    { title: "Data Source", old: "Single Chain / Limited", new: "Multi-Chain Real-Time" },
    { title: "Update Speed", old: "Manual Refresh", new: "Instant / Live Streams" },
    { title: "Insight Level", old: "Raw Metrics", new: "AI Sentiment & Analysis" },
    { title: "Accessibility", old: "Desktop Only", new: "Mobile Optimized" },
];

export function ScreenerComparison() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        
        const ctx = gsap.context(() => {
            gsap.fromTo(".comparison-row",
                { opacity: 0, scale: 0.95 },
                {
                    opacity: 1,
                    scale: 1,
                    stagger: 0.1,
                    duration: 0.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: "top 70%",
                    }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="w-full py-24 bg-[#0f0f10]">
            <div className="max-w-[1000px] mx-auto px-6 md:px-12 flex flex-col gap-16">
                
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                        Evolution of Screening
                    </h2>
                    <p className="text-white/40 max-w-lg mx-auto">
                        Stop fighting with complex dashboards. Start asking questions.
                    </p>
                </div>

                <div className="w-full relative group p-[1px] rounded-2xl overflow-hidden">
                    {/* Radar Scan Border Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00D5FF]/50 to-transparent translate-x-[-100%] animate-scan-slow opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="absolute inset-0 border border-white/5 rounded-2xl" />

                    <div className="relative bg-[#0f0f10] rounded-2xl overflow-hidden">
                         {/* Header */}
                        <div className="grid grid-cols-[1.5fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr] px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="text-xs uppercase tracking-widest font-semibold text-white/30">Feature</div>
                            <div className="text-center text-xs uppercase tracking-widest font-semibold text-white/30">Traditional</div>
                            <div className="text-center text-xs uppercase tracking-widest font-semibold text-[#00D5FF]">Nexis AI</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5">
                            {COMPARISON_FEATURES.map((feat, i) => (
                                <div key={i} className="comparison-row grid grid-cols-[1.5fr_1fr_1fr] md:grid-cols-[2fr_1fr_1fr] px-8 py-5 items-center hover:bg-white/[0.02] transition-colors group/row">
                                    <div className="text-sm text-white font-medium group-hover/row:text-[#00D5FF] transition-colors">{feat.title}</div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                             <X className="w-4 h-4 text-red-500/50" />
                                        </div>
                                        <span className="text-xs text-white/20 text-center hidden md:block">{feat.old}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#00D5FF]/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,213,255,0.2)]">
                                            <Check className="w-4 h-4 text-[#00D5FF]" />
                                        </div>
                                        <span className="text-xs text-white/60 text-center hidden md:block font-medium">{feat.new}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
