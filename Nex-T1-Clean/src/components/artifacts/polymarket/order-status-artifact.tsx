"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Circle, ExternalLink, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatusStep = "SUBMITTED" | "MATCHED" | "MINED" | "CONFIRMED";

const STATUS_STEPS: OrderStatusStep[] = ["SUBMITTED", "MATCHED", "MINED", "CONFIRMED"];

const STATUS_INDEX: Record<string, number> = {
  SUBMITTED: 0,
  MATCHED: 1,
  MINED: 2,
  CONFIRMED: 3,
};

export interface OrderStatusArtifactData {
  orderId: string;
  status: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  sizeMatched: number;
  txHashes: string[];
  createdAt: string;
  updatedAt: string;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function OrderStatusArtifact({ data }: { data: OrderStatusArtifactData }) {
  const currentIdx = STATUS_INDEX[data.status] ?? -1;
  const isBuy = data.side === "BUY";
  const fillPct = data.size > 0 ? Math.round((data.sizeMatched / data.size) * 100) : 0;

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-sky-500" />
          <ArtifactTitle>Order Status</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase tracking-wider font-bold",
              isBuy
                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                : "border-red-500/30 text-red-500 bg-red-500/5"
            )}
          >
            {data.side}
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-5">
        {/* Order summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-card/30 border border-border/40 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Price</p>
            <p className="text-sm font-bold text-foreground">{(data.price * 100).toFixed(1)}c</p>
          </div>
          <div className="p-3 rounded-lg bg-card/30 border border-border/40 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Size</p>
            <p className="text-sm font-bold text-foreground">{data.size.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-card/30 border border-border/40 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Filled</p>
            <p className={cn("text-sm font-bold", fillPct === 100 ? "text-emerald-500" : "text-foreground")}>{fillPct}%</p>
          </div>
        </div>

        {/* Fill progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Fill Progress</span>
            <span>{data.sizeMatched.toLocaleString()} / {data.size.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isBuy ? "bg-emerald-500" : "bg-red-500")}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Status steps */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Status</h4>
          <div className="relative space-y-4 pl-3">
            <div className="absolute left-[19px] top-2 bottom-4 w-px bg-border/40" />
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const isTerminal = currentIdx === STATUS_STEPS.length - 1;
              return (
                <div key={step} className="relative flex items-center gap-4 text-sm">
                  <div
                    className={cn(
                      "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ring-4 ring-background transition-all",
                      isCompleted
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                        : "bg-white/5 border-white/10 text-muted-foreground"
                    )}
                  >
                    {isCompleted && (!isCurrent || isTerminal) ? (
                      <CheckCircle2 className="size-4" />
                    ) : isCurrent ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Circle className="size-3" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.charAt(0) + step.slice(1).toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction hashes */}
        {data.txHashes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Transactions</h4>
            {data.txHashes.map((hash) => (
              <a
                key={hash}
                href={`https://polygonscan.com/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-mono text-sky-500 hover:text-sky-400 transition-colors"
              >
                {hash.slice(0, 10)}...{hash.slice(-8)}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            ))}
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
          <span>Created: {fmtTime(data.createdAt)}</span>
          <span>Updated: {fmtTime(data.updatedAt)}</span>
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
