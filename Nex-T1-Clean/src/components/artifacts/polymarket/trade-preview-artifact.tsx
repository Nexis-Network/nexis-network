"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNum, formatUsd, formatCents } from "./utils";

interface TradeOrder {
  tokenId: string;
  side: "BUY" | "SELL";
  /** Price as string or number from API (0-1 range) */
  price: string | number;
  /** Size as string or number from API */
  size: string | number;
  orderType: string;
  tickSize: string;
  negRisk: boolean;
}

interface TradeEstimate {
  /** All values as string from API (.toFixed()) or number */
  cost: string | number;
  fees: string | number;
  total: string | number;
  potentialPayout: string | number;
}

export interface TradePreviewArtifactData {
  /** Market question - may be absent from some API flows */
  market?: string;
  order: TradeOrder;
  estimate: TradeEstimate;
  approvalToken: string;
}

export function TradePreviewArtifact({
  data,
  onConfirm,
  onCancel,
}: {
  data: TradePreviewArtifactData;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const isBuy = data.order.side === "BUY";
  const price = safeNum(data.order.price);
  const size = safeNum(data.order.size);

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <ShoppingCart className={cn("size-4", isBuy ? "text-emerald-500" : "text-red-500")} />
          <ArtifactTitle>Trade Preview</ArtifactTitle>
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
            {data.order.side}
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-4">
        {data.market && (
          <p className="text-sm font-medium text-foreground leading-snug">{data.market}</p>
        )}

        {data.order.negRisk && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs leading-relaxed">
              This is a <strong>neg-risk</strong> market. Outcomes are complementary -- your maximum loss is your total cost.
            </p>
          </div>
        )}

        {/* Order details */}
        <div className="space-y-2 rounded-xl bg-card/30 border border-border/40 p-4">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Order Details</h4>
          {[
            { label: "Side", value: data.order.side, highlight: true },
            { label: "Price", value: formatCents(price) },
            { label: "Size", value: size.toLocaleString() },
            { label: "Order Type", value: data.order.orderType },
            { label: "Tick Size", value: data.order.tickSize },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  row.highlight
                    ? isBuy ? "text-emerald-500" : "text-red-500"
                    : "text-foreground"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Cost estimate */}
        <div className="space-y-2 rounded-xl bg-card/30 border border-border/40 p-4">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Estimate</h4>
          {[
            { label: "Cost", value: formatUsd(data.estimate.cost) },
            { label: "Fees", value: formatUsd(data.estimate.fees) },
            { label: "Total", value: formatUsd(data.estimate.total), bold: true },
            { label: "Potential Payout", value: formatUsd(data.estimate.potentialPayout), bold: true },
          ].map((row) => (
            <div key={row.label} className={cn("flex items-center justify-between text-xs", row.bold && "pt-1 border-t border-border/30")}>
              <span className={cn("text-muted-foreground", row.bold && "font-semibold text-foreground")}>{row.label}</span>
              <span className={cn("font-mono", row.bold ? "font-bold text-foreground" : "text-foreground")}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={onConfirm}
            className={cn(
              "flex-1 font-bold",
              isBuy
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            Confirm {isBuy ? "Buy" : "Sell"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
