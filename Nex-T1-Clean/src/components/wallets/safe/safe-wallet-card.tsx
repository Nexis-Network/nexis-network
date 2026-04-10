"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, ShieldCheck, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { WalletPortfolio } from "@/lib/user/profile";
import { useWalletPortfolio } from "@/lib/hooks/portfolio/use-wallet-portfolio";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

interface SafeWalletCardProps {
  wallet: WalletPortfolio;
  className?: string;
}

export const SafeWalletCard: React.FC<SafeWalletCardProps> = ({ wallet, className }) => {
  // Extract metadata safely
  const metadata = wallet.metadata as Record<string, UntypedJson> | undefined;

  // Determine chainId: prefer metadata.chainId, default to 1 (Ethereum)
  const chainId = Number(metadata?.chainId || 1);

  const status = wallet.status || (metadata?.status as string) || "active";
  const isPending = status === "pending" || status === "provisioning";
  const rawAddress = wallet.address || "";
  const displayAddress = isPending ? "Creating..." : rawAddress;
  const isAddressReady = !isPending && isNonZeroEVMAddress(rawAddress);

  const { data: portfolioData, isLoading } = useWalletPortfolio(isAddressReady ? rawAddress : "", chainId);

  const copyAddress = () => {
    if (!isAddressReady) return;
    navigator.clipboard.writeText(rawAddress);
    toast.success("Address copied to clipboard");
  };

  const getChainInfo = (id: number) => {
    switch (id) {
        case 1: return { name: "Ethereum", icon: LIQUID_GLASS_LOGOS.ethereum, explorer: "https://etherscan.io" };
        case 8453: return { name: "Base", icon: "/icons/chain-icons/base.svg", explorer: "https://basescan.org" };
        case 10: return { name: "Optimism", icon: "/icons/chain-icons/optimism.svg", explorer: "https://optimistic.etherscan.io" };
        case 42161: return { name: "Arbitrum", icon: "/icons/chain-icons/arbitrum.svg", explorer: "https://arbiscan.io" };
        case 56: return { name: "BNB Chain", icon: LIQUID_GLASS_LOGOS.bnb, explorer: "https://bscscan.com" };
        default: return { name: "Chain " + id, icon: LIQUID_GLASS_LOGOS.ethereum, explorer: "" };
    }
  };

  const chainInfo = getChainInfo(chainId);

  return (
    <Card className={cn("p-4 border shadow-sm transition-all hover:border-primary/20", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted flex items-center justify-center border">
             <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <ShieldCheck className="h-5 w-5 text-green-600" />
             </div>
             <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-background p-0.5 border shadow-sm">
                 <Image src={chainInfo.icon} alt={chainInfo.name} width={12} height={12} className="w-full h-full" />
             </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Safe Wallet</h3>
                <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800/50">
                    {status}
                </span>
            </div>
            <p className="text-xs text-muted-foreground">{chainInfo.name}</p>
          </div>
        </div>
        
        {/* PnL Indicator */}
        {portfolioData && (
             <div className="text-right">
                <div className={cn(
                    "flex items-center justify-end text-xs font-mono font-normal",
                    portfolioData.pnlUsd >= 0 ? "text-green-500" : "text-red-500"
                )}>
                    {portfolioData.pnlUsd >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1"/> : <ArrowDownRight className="h-3 w-3 mr-1"/>}
                    {formatCurrency(Math.abs(portfolioData.pnlPercent))}%
                </div>
                <div className={cn("text-[10px] font-mono font-normal", portfolioData.pnlUsd >= 0 ? "text-green-500/80" : "text-red-500/80")}>
                    {portfolioData.pnlUsd >= 0 ? "+" : "-"}{formatCurrency(Math.abs(portfolioData.pnlUsd))}
                </div>
             </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Address Row */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                    {displayAddress}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70 hover:opacity-100"
                  disabled={!isAddressReady}
                  onClick={copyAddress}
                >
                    <Copy className="h-3 w-3" />
                </Button>
            </div>
             {chainInfo.explorer && isAddressReady && (
                <a href={`${chainInfo.explorer}/address/${rawAddress}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="h-3 w-3" />
                </a>
            )}
        </div>

        {/* Assets Row */}
         <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {/* Badges for Asset Types */}
            {portfolioData?.defi && portfolioData.defi.length > 0 && (
                <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">
                    DeFi
                </span>
            )}
             {portfolioData?.nfts && portfolioData.nfts.length > 0 && (
                <span className="bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded border border-purple-500/20">
                    NFTs
                </span>
            )}
            {(!portfolioData?.defi?.length && !portfolioData?.nfts?.length) && (
                <span className="opacity-50">Tokens Only</span>
            )}
         </div>

        {/* Balance Row */}
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Assets Value</span>
            {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
                <div className="flex flex-col items-end">
                  <span className="font-mono font-normal text-sm">
                      {formatCurrency(portfolioData?.netWorthUsd || 0)}
                  </span>
                  {/* Show Native Balance info slightly faded */}
                  {portfolioData?.native && Number(portfolioData.native.formatted) > 0 && (
                      <span className="text-[10px] font-mono font-normal text-muted-foreground">
                          {Number(portfolioData.native.formatted).toFixed(4)} ETH
                      </span>
                  )}
                </div>
            )}
        </div>
      </div>
    </Card>
  );
}
