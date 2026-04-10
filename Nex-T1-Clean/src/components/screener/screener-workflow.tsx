"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageSquare, Cpu, TrendingUp } from "lucide-react";

export function ScreenerWorkflow() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
            gsap.fromTo(".workflow-step",
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    stagger: 0.2,
                    duration: 0.8,
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

    const steps = [
        {
            icon: <MessageSquare className="w-6 h-6 text-white" />,
            title: "1. Ask",
            desc: "Simply type what you're looking for. 'Find high volume AI tokens on Solana under $50m mcap.'"
        },
        {
            icon: <Cpu className="w-6 h-6 text-[#00D5FF]" />,
            title: "2. Analyze",
            desc: "Nexis AI scans millions of data points across 8+ chains, filtering noise and verifying contracts."
        },
        {
            icon: <TrendingUp className="w-6 h-6 text-[#ADE25D]" />,
            title: "3. Discover",
            desc: "Get an instant, actionable list of tokens matching your exact criteria with real-time stats."
        }
    ];

    return (
        <section ref={containerRef} className="w-full py-24 bg-[#0f0f10] relative overflow-hidden">
             {/* Animated Data Flow Connector (Desktop) */}
            <div className="absolute top-[40%] left-0 w-full hidden md:block z-0 pointer-events-none opacity-30">
                <svg width="100%" height="100" viewBox="0 0 1200 100" preserveAspectRatio="none">
                     <path 
                        d="M0,50 L1200,50" 
                        stroke="url(#flowGradient)" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeDasharray="10 10" 
                        className="animate-flow-line"
                    />
                    <defs>
                        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="20%" stopColor="#00D5FF" stopOpacity="0.5" />
                            <stop offset="50%" stopColor="#3773FF" stopOpacity="1" />
                            <stop offset="80%" stopColor="#00D5FF" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="max-w-[1200px] mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                    {steps.map((step, i) => (
                        <div key={i} className="workflow-step flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-[#151516] border border-white/10 flex items-center justify-center shadow-2xl relative group hover:border-[#00D5FF]/30 transition-colors duration-500">
                                <div className="absolute inset-0 bg-[#00D5FF]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                {/* Icon Pulse */}
                                <div className="absolute inset-0 rounded-2xl bg-[#00D5FF]/20 animate-ping opacity-0 group-hover:opacity-20" />
                                {step.icon}
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                                <p className="text-sm text-white/50 leading-relaxed max-w-[300px] mx-auto">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
