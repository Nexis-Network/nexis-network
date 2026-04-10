"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowDownUp } from "lucide-react";
import { formatCents, formatSize, safeNum, truncateHash } from "./utils";

interface OrderLevel {
  /** Price as string from API (0-1 range) */
  price: string;
  /** Size as string from API */
  size: string;
}

export interface OrderbookArtifactData {
  tokenId: string;
  market: string;
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread: string;
  midpoint: string;
  lastPrice?: string;
  hash: string;
  timestamp: string;
}

export function OrderbookArtifact({ data }: { data: OrderbookArtifactData }) {
  const bids = data.bids.map((b) => ({ price: safeNum(b.price), size: safeNum(b.size) }));
  const asks = data.asks.map((a) => ({ price: safeNum(a.price), size: safeNum(a.size) }));
  const maxBidSize = Math.max(...bids.map((b) => b.size), 1);
  const maxAskSize = Math.max(...asks.map((a) => a.size), 1);

  if (bids.length === 0 && asks.length === 0) {
    return (
      <Artifact className="space-y-0">
        <ArtifactHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-blue-500" />
            <ArtifactTitle>Order Book</ArtifactTitle>
          </div>
        </ArtifactHeader>
        <ArtifactContent>
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No orders available
          </div>
        </ArtifactContent>
      </Artifact>
    );
  }

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-blue-500" />
          <ArtifactTitle>Order Book</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-background/50">
            Polymarket
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-4">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{data.market}</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Midpoint", value: formatCents(data.midpoint) },
            { label: "Spread", value: `${(safeNum(data.spread) * 100).toFixed(2)}c` },
            { label: "Last Price", value: data.lastPrice ? formatCents(data.lastPrice) : "N/A" },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-card/30 border border-border/40 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-sm font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-2 flex items-center gap-1">
              <ArrowDownUp className="size-3" aria-hidden /> Bids
            </p>
            <div className="space-y-1" role="list" aria-label="Bid levels">
              {bids.slice(0, 8).map((bid, idx) => (
                <div key={idx} role="listitem" className="relative flex items-center justify-between rounded px-2 py-1 text-xs overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/10 rounded transition-all"
                    style={{ width: `${(bid.size / maxBidSize) * 100}%` }}
                  />
                  <span className="relative z-10 font-mono text-emerald-500">{formatCents(bid.price)}</span>
                  <span className="relative z-10 font-mono text-muted-foreground">{formatSize(bid.size)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-2 flex items-center gap-1">
              <ArrowDownUp className="size-3" aria-hidden /> Asks
            </p>
            <div className="space-y-1" role="list" aria-label="Ask levels">
              {asks.slice(0, 8).map((ask, idx) => (
                <div key={idx} role="listitem" className="relative flex items-center justify-between rounded px-2 py-1 text-xs overflow-hidden">
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500/10 rounded transition-all"
                    style={{ width: `${(ask.size / maxAskSize) * 100}%` }}
                  />
                  <span className="relative z-10 font-mono text-red-500">{formatCents(ask.price)}</span>
                  <span className="relative z-10 font-mono text-muted-foreground">{formatSize(ask.size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
          <span>Hash: {truncateHash(data.hash)}</span>
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
