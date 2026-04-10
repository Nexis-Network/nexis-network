"use client";

import { Flame } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type { NewsArticle } from "@/types/market";

type MacroNewsSectionProps = {
  summaryNews: NewsArticle[];
  isLoading: boolean;
  updatedLabel: string;
};

export function MacroNewsSection({ summaryNews, isLoading, updatedLabel }: MacroNewsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">market summary</p>
          <h2 className="text-lg font-medium text-foreground">Macro rundown</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="size-3 text-[#FF5459]" />
          Updated {updatedLabel}
        </div>
      </div>
      <Card className="border-border bg-card">
        <div className="divide-y divide-border/50">
          {summaryNews.length === 0 && isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : (
            summaryNews.map((article) => (
              <article key={article.id} className="space-y-2 px-5 py-4">
                <h3 className="text-base font-medium text-foreground">{article.title}</h3>
                <p className="text-sm text-muted-foreground">{article.description}</p>
                <div className="text-xs text-muted-foreground/80">
                  Source · {article.source} · {formatRelativeTime(article.publishedAt)}
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
