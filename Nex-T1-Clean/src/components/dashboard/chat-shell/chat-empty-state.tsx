"use client";

import { ChromaText } from "@/components/ui/chroma-text";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { RotatingChromaWord } from "@/components/ui/rotating-chroma-word";

const CHAT_EMPTY_STATE_WORDS = [
  "Web3",
  "DeFi",
  "NFT's",
  "Meme's",
  "Perps",
  "Predictions",
  "Automation",
  "Building",
] as const;

export function ChatEmptyState() {
  return (
    <div className="pointer-events-none flex h-full w-full flex-1 items-center justify-center px-6">
      <div className="flex w-full max-w-[min(100%,36rem)] flex-col items-center gap-4">
        <LiquidGlassButton
          animate
          variant="announcement"
          className="pointer-events-auto self-center"
        >
          <ChromaText className="inline-flex h-full w-full items-center justify-center">
            Announcing our Nex Copilot Mobile App release
          </ChromaText>
        </LiquidGlassButton>
        <h1 className="flex flex-col items-center overflow-visible text-center text-[2.25rem] font-[family-name:var(--font-inter)] leading-[0.94] tracking-[-0.06em] text-[var(--auth-text-primary)] sm:text-[clamp(2.75rem,4vw,4rem)]">
          <span className="block">A new era of</span>
          <span className="inline-flex items-baseline justify-center gap-[0.22em] whitespace-nowrap px-[0.04em] pb-[0.12em] overflow-visible">
            <RotatingChromaWord words={CHAT_EMPTY_STATE_WORDS} />
            <span>is here.</span>
          </span>
        </h1>
      </div>
    </div>
  );
}
