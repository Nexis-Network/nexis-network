import { useState } from "react";

import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TokenTheme } from "@/types/token-page";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS } from "./constants";

type KeyThemesCardProps = {
  themes: TokenTheme[];
};

export function KeyThemesCard({ themes }: KeyThemesCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(themes[0]?.id ?? null);

  if (!themes.length) {
    return null;
  }

  return (
    <section className={TOKEN_PANEL_MAX_WIDTH_CLASS}>
      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">Key issues</p>
        <h2 className="text-lg font-semibold leading-6 text-foreground">Bull & bear theses</h2>
      </div>
      <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, "text-foreground")}>
        <div className={cn(TOKEN_PANEL_INNER_CLASS, "rounded-[11px]")}>
          {themes.map((theme, index) => {
            const expanded = expandedId === theme.id;
            return (
              <div
                key={theme.id}
                className={cn("flex flex-col", index !== 0 && "border-t border-border")}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setExpandedId(expanded ? null : theme.id)}
                >
                  <span className="text-[14px] font-medium leading-[18px] tracking-[0.16px]">{theme.title}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground/70">
                    <ChevronDown className={cn("size-4 transition", expanded ? "rotate-180" : "rotate-0")} />
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-border">
                    <div className="grid overflow-hidden rounded-none border border-border divide-border divide-y md:grid-cols-2 md:divide-y-0 md:divide-x">
                      <div className="relative isolate flex h-[242px] w-full flex-col gap-4 overflow-hidden rounded-none px-4 py-4">
                        <Overlay variant="bull" />
                        <div className="relative inline-flex h-6 items-center gap-2 rounded-[6px] bg-primary/10 px-2 text-primary">
                          <TrendingUp className="size-4" />
                          <span className="text-[12px] font-medium leading-4 tracking-[0.16px]">Bullish view</span>
                        </div>
                        <p className="relative pr-6 text-[14px] font-light leading-[20px] tracking-[0.16px] text-foreground">
                          {theme.bullish.summary}
                        </p>
                        <SourcesList sources={theme.bullish.sources} tone="bull" />
                      </div>
                      <div className="relative isolate flex h-[242px] w-full flex-col gap-4 overflow-hidden rounded-none px-4 py-4">
                        <Overlay variant="bear" />
                        <div className="relative inline-flex h-6 items-center gap-2 rounded-[6px] bg-destructive/10 px-2 text-destructive">
                          <TrendingDown className="size-4" />
                          <span className="text-[12px] font-medium leading-4 tracking-[0.16px]">Bearish view</span>
                        </div>
                        <p className="relative pr-6 text-[14px] font-light leading-[20px] tracking-[0.16px] text-foreground">
                          {theme.bearish.summary}
                        </p>
                        <SourcesList sources={theme.bearish.sources} tone="bear" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

function Overlay({ variant }: { variant: "bull" | "bear" }) {
  if (variant === "bull") {
    return (
      <>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 0,
            background: "linear-gradient(to bottom right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 100%)",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 0, background: "rgba(49, 184, 198, 0.1)" }}
        />
      </>
    );
  }

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: "linear-gradient(to bottom left, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "rgba(180, 65, 60, 0.1)" }}
      />
    </>
  );
}

function SourcesList({ sources, tone }: { sources: string[]; tone: "bull" | "bear" }) {
  if (!sources.length) {
    return null;
  }

  const primaryColor = tone === "bull" ? "#31B8C6" : "#B4413C";
  const label = sources.length > 1 ? `${sources.length} sources` : sources[0];

  return (
    <div className="relative mt-auto flex items-end justify-between gap-3">
      <div className="flex items-center">
        {sources.slice(0, 4).map((source) => (
          <span
            key={source}
            className="flex h-7 w-7 -ml-1 first:ml-0 items-center justify-center rounded-full border border-border bg-card text-[10px] font-semibold uppercase text-foreground"
          >
            {source.slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="flex h-[30px] items-center rounded-full border border-border px-4">
        <span className="text-[12px] font-medium leading-4 tracking-[0.16px]" style={{ color: primaryColor }}>
          {label}
        </span>
      </div>
    </div>
  );
}
