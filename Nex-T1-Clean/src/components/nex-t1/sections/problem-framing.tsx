"use client"

import { useRef } from "react"
import { m, type UseScrollOptions } from "framer-motion"
import { StickyScrollReveal } from "../components/sticky-scroll-reveal"

interface ProblemFramingProps {
  headline?: string
  supportingText?: string
  backgroundClassName?: string
  highlightSupportingText?: boolean
}

const DEFAULT_HEADLINE =
  "Nex-T1 solves the complexity gap. Your advanced on-chain copilot and autonomous AI agents turn manual struggle into automated execution."

const DEFAULT_SUPPORTING_TEXT =
  "Don't just read the docs—run them. Our agents verify, simulate, and execute transactions, solving the complexity that holds you back."

export function ProblemFraming({
  headline = DEFAULT_HEADLINE,
  supportingText = DEFAULT_SUPPORTING_TEXT,
  backgroundClassName = "bg-[#08080a]",
  highlightSupportingText = false,
}: ProblemFramingProps = {}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const sectionOffset: NonNullable<UseScrollOptions["offset"]> = ["start 0.9", "end 0.2"]

  return (
    <section ref={sectionRef} className={`relative min-h-[140vh] sm:min-h-[150vh] ${backgroundClassName}`}>
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <StickyScrollReveal
              className="mb-12 text-white sm:mb-24"
              targetRef={sectionRef}
              offset={sectionOffset}
              progressRange={highlightSupportingText ? [0, 0.68] : undefined}
              opacityRange={highlightSupportingText ? [0.24, 1] : undefined}
            >
              {headline}
            </StickyScrollReveal>

            <m.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <div className="h-px w-full bg-neutral-800 my-10 sm:my-16" />

              {highlightSupportingText ? (
                <StickyScrollReveal
                  className="max-w-2xl leading-[1.35] text-balance"
                  targetRef={sectionRef}
                  offset={sectionOffset}
                  progressRange={[0.38, 1]}
                  dimColor="rgba(163, 163, 163, 0.6)"
                  highlightColor="rgba(255, 255, 255, 0.92)"
                  opacityRange={[0.28, 1]}
                  blurRange={[1.4, 0]}
                  glowColor="rgba(255, 255, 255, 0.18)"
                  textStyle={{
                    fontSize: "clamp(18px, 2.3vw, 24px)",
                    fontWeight: 300,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {supportingText}
                </StickyScrollReveal>
              ) : (
                <p className="max-w-2xl text-lg font-light leading-relaxed text-neutral-400 sm:text-2xl">
                  {supportingText}
                </p>
              )}
            </m.div>
          </div>
        </div>
      </div>
    </section>
  )
}
