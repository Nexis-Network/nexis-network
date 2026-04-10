
"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  MessageSquare,
  Crown,
  Clock,
  User,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TokenArtifactData {
  name: string;
  symbol: string;
  marketCap: string;
  bondingCurveProgress: number;
  kingOfTheHill: boolean;
  replies: number;
  recentChat: {
    user: string;
    message: string;
    time: string;
  }[];
}

export function TokenArtifact({ data }: { data: TokenArtifactData }) {
  const isKoth = data.kingOfTheHill;
  const progressColor = data.bondingCurveProgress >= 100 
    ? "bg-[#8eb94f]" 
    : data.bondingCurveProgress > 50 
      ? "bg-amber-500" 
      : "bg-sky-500";

  return (
    <Artifact className="space-y-0 w-full max-w-full">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
           <Activity className="size-4 text-sky-500" />
           <ArtifactTitle>Token Analysis</ArtifactTitle>
        </div>
        <ArtifactActions>
           <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-background/50">
              Pump.fun
           </Badge>
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="space-y-6">
         {/* Token Header */}
         <div className="flex flex-col gap-4">
             <div className="flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {data.name} <span className="text-muted-foreground text-lg font-normal">$ {data.symbol}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-[#8eb94f]/10 text-[#8eb94f] border-emerald-500/20">
                            MC: {data.marketCap}
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            <MessageSquare className="w-3 h-3 mr-1" /> {data.replies} Replies
                        </Badge>
                        {isKoth && (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse">
                                <Crown className="w-3 h-3 mr-1" /> King of the Hill
                            </Badge>
                        )}
                    </div>
                 </div>
             </div>

             {/* Bonding Curve */}
             <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Bonding Curve
                    </span>
                    <span className={cn("text-xs font-bold", data.bondingCurveProgress >= 100 ? "text-[#8eb94f]" : "text-foreground")}>
                        {data.bondingCurveProgress}%
                    </span>
                </div>
                <Progress value={data.bondingCurveProgress} className="h-2" indicatorClassName={progressColor} />
                <p className="text-[10px] text-muted-foreground text-right w-full pt-1">Target: 100% to migrate to Raydium</p>
             </div>
         </div>

         {/* Chat Digest */}
         <div className="space-y-3">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Recent Activity
                </h3>
             </div>
             
             <ScrollArea className="h-[200px] w-full rounded-md border p-1 bg-background/20">
                 <div className="space-y-2 p-2">
                    {data.recentChat && data.recentChat.length > 0 ? (
                        data.recentChat.map((chat, idx) => (
                            <div key={idx} className="group p-2 rounded-lg bg-background/60 hover:bg-background/80 transition-colors border border-transparent hover:border-border/50">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-xs text-sky-500 flex items-center gap-1">
                                        <User className="w-3 h-3" /> {chat.user}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" /> {chat.time}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground/90 pl-4 border-l-2 border-border/50 group-hover:border-sky-500/50 transition-colors">
                                    {chat.message}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                            No recent chat data
                        </div>
                    )}
                 </div>
             </ScrollArea>
         </div>
      </ArtifactContent>
    </Artifact>
  );
}
