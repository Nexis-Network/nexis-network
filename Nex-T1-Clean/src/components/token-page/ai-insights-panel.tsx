"use client";

import { useMemo } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck, Sparkles, Swords } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetSnapshot, TokenAssetSnapshot } from "@/types/token-page";
import type { ResearchPreviewRequest, ResearchPreviewResponse } from "@/types/multi-agent";
import { useResearchPreview } from "@/hooks/multi-agent";
import { cn } from "@/lib/utils";

type TokenAiInsightsPanelProps = {
  snapshot: AssetSnapshot | null;
  assetType: "token" | "nft";
};

export function TokenAiInsightsPanel({ snapshot, assetType }: TokenAiInsightsPanelProps) {
  const isTokenSnapshot = assetType === "token" && snapshot?.kind === "token";
  const tokenSnapshot = isTokenSnapshot ? (snapshot as TokenAssetSnapshot) : null;

  const researchPayload = useMemo(() => {
    if (!tokenSnapshot) {
      return null;
    }
    return buildResearchPreviewPayload(tokenSnapshot);
  }, [tokenSnapshot]);

  const researchQuery = useResearchPreview({
    input: researchPayload,
    enabled: Boolean(researchPayload),
  });

  if (!isTokenSnapshot || !tokenSnapshot) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ResearchCard
        symbol={tokenSnapshot.symbol}
        payloadReady={Boolean(researchPayload)}
        queryState={researchQuery}
      />
      <TradePreviewSkeleton />
      <RiskPreviewSkeleton />
    </div>
  );
}

function buildResearchPreviewPayload(snapshot: TokenAssetSnapshot): ResearchPreviewRequest | null {
  const symbol = snapshot.symbol?.trim() || snapshot.slug?.trim();
  if (!symbol) {
    return null;
  }

  const primaryNetwork = snapshot.networks?.[0]?.chain ?? null;

  return {
    price_symbol: symbol.toUpperCase(),
    price_vs_currency: "usd",
    sentiment_assets: [symbol.toUpperCase()],
    include_trending_words: true,
    trending_days: 7,
    trending_top_n: 5,
    tvl_chain: primaryNetwork,
    pools_chain: primaryNetwork,
    pools_limit: 25,
  };
}

type ResearchCardProps = {
  queryState: UseQueryResult<ResearchPreviewResponse>;
  payloadReady: boolean;
  symbol?: string;
};

function ResearchCard({ queryState, payloadReady, symbol }: ResearchCardProps) {
  const { data, isPending, isFetching, isError, error } = queryState;
  const loading = isPending || isFetching;

  return (
    <Card className="h-full border-primary/30 bg-primary/5">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">AI Research Preview</span>
        </div>
        <CardTitle className="text-base">Sentiment + Onchain Briefing{symbol ? ` · ${symbol}` : ""}</CardTitle>
        <p className="text-sm text-muted-foreground">
          LangGraph research agents sweep Dune, DeFiLlama, and word clouds for shareable context.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!payloadReady ? (
          <p className="text-sm text-muted-foreground">
            Provide a token symbol to generate research notes.
          </p>
        ) : loading ? (
          <ResearchSkeleton />
        ) : isError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unable to load research preview</p>
              <p className="text-destructive/80">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
          </div>
        ) : data ? (
          <>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{data.summary}</p>
            <ResearchMetaStrip
              duneRows={Array.isArray(data.dune_rows) ? data.dune_rows.length : null}
              defiCount={Array.isArray(data.defi_results) ? data.defi_results.length : null}
              sentimentSignals={data.sentiment_results ? Object.keys(data.sentiment_results).length : null}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preview response did not include a summary. Try reloading.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResearchSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-10/12" />
      <div className="grid grid-cols-3 gap-2 pt-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

function ResearchMetaStrip({
  duneRows,
  defiCount,
  sentimentSignals,
}: {
  duneRows: number | null;
  defiCount: number | null;
  sentimentSignals: number | null;
}) {
  const items = [
    { label: "Dune rows", value: duneRows },
    { label: "DeFi feeds", value: defiCount },
    { label: "Signals", value: sentimentSignals },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-md border border-primary/20 bg-background/40 px-2 py-2 text-center",
            "dark:border-primary/30",
          )}
        >
          <div className="text-foreground font-semibold text-base">
            {typeof item.value === "number" ? item.value : "—"}
          </div>
          <div className="text-[0.7rem] uppercase tracking-wide">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function TradePreviewSkeleton() {
  return (
    <Card className="h-full border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Swords className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Execution Preview</span>
        </div>
        <CardTitle className="text-base">Synthetic order routing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pseudo quotes + venue routing wire up next. Skeleton keeps layout stable.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function RiskPreviewSkeleton() {
  return (
    <Card className="h-full border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Risk Badge</span>
        </div>
        <CardTitle className="text-base">Policy gating (preview)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Risk agent outputs will light up this card once quotes feed into it.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
