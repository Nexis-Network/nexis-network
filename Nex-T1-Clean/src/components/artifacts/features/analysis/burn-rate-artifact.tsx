"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BurnRateArtifactData {
  monthlyBurn: number;
  runway: number;
  recommendations?: string[];
}

export function BurnRateArtifact({ data }: { data: BurnRateArtifactData }) {
  // Determine health based on runway
  const isCritical = data.runway < 3;
  const isWarning = data.runway >= 3 && data.runway < 6;
  
  const runwayColor = isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-[#8eb94f]";
  const runwayProgressColor = isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-[#8eb94f]";
  // Cap runway at 12 for progress bar visualization (12+ is full bar)
  const progressValue = Math.min((data.runway / 12) * 100, 100);

  return (
    <Artifact className="space-y-0">
      <ArtifactHeader>
           <div className="flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <ArtifactTitle>Burn Rate Overview</ArtifactTitle>
           </div>
           <ArtifactActions>
                {isCritical && (
                  <Badge variant="destructive" className="flex items-center gap-1 text-[10px] uppercase">
                    <AlertTriangle className="size-3" /> Critical
                  </Badge>
                )}
           </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 p-4 rounded-xl bg-card/30 border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Monthly Burn</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  ${data.monthlyBurn?.toLocaleString() || "0"}
                </span>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            
            <div className="space-y-1 p-4 rounded-xl bg-card/30 border border-border/40 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Runway</p>
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold tracking-tight", runwayColor)}>
                  {data.runway} <span className="text-sm font-normal text-muted-foreground">months</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Runway Health</span>
              <span className={runwayColor}>{data.runway >= 12 ? "Excellent (12+ Months)" : `${data.runway} Months Remaining`}</span>
            </div>
            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full transition-all duration-500 ease-out", runwayProgressColor)} 
                    style={{ width: `${progressValue}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>0m</span>
              <span>6m</span>
              <span>12m+</span>
            </div>
          </div>

          {data.recommendations && data.recommendations.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-3 w-3 text-sky-500" />
                Optimization Recommended
              </h4>
              <ul className="grid gap-2">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-muted-foreground group p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <ArrowRight className="h-4 w-4 text-sky-500/50 shrink-0 mt-0.5 group-hover:text-sky-500 transition-colors" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </ArtifactContent>
    </Artifact>
  );
}
