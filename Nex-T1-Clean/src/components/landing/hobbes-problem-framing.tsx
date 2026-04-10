"use client"

import { LazyMotion, domAnimation } from "framer-motion"
import { ProblemFraming } from "@/components/nex-t1/sections/problem-framing"

interface HobbesProblemFramingProps {
  headline: string
  supportingText: string
  backgroundClassName?: string
}

export function HobbesProblemFraming({
  headline,
  supportingText,
  backgroundClassName = "bg-[#03040c]",
}: HobbesProblemFramingProps) {
  return (
    <LazyMotion features={domAnimation}>
      <ProblemFraming
        headline={headline}
        supportingText={supportingText}
        backgroundClassName={backgroundClassName}
        highlightSupportingText
      />
    </LazyMotion>
  )
}
