"use client";

import { RefObject } from "react";

import { DevelopmentCard } from "@/components/market-overview/development-card";
import type { NewsArticle } from "@/types/market";

type SignalsSectionProps = {
  developments: NewsArticle[];
  summaryFallback: NewsArticle[];
  updatedLabel: string;
  scrollRef: RefObject<HTMLDivElement | null>;
};

export function SignalsSection({ developments, summaryFallback, updatedLabel, scrollRef }: SignalsSectionProps) {
  const list = developments.length ? developments : summaryFallback;
  return (
    <section className="flex w-full flex-col gap-2" style={{ height: "303px" }}>
      <div className="flex h-6 w-full items-center justify-between">
        <h2 className="text-base font-medium tracking-[0.16px] text-[#E8E8E3]">Signals worth reading</h2>
        <span className="text-[12px] font-medium tracking-[0.16px] text-[#E8E8E3]/25">
          Updated {updatedLabel}
        </span>
      </div>
      <div className="relative w-full" style={{ height: "271px" }}>
        <div
          ref={scrollRef}
          className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar px-[17px]"
        >
          {list.map((article) => (
            <DevelopmentCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
