"use client"

import { useState, useEffect } from "react"
import { m, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    id: "intent",
    title: "Intent-Driven Strategy Mapping",
    description: "Nex-T1 uses advanced natural language processing to translate your high-level financial goals into precise, multi-step on-chain execution strategies.",
  },
  {
    id: "execute",
    title: "Automated Protocol Orchestration",
    description: "Seamlessly interact with multiple DeFi protocols. Nex-T1 handles complex logic like liquidations, yield harvesting, and cross-chain bridging autonomously.",
  },
  {
    id: "guard",
    title: "Continuous Risk & Alpha Guard",
    description: "Proprietary algorithms monitor liquidity, slippage, and smart contract health 24/7, automatically rebalancing or exiting positions to protect your assets.",
  },
  {
    id: "audit",
    title: "Verifiable Enterprise Compliance",
    description: "Every autonomous action is documented in human-readable audit trails, satisfying enterprise-grade requirements for transparency and regulatory reporting.",
  },
]

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)

  // Auto-cycle steps for demo feel, or let users click
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((current) => (current + 1) % STEPS.length)
          return 0
        }
        return prev + 0.5 // Adjust speed as needed
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const handleStepClick = (index: number) => {
    setActiveStep(index)
    setProgress(0)
  }

  return (
    <section className="bg-[#08080a] relative overflow-hidden py-[80px]">
      <div className="container px-[80px] mx-auto max-w-[1440px]">
        
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-[16px] mb-[56px]">
          <div className="flex flex-col gap-[16px] max-w-[863px]">
            {/* Badge */}
            <div className="inline-flex items-center h-[32px] w-fit rounded-[8px] border border-white/20 bg-[#777777]/12 backdrop-blur-[5px] px-[12px] gap-[6px]">
              <div className="w-[6px] h-[6px] rounded-[6px] bg-[#00d0ff]" />
              <span className="text-[12.6px] font-medium leading-[14px] text-white/90 font-inter">
                The Future of Autonomous Finance
              </span>
            </div>

            {/* Title */}
            <h2 className="text-[31.9px] font-normal leading-[43.2px] tracking-[-0.36px] text-white/90 font-inter">
              How Nex-T1 Orchestrates <br />
              Autonomous DeFi
            </h2>
          </div>

          {/* Subtext */}
          <div className="max-w-[313px] text-[17.5px] font-normal leading-[24px] tracking-[-0.2px] text-[#6a6968] font-inter">
            Nex-T1 executes complex DeFi strategies with the precision of a professional trader, operating autonomously around the clock.
          </div>
        </div>

        {/* Content Row */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-[56px] items-start">
          
          {/* Left: Steps list */}
          <div className="flex flex-col">
            {STEPS.map((step, index) => {
              const isActive = activeStep === index
              return (
                <div key={step.id} className="flex flex-col">
                  {/* Top Divider for first item */}
                  {index === 0 && <div className="h-px w-full bg-[#1f1f1f]" />}
                  
                  <button 
                    onClick={() => handleStepClick(index)}
                    className="flex flex-col py-[24px] text-left transition-all duration-300 group"
                  >
                    <span className={cn(
                      "text-[17.5px] font-normal leading-[24px] tracking-[-0.2px] transition-colors duration-300",
                      isActive ? "text-white/90" : "text-[#6a6968] group-hover:text-white/50"
                    )}>
                      {step.title}
                    </span>
                    
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <m.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <p className="mt-[16px] text-[15px] leading-[22px] text-[#6a6968] max-w-[340px]">
                            {step.description}
                          </p>
                          {/* Progress Line */}
                          <div className="mt-[24px] relative h-px w-full bg-[#1f1f1f]">
                            <m.div 
                              className="absolute top-0 left-0 h-full bg-white/40"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </button>
                  
                  {/* Bottom Divider */}
                  <div className="h-px w-full bg-[#1f1f1f]" />
                </div>
              )
            })}
          </div>

          {/* Right: Media Container */}
          <div className="relative aspect-[16/10] w-full rounded-[16px] overflow-hidden border border-white/10 bg-[#0c0c0e]">
            {/* The image provided by the user */}
            <Image 
              src="/landing/nex-t1-agent.png"
              alt="Nex-T1 Demo Experience"
              fill
              className="object-cover"
              priority
            />
            
            {/* Subtle Overlay to match theme */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a]/20 to-transparent pointer-events-none" />
          </div>

        </div>

      </div>
    </section>
  )
}
