"use client"

import { useRef, ReactNode } from "react"
import { useScroll, LazyMotion, domAnimation, m } from "framer-motion"

import { NexT1HeroSpline } from "@/components/nex-t1/hero-spline"
import { ScrollObserver } from "@/components/nex-t1/scroll-observer"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { loginDesktopButtonClass } from "@/components/navigation/login-button-classes"
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants"

// New Sections
import { ProblemFraming } from "./sections/problem-framing"
import { HowItWorks } from "./sections/how-it-works"
import { SocialProof } from "./sections/social-proof"
import { Outcomes } from "./sections/outcomes"
import { GoLive } from "./sections/go-live"
import { Capabilities } from "./sections/capabilities"
import { Comparison } from "./sections/comparison"
import { FAQ } from "./sections/faq"
import { FinalCTA } from "./sections/final-cta"


const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "problem", label: "Problem" },
  { id: "how-it-works", label: "Solution" },
  { id: "proof", label: "Proof" },
  { id: "outcomes", label: "Value" },
  { id: "deployment", label: "Steps" },
  { id: "capabilities", label: "Power" },
  { id: "compare", label: "Compare" },
  { id: "faq", label: "FAQ" },
]

const LANDING_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

interface NexT1ClientPageProps {
  header: ReactNode
  footer: ReactNode
}

export function NexT1ClientPage({ header, footer }: NexT1ClientPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  return (
    <LazyMotion features={domAnimation}>
    <div ref={containerRef} className="relative min-h-screen w-full bg-[#08080a] selection:bg-neutral-800 selection:text-white">
      {/* Global Header */}
      <div className="absolute top-0 left-0 right-0 z-50">
        {header}
      </div>

      {/* Navigation Rail */}
      <ScrollObserver sections={SECTIONS} />

      {/* Progress Bar (Mobile/Top) */}
      <m.div 
        className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 to-violet-500 origin-left lg:hidden"
        style={{ scaleX: scrollYProgress }}
      />

      {/* HERO SECTION (UNTOUCHED as per instructions, apart from standard ID) */}
      <section id="overview" className="relative h-screen min-h-[800px] w-full overflow-hidden bg-[#08080a]">
        <NexT1HeroSpline />
        
        <div className="container relative z-10 flex h-full flex-col justify-center px-6 lg:max-w-[1400px] pointer-events-none">
          <m.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl space-y-8 pointer-events-auto pl-6"
          >
            <div className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-xs font-medium text-neutral-400 backdrop-blur-md">
              <span className="mr-2 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Nex-T1 Enterprise Agent
            </div>

            <h1 className="text-balance text-4xl font-semibold leading-tight text-white drop-shadow-lg sm:text-5xl">
              Autonomous <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
                DeFi Execution.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-balance text-lg text-[#c4c4c4]/70 drop-shadow">
              The strictly typed, policy-governed developer companion. 
              Bridging natural language intent with complex Web3 operations via a secure, stateful architecture.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href={LANDING_LOGIN_HREF}
                className={cn(
                  loginDesktopButtonClass, 
                  "w-full sm:w-auto px-8 h-[34px] text-[11px]",
                  "bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                )}
              >
                Start Co-Pilot
              </Link>
              <Link
                href="https://docs.nex-t1.ai"
                className={cn(
                  loginDesktopButtonClass, 
                  "w-full sm:w-auto px-8 h-[34px] text-[11px]",
                  "bg-transparent border border-[#f4f4f4]/70 hover:border-[#f4f4f4] text-[#f4f4f4]/70 hover:text-[#f4f4f4]"
                )}
              >
                View Documentation
              </Link>
            </div>
          </m.div>
        </div>

        {/* Scroll Cue */}
        <m.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500 pointer-events-none"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <m.div 
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="h-12 w-[1px] bg-gradient-to-b from-neutral-500 to-transparent"
          />
        </m.div>
        {/* Bottom Fade Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-[5%] bg-gradient-to-t from-[#08080a] to-transparent pointer-events-none z-20" />
      </section>

      {/* NEW SECTIONS (Redesign) */}
      <div id="problem"><ProblemFraming /></div>
      <div id="how-it-works"><HowItWorks /></div>
      <div id="proof"><SocialProof /></div>
      <div id="outcomes"><Outcomes /></div>
      <div id="deployment"><GoLive /></div>
      <div id="capabilities"><Capabilities /></div>
      <div id="compare"><Comparison /></div>
      <div id="faq"><FAQ /></div>
      <FinalCTA />
      
      {footer}
    </div>
    </LazyMotion>
  )
}
