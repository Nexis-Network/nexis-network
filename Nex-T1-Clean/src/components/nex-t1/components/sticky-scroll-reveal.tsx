"use client"

import { useRef, ReactNode, RefObject, CSSProperties } from "react"
import { useScroll, useTransform, m, MotionValue, type UseScrollOptions } from "framer-motion"
import { cn } from "@/lib/utils"

interface StickyScrollRevealProps {
  children: string
  className?: string
  targetRef?: RefObject<HTMLElement | null>
  offset?: UseScrollOptions["offset"]
  progressRange?: [number, number]
  textStyle?: CSSProperties
  dimColor?: string
  highlightColor?: string
  opacityRange?: [number, number]
  blurRange?: [number, number]
  glowColor?: string
}

export function StickyScrollReveal({
  children,
  className,
  targetRef,
  offset,
  progressRange,
  textStyle,
  dimColor = "rgba(255, 255, 255, 0.34)",
  highlightColor = "rgba(255, 255, 255, 1)",
  opacityRange = [0.35, 1],
  blurRange = [2, 0],
  glowColor = "rgba(255, 255, 255, 0.28)",
}: StickyScrollRevealProps) {
  const element = useRef<HTMLDivElement>(null)
  const resolvedOffset = offset ?? (["start 0.8", "start 0.2"] as NonNullable<UseScrollOptions["offset"]>)
  const resolvedProgressRange = progressRange ?? [0, 1]
  const { scrollYProgress } = useScroll({
    target: targetRef ?? element,
    offset: resolvedOffset
  })
  const normalizedProgress = useTransform(scrollYProgress, resolvedProgressRange, [0, 1], { clamp: true })

  // Split text into words
  const words = children.split(" ")

  return (
    <div 
      ref={element}
      className={cn("flex flex-wrap leading-[1.25] tracking-[-0.5px]", className)}
      style={{
        fontSize: "clamp(28px, 4vw, 40px)",
        fontWeight: 400,
        fontFamily: '"SF Pro Display Regular", "SF Pro Display Regular Placeholder", sans-serif',
        ...textStyle,
      }}
    >
      {words.map((word, i) => {
        const start = i / words.length
        const end = start + (1 / words.length)
        return (
          <ScrollWord 
            key={i} 
            range={[start, end]} 
            progress={normalizedProgress}
            dimColor={dimColor}
            highlightColor={highlightColor}
            opacityRange={opacityRange}
            blurRange={blurRange}
            glowColor={glowColor}
          >
            {word}
          </ScrollWord>
        )
      })}
    </div>
  )
}

interface ScrollWordProps {
  children: ReactNode
  range: [number, number]
  progress: MotionValue<number>
  dimColor: string
  highlightColor: string
  opacityRange: [number, number]
  blurRange: [number, number]
  glowColor: string
}

const ScrollWord = ({
  children,
  range,
  progress,
  dimColor,
  highlightColor,
  opacityRange,
  blurRange,
  glowColor,
}: ScrollWordProps) => {
  const opacity = useTransform(progress, range, opacityRange)
  const blur = useTransform(progress, range, blurRange)
  const color = useTransform(progress, range, [dimColor, highlightColor])
  const textShadow = useTransform(progress, range, ["0 0 0 rgba(0, 0, 0, 0)", `0 0 18px ${glowColor}`])

  return (
    <span className="relative inline-block mr-[0.25em]">
      <m.span
        style={{
          opacity,
          color,
          textShadow,
          filter: useTransform(blur, (v) => `blur(${v}px)`),
        }}
        className="inline-block transition-colors duration-200 will-change-[opacity,filter,color,text-shadow]"
      >
        {children}
      </m.span>
    </span>
  )
}
