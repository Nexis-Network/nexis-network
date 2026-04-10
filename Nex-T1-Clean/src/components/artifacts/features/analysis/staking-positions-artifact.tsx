"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Award } from "lucide-react";

export interface StakingPositionsData {
  totalStaked: number;
  averageApy: number;
  positions: {
    protocol: string;
    asset: string;
    amount: number;
    value: number;
    apy: number;
    rewardsPending?: number;
  }[];
}

export function StakingPositionsArtifact({ data }: { data: StakingPositionsData }) {
    return (
        <Artifact className="space-y-0">
            <ArtifactHeader>
                <div className="flex items-center gap-2">
                    <Lock className="size-4 text-[#8eb94f]" />
                    <ArtifactTitle>Staking Overview</ArtifactTitle>
                </div>
                <ArtifactActions>
                    <Badge variant="outline" className="border-emerald-500/30 text-[#8eb94f] bg-[#8eb94f]/5">
                        Avg APY {data.averageApy.toFixed(2)}%
                    </Badge>
                </ArtifactActions>
            </ArtifactHeader>

            <ArtifactContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card/30 border border-border/40 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Total Staked</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">${data.totalStaked.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-card/30 border border-border/40 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Active Positions</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{data.positions.length}</p>
                </div>
                </div>

                <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Positions</h4>
                <div className="space-y-3">
                        {data.positions.map((pos, idx) => (
                            <div key={idx} className="relative overflow-hidden rounded-lg border border-border/40 bg-white/5 hover:bg-white/10 transition-colors p-4 group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-sm flex items-center gap-2 text-foreground">
                                        {pos.protocol}
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{pos.asset}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-[#8eb94f] flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        {pos.apy}%
                                    </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                <div className="text-xs text-muted-foreground">
                                    {pos.amount.toLocaleString()} {pos.asset}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-foreground">${pos.value.toLocaleString()}</div>
                                    {pos.rewardsPending && (
                                        <div className="text-[10px] text-[#8eb94f] flex items-center justify-end gap-1 mt-0.5 font-medium">
                                            <Award className="h-3 w-3" />
                                            +{pos.rewardsPending} pending
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        ))}
                </div>
                </div>
            </ArtifactContent>
        </Artifact>
    );
}
