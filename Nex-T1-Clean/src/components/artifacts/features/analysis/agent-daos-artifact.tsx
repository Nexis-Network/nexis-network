"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ScrollText, Coins } from "lucide-react";

export interface AgentDaosData {
  daos: {
    name: string;
    chain: string;
    role: string;
    treasuryValue: number;
    proposalCount: number;
    contractAddress: string;
  }[];
}

export function AgentDaosArtifact({ data }: { data: AgentDaosData }) {
    return (
        <Artifact className="space-y-0">
             <ArtifactHeader>
                 <div className="flex items-center gap-2">
                     <Building2 className="size-4 text-violet-500" />
                     <ArtifactTitle>Agent-Managed DAOs</ArtifactTitle>
                 </div>
                 <ArtifactActions>
                    <Badge variant="secondary" className="text-[10px]">
                        {data.daos.length} Active
                    </Badge>
                 </ArtifactActions>
             </ArtifactHeader>

             <ArtifactContent className="space-y-4">
                {data.daos.map((dao, idx) => (
                    <div key={idx} className="rounded-xl border border-border/40 bg-card/30 p-5 hover:border-violet-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-base text-foreground">{dao.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wide border-border/50">{dao.chain}</Badge>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">{dao.role}</span>
                                </div>
                            </div>
                            <div className="p-2 rounded-full bg-violet-500/10 text-violet-500">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                                    <Coins className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wider">Treasury</span>
                                </div>
                                <p className="font-semibold text-sm text-foreground">${dao.treasuryValue.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                                    <ScrollText className="h-3 w-3" />
                                    <span className="text-[10px] uppercase tracking-wider">Proposals</span>
                                </div>
                                <p className="font-semibold text-sm text-foreground">{dao.proposalCount} Active</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/20">
                             <p className="text-[9px] font-mono text-muted-foreground/60 break-all cursor-pointer hover:text-muted-foreground transition-colors group-hover:text-foreground/80">
                                 {dao.contractAddress}
                             </p>
                        </div>
                    </div>
                ))}
            </ArtifactContent>
        </Artifact>
    );
}
