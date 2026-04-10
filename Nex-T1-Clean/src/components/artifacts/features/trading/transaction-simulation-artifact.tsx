"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, Activity, Loader2 } from "lucide-react";
import { EvCharger } from "@/components/animate-ui/icons/ev-charger";
import { Gauge } from "@/components/animate-ui/icons/gauge";
import { cn } from "@/lib/utils";

export interface TransactionSimulationData {
  status: "success" | "failure";
  fromToken: { symbol: string; amount: string; logo?: string };
  toToken: { symbol: string; amount: string; logo?: string };
  gasEstimate: string;
  error?: string;
  steps: { name: string; status: "completed" | "failed" | "pending" }[];
}

export function TransactionSimulationArtifact({ data }: { data: TransactionSimulationData }) {
  return (
    <Artifact className="space-y-0">
        <ArtifactHeader>
            <div className="flex items-center gap-2">
                <Activity className={cn("size-4", data.status === "success" ? "text-[#8eb94f]" : "text-destructive")} />
                <ArtifactTitle>Simulation Result</ArtifactTitle>
            </div>
            <ArtifactActions>
                <Badge 
                    variant={data.status === "success" ? "outline" : "destructive"} 
                    className={cn(
                        "uppercase text-[10px] tracking-wider",
                        data.status === "success" ? "border-emerald-500/30 text-[#8eb94f] bg-[#8eb94f]/10" : ""
                    )}
                >
                    {data.status === "success" ? "Success" : "Failed"}
                </Badge>
            </ArtifactActions>
        </ArtifactHeader>

        <ArtifactContent className="space-y-6">
            {/* Token Flow Hero */}
            <div className="flex items-center justify-between gap-4 p-6 bg-white/[0.02] rounded-[16px] border border-white/5 relative overflow-hidden">
                 {/* Background Gradient */}
                 <div className={cn(
                     "absolute inset-0 opacity-20 pointer-events-none",
                     data.status === "success" ? "bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" : "bg-destructive/10"
                 )} />
                 
                <div className="text-center relative z-10 min-w-[30%]">
                  <div className="text-2xl font-bold tracking-tight text-foreground">{data.fromToken.amount}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mt-1">{data.fromToken.symbol}</div>
                </div>
                
                <div className="relative z-10 flex flex-col items-center justify-center text-muted-foreground/50">
                    <ArrowRight className="w-6 h-6" />
                    <span className="text-[9px] uppercase tracking-widest mt-1">Swap</span>
                </div>
                
                <div className="text-center relative z-10 min-w-[30%]">
                  <div className="text-2xl font-bold tracking-tight text-foreground">{data.toToken.amount}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mt-1">{data.toToken.symbol}</div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-4 rounded-lg bg-card/30 border border-border/40">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <EvCharger className="h-3 w-3" animateOnHover />
                        Est. Gas
                    </p>
                    <p className="font-mono text-sm font-medium text-foreground">{data.gasEstimate}</p>
                </div>
                {data.error && (
                   <div className="col-span-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-destructive">
                     <AlertTriangle className="w-5 h-5 shrink-0" />
                     <span className="text-sm font-medium leading-relaxed">{data.error}</span>
                   </div>
                )}
            </div>

            {/* Steps Timeline */}
            <div className="pt-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2 mb-4">
                    <Gauge className="h-3 w-3" animateOnHover />
                    Execution Steps
                    <div className="h-px flex-1 bg-border/40" />
                </div>
                <div className="relative space-y-4 pl-3">
                    {/* Vertical Line */}
                    <div className="absolute left-[19px] top-2 bottom-4 w-px bg-border/40" />

                    {data.steps.map((step, idx) => (
                        <div key={idx} className="relative flex items-center gap-4 text-sm group">
                            <div className={cn(
                                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ring-4 ring-background",
                                step.status === "completed" ? "bg-[#8eb94f]/10 border-emerald-500/50 text-[#8eb94f]" : 
                                step.status === "failed" ? "bg-destructive border-destructive text-white" : 
                                "bg-white/5 border-white/5 text-muted-foreground"
                            )}>
                                 {step.status === "completed" ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                 ) : step.status === "failed" ? (
                                    <XCircle className="w-4 h-4" />
                                 ) : (
                                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                                 )}
                            </div>
                            <span className={cn(
                                "font-medium transition-colors text-sm",
                                step.status === "failed" ? "text-destructive" : 
                                step.status === "completed" ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </ArtifactContent>
    </Artifact>
  );
}
