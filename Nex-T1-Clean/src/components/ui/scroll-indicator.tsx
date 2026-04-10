"use client";

import { motion, useMotionTemplate, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useState } from "react";

export function ScrollIndicator() {
  const { scrollYProgress } = useScroll();
  const value = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const clipPath = useMotionTemplate`inset(0 0 ${value}% 0)`;
  const progressValue = useTransform(scrollYProgress, [0, 1], [1, 100]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 190]);
  const [progressLabel, setProgressLabel] = useState(1);

  useMotionValueEvent(progressValue, "change", (latest) => {
    setProgressLabel(Math.round(latest));
  });

  return (
    <div className="fixed left-0 top-1/2 z-50 flex h-48 w-4 -translate-y-1/2 translate-x-10 flex-col items-center justify-center">
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, #0ea5e9 0, #0ea5e9 1px, transparent 1px, transparent 5px)",
            opacity: 0.15,
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            clipPath,
            backgroundImage: "repeating-linear-gradient(to bottom, #0ea5e9 0, #0ea5e9 1px, transparent 1px, transparent 5px)",
          }}
        />
      </div>
      <motion.div
        style={{ y }}
        className="bg-sky-500 text-background absolute left-0 top-0 flex h-px w-8 items-center justify-center text-sm font-medium tracking-tight"
      >
        <motion.span className="absolute -right-1 translate-x-full tabular-nums text-sky-500">
          {progressLabel}
        </motion.span>
      </motion.div>
    </div>
  );
}
