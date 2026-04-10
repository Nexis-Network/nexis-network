"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { m } from "framer-motion"
import { cn } from "@/lib/utils"
import { useIsInView } from "@/lib/hooks/ui/use-is-in-view"

export interface HobbesFeatureRotatorItem {
  id: string
  title: string
  description: string
}

interface HobbesFeatureRotatorProps {
  items: readonly HobbesFeatureRotatorItem[]
  className?: string
  cycleDurationMs?: number
}

const PROGRESS_TICK_MS = 50

export function HobbesFeatureRotator({
  items,
  className,
  cycleDurationMs = 6000,
}: HobbesFeatureRotatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { ref: inViewRef, isInView } = useIsInView(containerRef, {
    inViewOnce: false,
    inViewMargin: "200px 0px",
  })

  const [isPageVisible, setIsPageVisible] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const progressPerTick = useMemo(
    () => (100 * PROGRESS_TICK_MS) / Math.max(cycleDurationMs, PROGRESS_TICK_MS),
    [cycleDurationMs]
  )

  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden)
    handleVisibility()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  useEffect(() => {
    if (!items.length) return
    if (!isInView) return
    if (!isPageVisible) return

    const interval = window.setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = currentProgress + progressPerTick
        if (nextProgress >= 100) {
          setActiveIndex((currentIndex) => (currentIndex + 1) % items.length)
          return 0
        }
        return nextProgress
      })
    }, PROGRESS_TICK_MS)

    return () => window.clearInterval(interval)
  }, [items.length, isInView, isPageVisible, progressPerTick])

  const handleSelect = (index: number) => {
    setActiveIndex(index)
    setProgress(0)
  }

  if (!items.length) return null

  return (
    <div ref={inViewRef} className={cn("p-5 pr-6 sm:p-6 sm:pr-10", className)}>
      {items.map((item, index) => {
        const isActive = activeIndex === index

        return (
          <div key={item.id} className="group">
            <button
              type="button"
              onClick={() => handleSelect(index)}
              className="w-full py-5 text-left sm:py-6"
              aria-pressed={isActive}
            >
              <span
                className={cn(
                  "block text-[24px] leading-[28px] tracking-[-0.2px] transition-colors duration-300 sm:text-[31px] sm:leading-6",
                  isActive ? "text-white" : "text-white/80 group-hover:text-white"
                )}
              >
                {item.title}
              </span>

              {isActive ? (
                <div className="mt-6">
                  <p className="max-w-[380px] text-[14px] leading-6 text-white/78 sm:text-[13px] sm:leading-[24px]">
                    {item.description}
                  </p>
                </div>
              ) : null}
            </button>

            <div className="relative h-px w-full bg-white/10">
              <m.div
                data-testid={`hobbes-feature-progress-${item.id}`}
                className="absolute left-0 top-0 h-px bg-white"
                style={{ width: isActive ? `${progress}%` : "0%", opacity: isActive ? 1 : 0 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
