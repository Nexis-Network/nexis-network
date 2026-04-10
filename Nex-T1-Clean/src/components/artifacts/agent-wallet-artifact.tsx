import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Wallet, Copy, ExternalLink, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Asset = {
    symbol: string;
    amount: number;
    value: number;
    change24h?: number;
    price?: number;
};

type WalletData = {
    address: string;
    chain: string;
    balance?: string;
    totalValue?: number;
    change24h?: number;
    tags?: string[];
    exportHint?: string;
    assets?: Asset[];
};

type AgentWalletArtifactProps = {
    data: {
        wallets: WalletData[];
    };
};

export function AgentWalletArtifact({ data }: AgentWalletArtifactProps) {
    return (
        <Artifact className="h-full flex flex-col">
            <ArtifactHeader>
                <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-sky-500" />
                    <ArtifactTitle>Agent Wallets</ArtifactTitle>
                </div>
                <ArtifactActions>
                    <Badge variant="outline" className="text-[10px] bg-background/50">
                        {data.wallets?.length ?? 0} Active
                    </Badge>
                </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent className="flex-1 p-0 min-h-[300px]">
                <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 opacity-80 shrink-0" />
                <ScrollArea className="h-full max-h-[500px] p-4">
                    <div className="space-y-4 pb-4">
                        {data.wallets.map((wallet) => (
                            <WalletCard key={`${wallet.chain}:${wallet.address}`} wallet={wallet} />
                        ))}
                    </div>
                </ScrollArea>
            </ArtifactContent>
        </Artifact>
    );
}

function WalletCard({ wallet }: { wallet: WalletData }) {
    const [copied, setCopied] = useState(false);
    const resetCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (resetCopyTimeoutRef.current) {
                clearTimeout(resetCopyTimeoutRef.current);
            }
        };
    }, []);

    const copyAddress = () => {
        navigator.clipboard.writeText(wallet.address);
        setCopied(true);
        if (resetCopyTimeoutRef.current) {
            clearTimeout(resetCopyTimeoutRef.current);
        }
        resetCopyTimeoutRef.current = setTimeout(() => {
            setCopied(false);
            resetCopyTimeoutRef.current = null;
        }, 2000);
    };

    // Calculate total value if not provided
    const totalValue = wallet.totalValue ?? wallet.assets?.reduce((acc, asset) => acc + asset.value, 0) ?? 0;

    // Premium Sky Palette
    const colors = ["bg-sky-500", "bg-indigo-500", "bg-[#8eb94f]", "bg-violet-500", "bg-blue-400", "bg-teal-400"];

    return (
        <div className="rounded-xl border border-border/40 bg-background/40 overflow-hidden hover:border-sky-500/30 transition-all group">
            {/* Header / Address */}
            <div className="p-3 pb-2 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[9px] font-bold tracking-wider border-sky-500/20 text-sky-600 dark:text-sky-400 bg-sky-500/5">
                        {wallet.chain}
                    </Badge>
                    {wallet.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1.5 opacity-70">
                            {tag}
                        </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={copyAddress}
                        className="p-1.5 hover:bg-sky-500/10 rounded-md transition-colors text-muted-foreground hover:text-sky-500"
                        title="Copy Address"
                    >
                        {copied ? <Check className="h-3 w-3 text-[#8eb94f]" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <a
                        href="#"
                        className="p-1.5 hover:bg-sky-500/10 rounded-md transition-colors text-muted-foreground hover:text-sky-500"
                        title="View on Explorer"
                    >
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>

            <div className="px-3 pb-3">
                <div className="font-mono text-[10px] text-muted-foreground break-all mb-3 pt-2 opacity-70 hover:opacity-100 transition-opacity">
                    {wallet.address}
                </div>

                {/* Balance Section */}
                <div className="mb-4">
                    <div className="flex items-baseline justify-between">
                         <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Total Value</p>
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                         </div>
                        {wallet.change24h !== undefined && (
                            <div className={cn(
                                "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                                wallet.change24h >= 0 ? "text-[#8eb94f] bg-[#8eb94f]/10" : "text-destructive bg-destructive/10"
                            )}>
                                {wallet.change24h >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                {Math.abs(wallet.change24h)}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Visual Asset Bar */}
                {wallet.assets && wallet.assets.length > 0 && (
                    <div className="mb-4">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                            {wallet.assets.map((asset, i) => {
                                const percentage = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
                                if (percentage < 1) return null; 
                                return (
                                    <div
                                        key={asset.symbol}
                                        className={cn("h-full", colors[i % colors.length])}
                                        style={{ width: `${percentage}%` }}
                                        title={`${asset.symbol}: ${percentage.toFixed(1)}%`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Assets List */}
                {wallet.assets && wallet.assets.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {wallet.assets.map((asset, i) => (
                            <div key={asset.symbol} className="flex items-center justify-between p-1.5 rounded bg-background/50 border border-border/20">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors[i % colors.length])} />
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{asset.symbol}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                   ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {wallet.exportHint && (
                    <div className="mt-4 rounded border border-amber-500/20 bg-amber-500/5 p-2 flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                            <span className="font-bold uppercase text-[9px] mr-1">Private Key:</span>
                            {wallet.exportHint}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
