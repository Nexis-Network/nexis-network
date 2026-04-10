import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { PieChart, ShieldAlert, TrendingUp, Wallet } from "lucide-react";

export interface PortfolioAnalysisData {
  totalValue: number;
  riskScore: number;
  assets: {
    symbol: string;
    allocation: number;
    value: number;
    amount: number;
  }[];
  insights?: string[];
}

export function PortfolioAnalysisArtifact({ data }: { data: PortfolioAnalysisData }) {
  const isHighRisk = data.riskScore > 70;
  const isMedRisk = data.riskScore > 40 && data.riskScore <= 70;
  
  const riskBadgeVariant = isHighRisk ? "destructive" : isMedRisk ? "secondary" : "outline";

  // Sort assets by allocation desc
  const sortedAssets = [...data.assets].sort((a, b) => b.allocation - a.allocation);

  return (
    <Artifact className="space-y-0">
        <ArtifactHeader>
            <div className="flex items-center gap-2">
                <PieChart className="size-4 text-sky-500" />
                <ArtifactTitle>Portfolio Assessment</ArtifactTitle>
            </div>
            <ArtifactActions>
                <Badge variant={riskBadgeVariant} className="flex items-center gap-1 text-[10px] uppercase">
                    <ShieldAlert className="size-3" /> 
                    Risk: {data.riskScore}/100
                </Badge>
            </ArtifactActions>
        </ArtifactHeader>

        <ArtifactContent className="space-y-6">
            {/* Hero Stats */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 flex flex-col items-center justify-center text-center">
                <div className="p-2 rounded-full bg-sky-500/20 text-sky-500 mb-2">
                    <Wallet className="size-5" />
                </div>
                <p className="text-[10px] font-bold uppercase text-sky-600/80 dark:text-sky-400/80 tracking-widest mb-1">Total Value</p>
                <p className="text-4xl font-bold tracking-tighter text-foreground">
                    ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Allocation */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Asset Allocation
                    <div className="h-px flex-1 bg-border/40" />
                </h4>
                <div className="space-y-3">
                    {sortedAssets.map((asset, idx) => (
                        <div key={idx} className="group relative">
                            <div className="flex items-center justify-between text-sm z-10 relative">
                                <div className="flex items-center gap-3">
                                    <div className="font-bold text-foreground w-8">{asset.symbol}</div>
                                    <span className="text-xs text-muted-foreground">{(asset.amount).toLocaleString()} tokens</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium numeric-tabular">${asset.value.toLocaleString()}</div>
                                    <div className="text-[10px] text-muted-foreground text-right">{asset.allocation}%</div>
                                </div>
                            </div>
                            {/* Background Bar */}
                            <div className="absolute bottom-0 left-0 h-0.5 bg-muted w-full mt-2 rounded-full overflow-hidden opacity-50">
                                <div className="h-full bg-sky-500" style={{ width: `${asset.allocation}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        AI Insights
                        <div className="h-px flex-1 bg-border/40" />
                    </h4>
                    <div className="grid gap-2">
                        {data.insights.map((insight, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground/80 flex gap-3 hover:bg-white/10 transition-colors">
                            <TrendingUp className="size-4 text-[#8eb94f] shrink-0 mt-0.5" />
                            <span className="leading-relaxed text-xs">{insight}</span>
                        </div>
                        ))}
                    </div>
                </div>
            )}
        </ArtifactContent>
    </Artifact>
  );
}
