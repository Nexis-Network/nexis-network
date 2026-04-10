"use client";

import { useEffect, useState } from "react";
import { CoingeckoTrendingResponse } from "@/server/services/coingecko/coingecko-types";
import { TrendingTokenCard } from "./trending-token-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function TrendingTokensCarousel() {
  const [trending, setTrending] = useState<CoingeckoTrendingResponse["coins"] | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchTrending = async () => {
      try {
        const res = await fetch(`/api/coingecko/trending`);
        if (!res.ok) throw new Error("Failed to fetch trending");
        const data = await res.json();
        if (mounted && data.coins) setTrending(data.coins);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrending();
    return () => { mounted = false; };
  }, []);

  if (!trending || trending.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center border border-border/60 rounded-2xl bg-background mt-8 text-muted-foreground animate-pulse">
        Loading trending tokens...
      </div>
    );
  }

  return (
    <div className="w-full mt-8 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-foreground text-xl font-bold flex items-center gap-2">
          <span>🔥</span> Trending Tokens
        </h2>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full relative px-12"
      >
        <CarouselContent className="-ml-4">
          {trending.map((item) => {
            const coin = item.item;
            return (
              <CarouselItem key={coin.id} className="pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <TrendingTokenCard coin={coin} />
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="bg-card border-border/60 hover:bg-accent text-foreground left-0" />
        <CarouselNext className="bg-card border-border/60 hover:bg-accent text-foreground right-0" />
      </Carousel>
    </div>
  );
}
