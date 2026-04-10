"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScrollObserverProps {
  sections: { id: string; label: string }[]
}

export function ScrollObserver({ sections }: ScrollObserverProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "")

  useEffect(() => {
    const observers = sections.map(({ id }) => {
      const element = document.getElementById(id)
      if (!element) return null

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setActiveSection(id)
          }
        },
        { threshold: 0.2, rootMargin: "-20% 0px -50% 0px" }
      )

      observer.observe(element)
      return observer
    })

    return () => {
      observers.forEach((observer) => observer?.disconnect())
    }
  }, [sections])

  return (
    <nav className="fixed left-8 top-1/2 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" })
          }}
          className="group flex items-center gap-4 outline-none"
        >
          <div className="relative flex h-2 w-2 items-center justify-center">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                activeSection === section.id
                  ? "bg-[#0088ff]"
                  : "bg-neutral-800 group-hover:bg-neutral-500"
              )}
            />
            {activeSection === section.id && (
              <motion.div
                layoutId="active-scroll-dot"
                className="absolute inset-0 rounded-full border border-[#0088ff]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-medium tracking-widest uppercase transition-all duration-300",
              activeSection === section.id
                ? "text-[#0088ff] opacity-100 translate-x-0"
                : "text-neutral-500 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50"
            )}
          >
            {section.label}
          </span>
        </a>
      ))}
    </nav>
  )
}
