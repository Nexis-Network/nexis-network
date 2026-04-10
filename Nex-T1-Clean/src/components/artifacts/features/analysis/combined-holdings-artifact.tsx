import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Layers } from "lucide-react";

export interface CombinedHoldingsData {
  totalValue: number;
  wallets: string[]; // addresses or IDs
  assets: {
    symbol: string;
    chain: string;
    source: string;
    value: number;
    amount: number;
  }[];
}

export function CombinedHoldingsArtifact({ data }: { data: CombinedHoldingsData }) {
    return (
        <Artifact className="space-y-0">
            <ArtifactHeader>
                <div className="flex items-center gap-2">
                    <Layers className="size-4 text-[#8eb94f]" />
                    <ArtifactTitle>Multi-Wallet Holdings</ArtifactTitle>
                </div>
                <ArtifactActions>
                    <Badge variant="outline" className="text-[10px] bg-background/50">
                        {data.wallets.length} Wallets
                    </Badge>
                </ArtifactActions>
            </ArtifactHeader>

            <ArtifactContent className="space-y-6">
                {/* Hero Total */}
                <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-gradient-to-b from-emerald-500/5 to-sky-500/5 border border-emerald-500/10">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest mb-2">Total Net Worth</p>
                    <h2 className="text-5xl font-bold tracking-tighter text-foreground mb-3">
                        ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </h2>
                     <div className="flex items-center gap-1.5 text-xs text-[#8eb94f] bg-[#8eb94f]/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <ArrowUpRight className="h-3 w-3" />
                        <span className="font-medium">Aggregated Live</span>
                     </div>
                </div>

                {/* Holdings List */}
                <div className="space-y-4">
                     <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Top Assets</h4>
                    <div className="space-y-2">
                        {data.assets.map((asset, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card/30 border border-border/40 hover:border-sky-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-foreground ring-1 ring-white/10">
                                        {asset.symbol.slice(0,2)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm flex items-center gap-2 text-foreground">
                                            {asset.symbol}
                                            <Badge variant="secondary" className="h-4 px-1 text-[9px] uppercase tracking-wide opacity-70 group-hover:opacity-100 transition-opacity">
                                                {asset.chain}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {asset.source} • {asset.amount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-sm text-foreground">${asset.value.toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ArtifactContent>
        </Artifact>
    );
}
