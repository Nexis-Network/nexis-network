"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, CheckCircle2, Loader2, Circle, ExternalLink, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type BridgeStatus = "DEPOSIT_DETECTED" | "PROCESSING" | "SUBMITTED" | "COMPLETED";

interface BridgeTransaction {
  fromChainId: number;
  fromAmountBaseUnit: string;
  status: BridgeStatus;
  txHash: string;
  createdTimeMs: number;
}

export interface BridgeStatusArtifactData {
  depositAddress: string;
  transactions: BridgeTransaction[];
}

const BRIDGE_STEPS: BridgeStatus[] = ["DEPOSIT_DETECTED", "PROCESSING", "SUBMITTED", "COMPLETED"];

const STEP_LABELS: Record<BridgeStatus, string> = {
  DEPOSIT_DETECTED: "Deposit Detected",
  PROCESSING: "Processing",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

const STEP_INDEX: Record<BridgeStatus, number> = {
  DEPOSIT_DETECTED: 0,
  PROCESSING: 1,
  SUBMITTED: 2,
  COMPLETED: 3,
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  10: "Optimism",
  42161: "Arbitrum",
  8453: "Base",
};

function fmtTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(ms);
  }
}

function fmtAmount(baseUnit: string): string {
  try {
    const n = Number(baseUnit) / 1e6;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
  } catch {
    return baseUnit;
  }
}

export function BridgeStatusArtifact({ data }: { data: BridgeStatusArtifactData }) {
  const hasTransactions = data.transactions && data.transactions.length > 0;

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-4 text-violet-500" />
          <ArtifactTitle>Bridge Status</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-background/50">
            {data.transactions?.length ?? 0} Tx{(data.transactions?.length ?? 0) !== 1 ? "s" : ""}
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-5">
        {/* Deposit address */}
        <div className="p-3 rounded-lg bg-card/30 border border-border/40">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Deposit Address</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-foreground truncate flex-1">
              {data.depositAddress}
            </code>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(data.depositAddress).catch(() => { /* clipboard unavailable */ }); }}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Copy deposit address"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>

        {!hasTransactions ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No bridge transactions yet
          </div>
        ) : (
          data.transactions.map((tx) => {
            const currentIdx = STEP_INDEX[tx.status] ?? 0;
            const chainName = CHAIN_NAMES[tx.fromChainId] ?? `Chain ${tx.fromChainId}`;
            const explorerBase = tx.fromChainId === 137 ? "https://polygonscan.com/tx/" : "https://etherscan.io/tx/";
            const txKey = tx.txHash ?? `${tx.fromChainId}-${tx.createdTimeMs}-${tx.fromAmountBaseUnit}`;

            return (
              <div key={txKey} className="space-y-3 rounded-xl border border-border/40 bg-white/[0.02] p-4">
                {/* Tx header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] h-5 px-1.5">{chainName}</Badge>
                    <span className="text-sm font-bold text-foreground">{fmtAmount(tx.fromAmountBaseUnit)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{fmtTime(tx.createdTimeMs)}</span>
                </div>

                {/* Step timeline */}
                <div className="flex items-center gap-1">
                  {BRIDGE_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={step} className="flex items-center flex-1 gap-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-white/5 text-muted-foreground"
                            )}
                          >
                            {isCompleted && (!isCurrent || currentIdx === BRIDGE_STEPS.length - 1) ? (
                              <CheckCircle2 className="size-3.5" />
                            ) : isCurrent ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Circle className="size-2.5" />
                            )}
                          </div>
                          <span className={cn("text-[8px] text-center leading-tight", isCompleted ? "text-foreground" : "text-muted-foreground")}>
                            {STEP_LABELS[step]}
                          </span>
                        </div>
                        {idx < BRIDGE_STEPS.length - 1 && (
                          <div className={cn("h-px flex-1 -mt-4", idx < currentIdx ? "bg-emerald-500/50" : "bg-border/40")} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tx hash */}
                <a
                  href={`${explorerBase}${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-mono text-sky-500 hover:text-sky-400 transition-colors"
                >
                  {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>
            );
          })
        )}
      </ArtifactContent>
    </Artifact>
  );
}
