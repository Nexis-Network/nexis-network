"use client"

import { useState } from "react"
import dynamic from 'next/dynamic'
import { motion } from "framer-motion"

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
})

export function NexT1HeroSpline() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        {/* Loading Skeleton */}
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isLoaded ? 0 : 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-10 bg-neutral-950"
        />

        {/* Spline Scene */}
        <div className="relative h-full w-full">
            <Spline
                scene="https://prod.spline.design/xx5yBEdSNGlutgTM/scene.splinecode"
                onLoad={() => setIsLoaded(true)}
                className="h-full w-full"
            />
        </div>
        
        {/* Gradient overlays for seamless integration - adjusted for interaction */}
        <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none bg-gradient-to-t from-neutral-950 to-transparent" />
    </div>
  )
}
