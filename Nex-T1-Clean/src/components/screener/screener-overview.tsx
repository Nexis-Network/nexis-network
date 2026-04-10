"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ScreenerOverview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Vertical Divider Growth
      gsap.fromTo(dividerRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            end: "bottom bottom",
            scrub: true
          }
        }
      );

      // Fade-in Stagger for Text
      gsap.fromTo(".overview-text-reveal",
        { y: 30, opacity: 0 },
        { 
            y: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
                 trigger: textRef.current,
                 start: "top 70%"
            }
        }
      );

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full py-40 md:py-60 bg-[#0f0f10] overflow-hidden text-white">
        <div className="container mx-auto px-6 md:px-12 relative flex gap-12 lg:gap-24">
            
            {/* Left Column: Vertical Divider & Decorative Elements */}
            <div className="hidden md:flex flex-col items-center shrink-0 w-[1px] relative">
                 <div className="w-[1px] h-full absolute top-0 bg-white/10" />
                 <div ref={dividerRef} className="w-[1px] h-[120vh] bg-sky-500 origin-top absolute top-0" />
            </div>

            {/* Main Content Area */}
            <div ref={textRef} className="flex-1 flex flex-col gap-16 md:gap-24 pt-12 md:pt-0">
                
                {/* Heading Block */}
                <div className="max-w-4xl">
                    <h2 className="overview-text-reveal text-[36px] md:text-[46.8px] leading-[1.2] font-normal tracking-tight">
                        Nexis redefines how the <br /> 
                        <span className="text-white/50">market finds alpha.</span>
                    </h2>
                </div>

                {/* Content Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 relative">
                     {/* Decorative Margin Line for mobile matching Arcium */}
                     <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[1px] bg-white/10 -ml-12" />

                     {/* Left Text Block */}
                     <div className="overview-text-reveal flex flex-col gap-6">
                         <p className="text-[14.8px] leading-[22px] text-white/70">
                             Data is the crypto market&apos;s most valuable but also most overwhelming resource. 
                             It powers every trade, narrative, and movement.
                         </p>
                         <p className="text-[14.8px] leading-[22px] text-white/70">
                             Until now, finding signal meant manual screening, endless noise, and delayed reactions.
                             Most traders act on information only after it has already been priced in.
                         </p>
                     </div>

                     {/* Right Text Block */}
                     <div className="overview-text-reveal flex flex-col gap-6">
                         <p className="text-[14.8px] leading-[22px] text-white/70">
                             Nexis AI changes this paradigm. By leveraging autonomous agents and decentralized compute,
                             we index the entire chain state in real-time.
                         </p>
                         <p className="text-[14.8px] leading-[22px] text-white/70">
                             This allows you to query the market like a supercomputer. 
                             <span className="text-sky-500"> Understand the narrative before it forms.</span>
                         </p>
                     </div>
                </div>

            </div>
        </div>
    </section>
  );
}
