"use client";

import { useEffect, useRef, Suspense } from "react";
import dynamic from 'next/dynamic';

const SplineScene = dynamic(
  () => import('@/components/ui/spline-scene').catch((e) => {
    logger.error("Spline load failed:", e);
    return () => null;
  }), 
  { ssr: false }
);

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LightRays } from "@/components/ui/light-rays";
import { HeroBgOverlay } from "./hero-bg-overlay";


import { logger } from '@/lib/logger';
export function ScreenerHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftTextRef = useRef<HTMLDivElement>(null);
  const rightTextRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
        // Left Text Entrance ("Screen")
        gsap.fromTo(leftTextRef.current, 
            { x: -100, opacity: 0 },
            { 
                x: 0, 
                opacity: 1, 
                duration: 1.5, 
                ease: "power3.out" 
            }
        );

        // Right Text Entrance ("Analyze")
        gsap.fromTo(rightTextRef.current, 
            { x: 100, opacity: 0 },
            { 
                x: 0, 
                opacity: 1, 
                duration: 1.5, 
                ease: "power3.out",
                delay: 0.2
            }
        );

         // Spline Scene Entrance
         gsap.fromTo(mockupRef.current,
            { opacity: 0, scale: 0.8 },
            { 
                opacity: 1, 
                scale: 1,
                duration: 2, 
                ease: "power3.out",
                delay: 0.1
            }
        );

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col justify-center items-center overflow-hidden bg-[#0a0a0a] pt-32 pb-20"
    >
       {/* Light Rays */}
       <div className="absolute inset-0 z-0 pointer-events-none">
          <LightRays 
            color="rgba(56, 189, 248, 0.2)" // Sky blue tint
            speed={2}
            count={6}
            className="opacity-50"
          />
       </div>

       {/* Custom SVG Background Overlay */}
       <div className="absolute inset-0 flex items-center justify-center opacity-60 z-0 pointer-events-none">
          <HeroBgOverlay className="w-[150%] h-auto md:w-full max-w-[1400px]" />
       </div>

       {/* Background Noise/Gradient */}
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />
       
       <div className="container relative z-10 w-full h-full flex flex-col justify-between min-h-[600px] px-6 md:px-12">
           
           {/* Top Left: Massive Typography */}
           <div ref={leftTextRef} className="flex flex-col items-start z-20 pointer-events-none mix-blend-difference">
               <h1 className="font-sans font-normal text-[80px] md:text-[132px] leading-[0.9] -tracking-[0.04em] text-white">
                   Screen
               </h1>
               <p className="text-xl md:text-2xl text-[#c4c4c4] mt-4 ml-2">Everything.</p>
           </div>



           {/* Central Spline Scene */}
           <div 
             ref={mockupRef} 
             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-[600px] md:h-[800px] opacity-0 z-10"
             onWheelCapture={(e) => {
               // Stop wheel events from reaching the Spline canvas to prevent zoom/scroll locking
               e.stopPropagation();
             }}
           >
               <ErrorBoundary fallback={
                   <div className="w-full h-full bg-gradient-to-br from-sky-500/10 to-transparent rounded-full blur-[120px] opacity-40 mix-blend-screen animate-pulse" />
               }>
                   <Suspense fallback={null}>
                       <SplineScene
                         scene="/assets/scene.splinecode"
                         className="w-full h-full" 
                       />
                   </Suspense>
               </ErrorBoundary>
           </div>

           {/* Bottom Right: Massive Typography */}
           <div ref={rightTextRef} className="flex flex-col items-end mt-20 md:mt-0 z-20 pointer-events-none mix-blend-difference">
               <h1 className="font-sans font-normal text-[80px] md:text-[132px] leading-[0.9] -tracking-[0.04em] text-white text-right">
                   Analyze
               </h1>
               <p className="text-xl md:text-2xl text-[#c4c4c4] mt-4 mr-2 text-right">Anything.</p>
               
               {/* CTA Buttons aligned with bottom text - Enable pointer events */}
               <div className="flex items-center gap-6 mt-12 pointer-events-auto">
                   <Link href="/screener" className="group flex items-center gap-2 text-white/80 hover:text-sky-500 transition-colors">
                       <span className="text-sm font-medium tracking-wide">OPEN TERMINAL</span>
                       <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                   </Link>
                   <Link href="/docs" className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                       <span className="text-sm font-medium tracking-wide">READ DOCS</span>
                       <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                   </Link>
               </div>
           </div>

       </div>

       {/* Floating "Scroll" Indicator */}
       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce z-10">
           <div className="w-[1px] h-12 bg-white" />
           <span className="text-[10px] uppercase tracking-widest text-white">Scroll</span>
       </div>
    </section>
  );
}
