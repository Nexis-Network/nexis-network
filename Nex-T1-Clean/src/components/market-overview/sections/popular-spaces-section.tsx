"use client";

import { POPULAR_SPACES } from "@/components/market-overview/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function PopularSpacesSection({ onSpaceSelect }: { onSpaceSelect: (id: string) => void }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16px] text-muted-foreground">popular spaces</p>
          <h2 className="text-lg font-medium text-foreground">Tools for finance research</h2>
        </div>
        <Button variant="link" size="sm" className="text-xs text-muted-foreground">
          View catalog <ArrowRight className="ml-1 size-3" />
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {POPULAR_SPACES.map((space) => (
          <Card key={space.id} className="border-border bg-card p-4 text-foreground">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{space.emoji}</div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">{space.title}</h3>
                <p className="text-xs text-muted-foreground">{space.description}</p>
              </div>
            </div>
            <Button
              className="mt-4 w-full rounded-full text-xs"
              variant="outline"
              onClick={() => onSpaceSelect(space.id)}
            >
              {space.cta}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
