"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useIsInView } from "@/lib/hooks/ui/use-is-in-view";


type FeatureCardProps = {
  width: string; // e.g., "314.67px"
  height: string; // e.g., "274.18px"
  imagePlaceholderColor?: string;
  title: string;
  description: string;
  imageUrl?: string;
  className?: string;
  imageClassName?: string;
  imageAlignment?: string;
};

const FeatureCard = ({ width, height, imagePlaceholderColor = "#1f1f20", title, description, imageUrl, className, imageClassName, imageAlignment = "object-left-top" }: FeatureCardProps) => {
  return (
    <div 
        className={`flex flex-col justify-between items-start p-0 gap-[50.3px] bg-[#1f1f20] backdrop-blur-lg border border-[rgba(196,196,196,0.1)] rounded-[30px] overflow-hidden ${className || ""}`}
        style={{ width, height }}
    >
        {/* Image Placeholder */}
        {imageUrl ? (
           <div className="w-full h-[121.7px] relative">
              <Image 
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 92vw, 315px"
                className={`object-contain ${imageAlignment} ${imageClassName || ""}`}
              />
           </div>
        ) : (
            <div 
                className="w-full h-[121.7px] bg-transparent bg-center"
                style={{ 
                    backgroundColor: imagePlaceholderColor,
                }}
            />
        )}

        {/* Text Content */}
        <div className="flex flex-col items-start px-[19.2px] pb-[19.2px] gap-[18.68px] w-full h-[152.48px]">
            {/* Title */}
            <div className="flex flex-col items-start p-0 w-[276.27px] h-[24px]">
                <h3 className="font-sans font-normal text-[15.6px] leading-[24px] tracking-[-0.336px] text-white">
                    {title}
                </h3>
            </div>
            
            {/* Description */}
            <div className="flex flex-col items-start p-0 w-[276.27px] h-[72px] opacity-50">
                <p className="font-sans font-normal text-[12px] leading-[18px] tracking-[-0.128px] text-white">
                    {description}
                </p>
            </div>
        </div>
    </div>
  );
};

export function LandingV2Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, isInView } = useIsInView(containerRef, {
    inViewOnce: true,
    inViewMargin: "200px 0px",
  });

  useEffect(() => {
    if (!isInView) {
      return;
    }
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        gsap.from(".reveal-element", {
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
          y: 50,
          opacity: 0,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
        });
      }, containerRef);
      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isInView]);

  return (
    /* Section - Features section (labeled FAQ in CSS comments) */
    <section 
        ref={inViewRef}
        className="flex flex-col justify-center items-center p-[10px] gap-[10px] w-full"
        style={{
             // height: "672.93px", // Removed fixed height to allow scroll animation
             background: "linear-gradient(180deg, #0f0f10 0%, #141414 100%)"
        }}
    >
        
        {/* Main Container */}
        <div className="flex flex-col justify-center items-start pt-[25.43px] px-4 md:px-[120px] pb-[105.43px] w-full max-w-[1200px] min-h-[652.93px]">
             
             {/* Inner Container */}
             <div className="flex flex-col justify-center items-center p-0 gap-[50.4px] w-full max-w-[960px] h-auto">
                
                {/* Heading Block */}
                <div className="flex flex-col items-center p-0 gap-[38.8px] w-full max-w-[603px] h-auto">
                     
                     {/* Series of Titles */}
                     <div className="reveal-element flex flex-col justify-center items-center p-0 w-full h-auto">
                        <div className="flex flex-col md:flex-row items-center p-0 gap-[16px] w-full h-auto md:h-[69.86px]">
                            {/* "Introducing" */}
                            <div className="flex flex-col justify-center items-center md:items-start p-0 w-auto md:w-[198px] h-[52px]">
                                <h2 className="font-sans font-normal text-3xl md:text-[39.3px] leading-[52px] tracking-[-1.296px] text-white text-center md:text-left">
                                    Autonomous
                                </h2>
                            </div>
                            
                            {/* Graphic Placeholder (3D DropDown) */}
                            <div className="relative w-[30.5px] h-[28.5px] translate-x-[30%]">
                                <Image
                                    src="https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/WDEskzZRo1phj61WHaagCjRTUko.png%20%281%29.png"
                                    alt="Nexis Graphic"
                                    fill
                                    sizes="31px"
                                    className="object-contain"
                                />
                            </div>

                            {/* "Leverage Tokens" */}
                            <div className="flex flex-col justify-center items-center md:items-start p-0 w-auto md:w-[298px] h-[52px]">
                                 <h2 
                                    className="font-sans font-normal text-3xl md:text-[39.3px] leading-[52px] tracking-[-1.296px] text-white text-center md:text-left"
                                    style={{
                                        textShadow: "0px 1px 32px rgba(255, 255, 255, 0.25), 0px 0px 4px rgba(255, 255, 255, 0.62), 0px 0px 28px rgba(255, 255, 255, 0.25)"
                                    }}
                                 >
                                    Execution Layer
                                 </h2>
                            </div>
                        </div>
                     </div>

                     {/* Subtitle */}
                     <div className="reveal-element flex flex-col justify-center items-center p-0 w-full max-w-[506px]">
                        <p className="p-0 text-[12.8px] leading-[16px] tracking-normal text-center text-white font-sans font-medium">
                            Nex-T1 on Nexis AI Chain gives you power without the headaches. Fully autonomous strategies, always in your control.
                        </p>
                     </div>
                </div>

                {/* Cards Row */}
                <div className="flex flex-col md:flex-row justify-center items-center p-0 gap-[8px] w-full h-auto">
                    
                    <FeatureCard 
                        className="reveal-element w-full md:w-[314.67px]"
                        width="100%"
                        height="auto"
                        title="Intent-Based Action"
                        description="Nex-T1 on-chain agents wrap complex Web3 transactions into a single atomic prompt. Save hours of manual routing and active monitoring while maximizing your DeFAI yield edge."
                        imageUrl="/assets/landing-v2/intent-cube.png"
                        imageClassName="scale-[1.65] -translate-x-[20%] -translate-y-[40%] origin-top-left"
                    />

                    <FeatureCard 
                        className="reveal-element w-full md:w-[314.67px]"
                        width="100%"
                        height="auto"
                        title="Verifiable, Trustless Design"
                        description="Nex-T1 actions are fully onchain and verified. Gain clarity around the liquidity sources, smart contracts and crypto execution paths associated with your Agent — no surprises."
                        imageUrl="/assets/landing-v2/verifiable-cube.jpg"
                        imageClassName="scale-[1.65] -translate-x-[20%] -translate-y-[40%] origin-top-left mix-blend-screen"
                    />

                    <FeatureCard 
                        className="reveal-element w-full md:w-[314.67px]"
                        width="100%"
                        height="auto"
                        title="Native Integrations"
                        description="The power of Web3 is composability. Because Nex-T1 is native, it executes on Aave, Uniswap, and beyond. Anything is possible in Financial DeFi — you just have to command it."
                        imageUrl="/assets/landing-v2/native-cube.jpg"
                        imageClassName="scale-[1.65] translate-x-[20%] -translate-y-[40%] origin-top-right mix-blend-screen"
                        imageAlignment="object-right-top"
                    />

                </div>
             </div>
        </div>
    </section>
  );
}
