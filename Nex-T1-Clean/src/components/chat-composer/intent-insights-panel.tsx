"use client";

import { CheckCircle2, CircleDashed, Loader2, Sparkles } from "lucide-react";
import { memo } from "react";

import type { IntentInsightsResult, ToolHint } from "@/components/chat-composer/hooks/use-intent-insights";
import { cn } from "@/lib/utils";

type IntentInsightsPanelProps = {
  insights: IntentInsightsResult;
  onHintSelect?: (prompt: string) => void;
};

const formatRouteLabel = (insights: IntentInsightsResult): string => {
  if (!insights.tierDecision) {
    return "Detecting route";
  }
  const { tier, route } = insights.tierDecision;
  if (route === "evaluator_optimizer") {
    return "Planning (Evaluator)";
  }
  if (tier === "multi-agent") {
    return route === "orchestrator" ? "Multi-Agent (Orchestrator)" : "Multi-Agent";
  }
  return "Companion";
};

const formatConfidence = (analysis: IntentInsightsResult["analysis"]) => {
  return analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1);
};

const formatAssets = (analysis: IntentInsightsResult["analysis"]) => {
  if (!analysis.assets.length) return null;
  return analysis.assets.slice(0, 3).join(", ").toUpperCase();
};

const renderToolHint = (hint: ToolHint, onHintSelect?: (prompt: string) => void) => {
  const actionable = Boolean(hint.actionPrompt && onHintSelect);
  const Tag = actionable ? "button" : "div";
  return (
    <Tag
      key={hint.id}
      type={actionable ? "button" : undefined}
      onClick={actionable ? () => onHintSelect?.(hint.actionPrompt) : undefined}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium",
        actionable
          ? "border-foreground/30 text-foreground transition hover:bg-foreground/10"
          : "border-muted-foreground/40 text-muted-foreground",
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{hint.title}</span>
    </Tag>
  );
};

function IntentInsightsPanelComponent({ insights, onHintSelect }: IntentInsightsPanelProps) {
  const queryPresent = Boolean(insights.normalizedText);

  if (!queryPresent) {
    return null;
  }

  const assetLabel = formatAssets(insights.analysis);
  const hasHints = insights.recommendedTools.length > 0;

  return (
    <div className="rounded-2xl border border-dashed border-foreground/10 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-foreground">
          {insights.isRouting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-[#8eb94f]" />
          )}
          <span className="font-medium">{formatRouteLabel(insights)}</span>
        </div>
        <div className="flex items-center gap-1">
          <CircleDashed className="h-3 w-3" />
          <span>Confidence: {formatConfidence(insights.analysis)}</span>
        </div>
        {assetLabel && (
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Assets: {assetLabel}</span>
          </div>
        )}
      </div>

      {hasHints && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-foreground">{insights.recommendedTools.map((hint) => renderToolHint(hint, onHintSelect))}</div>
      )}
    </div>
  );
}

export const IntentInsightsPanel = memo(IntentInsightsPanelComponent);
