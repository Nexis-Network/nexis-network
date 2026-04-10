"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { DocsPromptCard, DocsSection } from "@/components/docs/docs-primitives";
import type { DocsPromptGroup } from "@/modules/docs/prompt-groups";

export function DocsPromptCarousel({ group }: { group: DocsPromptGroup }) {
  return (
    <DocsSection id={group.id} title={group.title}>
      <p>{group.description}</p>
      <Carousel opts={{ align: "start" }} className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <CarouselPrevious className="static translate-y-0 border-border/60 bg-card text-foreground hover:bg-accent" />
          <CarouselNext className="static translate-y-0 border-border/60 bg-card text-foreground hover:bg-accent" />
        </div>
        <div className="relative">
          <CarouselContent className="items-stretch">
            {group.prompts.map((prompt) => (
              <CarouselItem
                key={`${group.id}-${prompt.title}`}
                className="basis-[88%] sm:basis-[72%] lg:basis-[52%] xl:basis-1/2"
              >
                <DocsPromptCard
                  title={prompt.title}
                  prompt={prompt.prompt}
                  explanation={prompt.explanation}
                  result={prompt.result}
                  bestFor={prompt.bestFor}
                  watchFor={prompt.watchFor}
                  className="h-full border border-border/60"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 -right-3 z-10 w-14 bg-gradient-to-r from-transparent to-background sm:-right-4 sm:w-20 lg:-right-6 lg:w-24" />
        </div>
      </Carousel>
    </DocsSection>
  );
}
