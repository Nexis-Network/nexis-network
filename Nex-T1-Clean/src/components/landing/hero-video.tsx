"use client";

import Link from "next/link";
import { UnicornScene } from "@/components/landing/unicorn-scene";

interface HeroVideoProps {
  onReady?: () => void;
}

export function HeroVideo({ onReady: _onReady }: HeroVideoProps) {
  // onReady is no longer triggered by video, but kept for interface compatibility
  
  return (
    <section className="relative w-full min-h-dvh overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
         <UnicornScene 
            projectId="auam1b0AYBvgVGJ5S8OO"
            width="100%"
            height="100%"
            className="h-full w-full bg-black"
            sceneClassName="h-full w-full"
         />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/65 via-black/30 to-black"
      />

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
                href="https://nex-t1.ai"
                className="box-border flex h-[38px] flex-row items-center justify-center rounded-full border border-white/25 px-4 py-2 font-mono text-[14px] font-normal uppercase leading-[20px] tracking-[1.4px] text-white mix-blend-normal transition-colors hover:bg-white/10"
              >
                Try Nex-T1
              </Link>
              <Link
                href="https://docs.nex-t1.ai"
                className="box-border flex h-[38px] flex-row items-center justify-center rounded-full bg-[#D9D9D9] px-4 py-2 font-mono text-[14px] font-normal uppercase leading-[20px] tracking-[1.4px] text-[#080808] transition-colors hover:bg-[#d9d9d9]/80"
              >
                Start Building
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
