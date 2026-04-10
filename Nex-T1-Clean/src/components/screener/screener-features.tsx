"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { 
    Cpu, 
    Globe, 
    Zap, 
    ShieldCheck, 
    Smartphone
} from "lucide-react";

const FEATURES = [
    {
        title: "Natural Language",
        desc: "No complex filters. Just ask 'Find AI tokens on Base under $10m mcap' and get results.",
        icon: <Cpu className="w-6 h-6 text-[#00D5FF]" />,
        className: "md:col-span-2 md:row-span-2", // Large Featured Card
    },
    {
        title: "Multi-Chain",
        desc: "Live data from Solana, Ethereum, Base, Arbitrum, and 5+ others simultaneously.",
        icon: <Globe className="w-6 h-6 text-[#3773FF]" />,
        className: "md:col-span-1 md:row-span-1",
    },
    {
        title: "Real-Time Feeds",
        desc: "Milliseconds matter. Get updates as they happen on-chain.",
        icon: <Zap className="w-6 h-6 text-[#ADE25D]" />,
        className: "md:col-span-1 md:row-span-1",
    },
    {
        title: "Rug Detection",
        desc: "Auto-scan contracts for honey-pots, mint rights, and suspicious liquidity.",
        icon: <ShieldCheck className="w-6 h-6 text-red-400" />,
        className: "md:col-span-1 md:row-span-2", // Tall Card
    },
    {
        title: "Mobile Optimized",
        desc: "Full screening power in your pocket. Swipe to scan.",
        icon: <Smartphone className="w-6 h-6 text-purple-400" />,
        className: "md:col-span-2 md:row-span-1", // Wide Card
    }
];

export function ScreenerFeatures() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        
        const ctx = gsap.context(() => {
            gsap.fromTo(".bento-card", 
                { opacity: 0, y: 30, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    stagger: 0.1,
                    duration: 0.8,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: "top 75%",
                    }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="w-full py-24 bg-[#0f0f10] relative">
            <div className="max-w-[1200px] mx-auto px-6 md:px-12">
                
                <div className="text-center mb-16 space-y-4">
                     <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
                        Built for the <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D5FF] to-[#3773FF]">Modern Trader</span>
                    </h2>
                    <p className="text-white/40 max-w-xl mx-auto">
                        A complete suite of institutional-grade tools, accessible to everyone.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-3 gap-4 h-auto md:h-[600px]">
                    {FEATURES.map((feat, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "bento-card group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 overflow-hidden transition-colors duration-500 flex flex-col justify-between",
                                feat.className
                            )}
                        >
                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            {/* Noise Texture opacity */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]" 
                                style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} 
                            />

                            <div className="relative z-10 w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                {feat.icon}
                            </div>
                            
                            <div className="relative z-10 space-y-2">
                                <h3 className="text-xl font-medium text-white">{feat.title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed">
                                    {feat.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
