"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function ScreenerCTA() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        // Simple fade in
        gsap.fromTo(containerRef.current,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                }
            }
        );
    }, []);

    return (
        <section ref={containerRef} className="w-full py-32 bg-[#0f0f10] relative overflow-hidden">
             {/* Background Glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#00D5FF] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[800px] mx-auto px-6 text-center relative z-10 flex flex-col items-center gap-8">
                <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
                    Stop Searching.<br />
                    <span className="text-white/40">Start Finding.</span>
                </h2>
                <p className="text-lg text-white/50 max-w-lg">
                    Join thousands of traders using Nexis AI to uncover opportunities before the market moves.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
                    <Button 
                        size="lg" 
                        className="h-12 px-8 bg-white text-black hover:bg-white/90 rounded-full font-medium text-base"
                    >
                        Start Mobile Screening
                    </Button>
                     <Button 
                        size="lg" 
                        variant="outline"
                        className="h-12 px-8 border-white/10 text-white hover:bg-white/5 hover:text-white rounded-full font-medium text-base gap-2 group"
                    >
                        View Demo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
