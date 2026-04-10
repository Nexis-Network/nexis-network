"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 z-0 h-full w-full bg-black/0" /> 
});

import { cn } from "@/lib/utils";

import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

interface LandingV2HeroProps {
  onReady?: () => void;
}

interface LandingV2HeroBackgroundProps {
  className?: string;
  nonInteractive?: boolean;
}

const LANDING_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export function LandingV2HeroBackground({ className, nonInteractive = false }: LandingV2HeroBackgroundProps) {
  const [shouldRenderSpline, setShouldRenderSpline] = useState(false);

  useEffect(() => {
    const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
    const timeoutMs = isMobileViewport ? 1200 : 200;
    const timeoutId = window.setTimeout(() => {
      setShouldRenderSpline(true);
    }, timeoutMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      {shouldRenderSpline ? (
        <Spline
          scene="https://prod.spline.design/Wynxx5AIMnmCdrYy/scene.splinecode"
          className={cn(
            "absolute inset-0 z-0 h-full w-full bg-black/0",
            nonInteractive && "pointer-events-none touch-none select-none"
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 z-0 h-full w-full bg-black/0",
            nonInteractive && "pointer-events-none touch-none select-none"
          )}
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/65 via-black/30 to-transparent"
      />
      
      {/* Bottom fade to blends with next section */}
      <div 
        aria-hidden
        className="absolute bottom-0 left-0 w-full h-[400px] z-20 pointer-events-none bg-gradient-to-b from-transparent to-[#0F0F10]"
      />
    </div>
  );
}

export function LandingV2Hero({ onReady }: LandingV2HeroProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <section className="relative w-full min-h-dvh overflow-hidden bg-black">
      <LandingV2HeroBackground />

      <div className="relative z-20 flex min-h-dvh w-full items-center justify-center px-6 py-24 md:py-28">
        <div className="flex w-full max-w-[1232px] flex-col items-center gap-6 text-center">
          <div className="flex max-w-4xl flex-col items-center gap-4 text-center">
            <h1 className="text-balance text-4xl font-semibold leading-tight text-white drop-shadow-lg sm:text-5xl">
              DeFi at the speed of thought
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-lg text-[#c4c4c4]/70 drop-shadow">
              Turn natural language into native transactions. Navigate the complexities of DeFi without ever leaving the
              chat.
            </p>



            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <Link
                href={LANDING_LOGIN_HREF}
                className={cn(
                  "flex flex-row items-center justify-center",
                  "w-[125px] h-[40px]",
                  "bg-white/95 rounded-[41px]",
                  "border border-white",
                  "font-normal text-[12px] leading-[16px] tracking-[-0.16px] text-[#212121]",
                  "transition-opacity hover:opacity-90"
                )}
              >
                Try Nex-T1
              </Link>
              <Link
                href="https://portal.nex-t1.ai/"
                className={cn(
                  "flex flex-row items-center justify-center",
                  "w-[131px] h-[40px]",
                  "bg-[#c4c4c4]/10 backdrop-blur-md rounded-[41px]",
                  "border border-white/12",
                  "font-normal text-[12px] leading-[16px] tracking-[-0.16px] text-white",
                  "transition-colors hover:bg-[#c4c4c4]/20"
                )}
              >
                Visit Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Crypto Price Ticker */}

    </section>
  );
}
