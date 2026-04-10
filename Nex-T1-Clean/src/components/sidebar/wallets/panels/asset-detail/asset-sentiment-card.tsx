import { Card, CardContent } from "@/components/ui/card";
import type { AssetLiveResponse } from "@/types/extension/asset-detail";

type AssetSentimentCardProps = {
  sentiment: AssetLiveResponse["sentiment"];
};

function toneClass(label: AssetLiveResponse["sentiment"]["label"]) {
  if (label === "bullish") return "text-emerald-300 border-emerald-300/30 bg-emerald-500/10";
  if (label === "bearish") return "text-rose-300 border-rose-300/30 bg-rose-500/10";
  return "text-zinc-200 border-zinc-500/30 bg-zinc-700/30";
}

function formatFactorId(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AssetSentimentCard({ sentiment }: AssetSentimentCardProps) {
  return (
    <Card className="border-white/10 bg-[#c4c4c4]/5">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Sentiment</div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${toneClass(sentiment.label)}`}>
            {sentiment.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
            <div className="text-[10px] text-zinc-500">Score</div>
            <div className="text-sm font-semibold text-white tabular-nums">{Math.round(sentiment.score)}</div>
          </div>
          <div className="rounded-md border border-white/5 bg-black/20 px-2 py-1.5">
            <div className="text-[10px] text-zinc-500">Confidence</div>
            <div className="text-sm font-semibold text-white tabular-nums">{Math.round(sentiment.confidence)}%</div>
          </div>
        </div>

        {sentiment.factors.length > 0 ? (
          <div className="space-y-1.5">
            {sentiment.factors.map((factor) => (
              <div
                key={factor.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px]"
              >
                <div className="truncate text-zinc-300">{formatFactorId(factor.id)}</div>
                <div className="tabular-nums text-white">
                  {factor.contribution > 0 ? "+" : ""}
                  {factor.contribution.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">No sentiment factors available yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
