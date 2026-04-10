"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { SplineCanvas } from "@/components/visuals/spline/spline-canvas";

const HOBBES_SPLINE_SCENE_URL = "https://prod.spline.design/YzlhkstKyfALlJaM/scene.splinecode";

export function HobbesFullWidthSpline() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const glowY = useTransform(scrollYProgress, [0, 1], [-18, 18]);
  const sheenY = useTransform(scrollYProgress, [0, 1], [-10, 10]);
  const quoteY = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section className="relative w-full overflow-hidden bg-[#03040c]">
      <div className="relative h-[320px] w-full sm:h-[420px] md:h-[560px] lg:h-[680px] xl:h-[760px]">
        <SplineCanvas
          sceneUrl={HOBBES_SPLINE_SCENE_URL}
          className="h-full w-full bg-[#03040c]"
          // Prevent scroll-wheel / trackpad zoom interactions so the scene doesn't
          // "zoom with scroll" while users move through the page.
          canvasClassName="absolute inset-0 pointer-events-none touch-none select-none"
          instrumentationTag="hobbes-full-width-spline"
          loadingFallback={
            <div className="pointer-events-none flex h-full w-full items-center justify-center bg-[#03040c]">
              <div className="h-12 w-12 animate-pulse rounded-full bg-white/15 blur-xl" />
            </div>
          }
          errorFallback={
            <div className="pointer-events-none flex h-full w-full items-center justify-center bg-[#03040c] px-6 text-center text-sm text-white/70">
              Interactive scene unavailable right now.
            </div>
          }
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_56%)]"
        />

        <div ref={targetRef} className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-[#040405]/45 backdrop-blur-[9px] backdrop-brightness-[85%] backdrop-saturate-[140%]"
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 blur-[2px] bg-[radial-gradient(900px_circle_at_50%_35%,rgba(244,244,244,0.07)_0%,rgba(244,244,244,0.035)_34%,rgba(244,244,244,0.012)_55%,transparent_72%)]"
            style={{ y: prefersReducedMotion ? 0 : glowY }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 opacity-60 bg-[linear-gradient(to_bottom,rgba(244,244,244,0.05),transparent_58%)]"
            style={{ y: prefersReducedMotion ? 0 : sheenY }}
          />

          <motion.div
            className="relative z-20 mx-auto max-w-[920px] px-6 py-6 text-center sm:px-10 sm:py-8"
            style={{ y: prefersReducedMotion ? 0 : quoteY }}
          >
            <p className="text-balance text-[18px] leading-[26px] tracking-[-0.22px] text-[#f4f4f4] drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)] sm:text-[22px] sm:leading-[32px] md:text-[26px] md:leading-[38px]">
              Reason in strategies. Execute with guardrails. Govern every move.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
