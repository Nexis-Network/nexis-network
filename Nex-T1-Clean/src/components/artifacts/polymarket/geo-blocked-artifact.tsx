"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GeoBlockedArtifactData {
  blocked: boolean;
  closeOnly: boolean;
  country: string;
  reason: string;
}

export function GeoBlockedArtifact({ data }: { data: GeoBlockedArtifactData }) {
  const isFullBlock = data.blocked;
  const isCloseOnly = !data.blocked && data.closeOnly;

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          {isFullBlock ? (
            <ShieldX className="size-4 text-red-500" />
          ) : (
            <ShieldAlert className="size-4 text-amber-500" />
          )}
          <ArtifactTitle>Access Restriction</ArtifactTitle>
        </div>
      </ArtifactHeader>

      <ArtifactContent className="space-y-4">
        {/* Status banner */}
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border text-center",
            isFullBlock
              ? "bg-red-500/5 border-red-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          )}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              isFullBlock ? "bg-red-500/10" : "bg-amber-500/10"
            )}
          >
            {isFullBlock ? (
              <ShieldX className={cn("size-7 text-red-500")} />
            ) : (
              <AlertTriangle className={cn("size-7 text-amber-500")} />
            )}
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              isFullBlock
                ? "border-red-500/30 text-red-500 bg-red-500/5"
                : "border-amber-500/30 text-amber-500 bg-amber-500/5"
            )}
          >
            {isFullBlock ? "Blocked" : "Close-Only"}
          </Badge>

          <p className={cn("text-sm font-medium", isFullBlock ? "text-red-400" : "text-amber-400")}>
            {isFullBlock
              ? "Trading is not available in your region"
              : "New positions cannot be opened from your region"}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 rounded-xl bg-card/30 border border-border/40 p-4">
          {[
            { label: "Country", value: data.country },
            { label: "Status", value: isFullBlock ? "Fully Blocked" : isCloseOnly ? "Close-Only Mode" : "Unknown" },
            { label: "Reason", value: data.reason },
          ].map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 text-xs py-1">
              <span className="text-muted-foreground shrink-0">{row.label}</span>
              <span className="text-foreground text-right">{row.value}</span>
            </div>
          ))}
        </div>

        {isCloseOnly && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            You can still close existing positions and withdraw funds. No new trades or deposits are permitted.
          </p>
        )}
      </ArtifactContent>
    </Artifact>
  );
}
