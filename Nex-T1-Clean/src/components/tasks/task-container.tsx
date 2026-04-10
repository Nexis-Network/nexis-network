"use client";

import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Newspaper,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TaskType } from "@/lib/schema";
import { ChainVisualization } from "./task-result";

interface TaskContainerProps {
  taskId: string;
  type: TaskType;
  data: UntypedJson;
  isLoading?: boolean;
}

export function TaskContainer({
  taskId: _taskId,
  type,
  data,
  isLoading = false,
}: TaskContainerProps) {
  switch (type) {
    case TaskType.CHAIN:
      return (
        <Card className="rounded-2xl border-none p-2">
          <ChainVisualization data={data || {}} isLoading={isLoading} />
        </Card>
      );

    case TaskType.NEWS_DIGEST:
      return (
        <Card className="rounded-2xl border-none p-3">
          <NewsDigestVisualization data={data} isLoading={isLoading} />
        </Card>
      );

    case TaskType.DEX_TRADE:
      return (
        <Card className="rounded-2xl border-none p-3">
          <DexTradeVisualization data={data} isLoading={isLoading} />
        </Card>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// News Digest Visualization
// ---------------------------------------------------------------------------

interface NewsDigestData {
  topic?: string;
  stories?: Array<{
    id?: number;
    title?: string;
    url?: string;
    score?: number;
    descendants?: number;
  }>;
}

function NewsDigestVisualization({
  data,
  isLoading,
}: {
  data: UntypedJson;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading news digest...</span>
      </div>
    );
  }

  const digest = (data ?? {}) as NewsDigestData;
  const stories = digest.stories ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {digest.topic ? `News: ${digest.topic}` : "News Digest"}
        </span>
        <Badge className="ml-auto h-5 px-1.5" variant="secondary">
          <span className="text-[10px]">
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </span>
        </Badge>
      </div>

      {stories.length === 0 ? (
        <p className="text-xs text-muted-foreground">No stories found.</p>
      ) : (
        <div className="divide-y divide-border/50 rounded-md border border-border/50 bg-background/50">
          {stories.map((story) => (
            <div className="flex items-start gap-2 p-2.5" key={story.id ?? story.title}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{story.title}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  {typeof story.score === "number" && (
                    <span>score {story.score}</span>
                  )}
                  {typeof story.descendants === "number" && (
                    <span>{story.descendants} comments</span>
                  )}
                </div>
              </div>
              {story.url && (
                <a
                  className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                  href={story.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEX Trade Visualization
// ---------------------------------------------------------------------------

interface DexTradeData {
  mode?: "simulate" | "executed" | "pending_approval";
  txHash?: string;
  sellAmount?: number;
  buyAmount?: number;
  price?: string;
  action?: {
    side?: string;
    baseToken?: string;
    quoteToken?: string;
    chainId?: number;
    executionMode?: string;
  };
}

function DexTradeVisualization({
  data,
  isLoading,
}: {
  data: UntypedJson;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Processing trade...</span>
      </div>
    );
  }

  const trade = (data ?? {}) as DexTradeData;
  const action = trade.action ?? {};
  const pair = `${action.baseToken ?? "???"}/${action.quoteToken ?? "???"}`;
  const chainLabel = action.chainId ? `Chain ${action.chainId}` : "";

  const statusBadge = (() => {
    switch (trade.mode) {
      case "executed":
        return (
          <Badge className="h-5 px-1.5 gap-1" variant="default">
            <CheckCircle2 className="h-2.5 w-2.5" />
            <span className="text-[10px]">Executed</span>
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge className="h-5 px-1.5 gap-1" variant="outline">
            <Clock className="h-2.5 w-2.5" />
            <span className="text-[10px]">Pending Approval</span>
          </Badge>
        );
      case "simulate":
        return (
          <Badge className="h-5 px-1.5 gap-1" variant="secondary">
            <span className="text-[10px]">Simulated</span>
          </Badge>
        );
      default:
        return (
          <Badge className="h-5 px-1.5 gap-1" variant="secondary">
            <span className="text-[10px]">Quote</span>
          </Badge>
        );
    }
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {action.side?.toUpperCase() ?? "TRADE"} {pair}
        </span>
        {statusBadge}
      </div>

      <div className="rounded-md border border-border/50 bg-background/50 p-3 text-xs">
        <div className="grid grid-cols-2 gap-y-2">
          <div>
            <span className="text-muted-foreground">Sell</span>
            <p className="font-medium">
              {typeof trade.sellAmount === "number"
                ? trade.sellAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                : "--"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Buy</span>
            <p className="font-medium">
              {typeof trade.buyAmount === "number"
                ? trade.buyAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                : "--"}
            </p>
          </div>
          {trade.price && (
            <div>
              <span className="text-muted-foreground">Price</span>
              <p className="font-medium">{trade.price}</p>
            </div>
          )}
          {chainLabel && (
            <div>
              <span className="text-muted-foreground">Network</span>
              <p className="font-medium">{chainLabel}</p>
            </div>
          )}
        </div>

        {trade.txHash && (
          <div className="mt-2 border-t border-border/50 pt-2">
            <span className="text-muted-foreground">Transaction</span>
            <p className="truncate font-mono text-[10px]">{trade.txHash}</p>
          </div>
        )}
      </div>
    </div>
  );
}
