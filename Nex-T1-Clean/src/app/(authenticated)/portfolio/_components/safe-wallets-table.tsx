"use client";

import { useState } from "react";

import { Copy, ExternalLink, ArrowUpRight, ArrowDownRight, Key, Scale, ShieldAlert, Trash2, ArrowRight, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { WalletPortfolio } from "@/lib/user/profile";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useWalletPortfolio } from "@/lib/hooks/portfolio/use-wallet-portfolio";
import { getJsonString } from "@/lib/json";
import {
  getWalletMetadata,
  resolveWalletRequestChainId,
  resolveWalletStatus,
} from "@/lib/portfolio/wallet-metadata";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface SafeWalletsTableProps {
  wallets?: WalletPortfolio[];
}

interface SafeWalletRowProps {
    wallet: WalletPortfolio;
}

function SafeWalletRow({ wallet }: SafeWalletRowProps) {

    const controls = useAnimation();
    const [isSlid, setIsSlid] = useState(false);

    // Extract metadata safely from wallet
    const resolvedChainId = resolveWalletRequestChainId(wallet);
    const chainId = typeof resolvedChainId === "number" ? resolvedChainId : 1;
    const status = resolveWalletStatus(wallet);
    const isPending = status === "pending" || status === "provisioning";
    const rawAddress = wallet.address || "";
    const displayAddress = isPending ? "Creating..." : rawAddress;
    const isAddressReady = !isPending && isNonZeroEVMAddress(rawAddress);

    // Fetch portfolio data for this wallet
    const { data: portfolioData, isLoading } = useWalletPortfolio(isAddressReady ? rawAddress : "", chainId);

    const copyAddress = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAddressReady) return;
        navigator.clipboard.writeText(rawAddress);
        toast.success("Address copied");
    };

    const getChainInfo = (id: number) => {
        switch (id) {
            case 1: return { name: "Ethereum", icon: "/icons/chain-icons/eth.svg", explorer: "https://etherscan.io" };
            case 8453: return { name: "Base", icon: "/icons/chain-icons/base.svg", explorer: "https://basescan.org" };
            case 10: return { name: "Optimism", icon: "/icons/chain-icons/optimism.svg", explorer: "https://optimistic.etherscan.io" };
            case 42161: return { name: "Arbitrum", icon: "/icons/chain-icons/arbitrum.svg", explorer: "https://arbiscan.io" };
            case 56: return { name: "BNB Chain", icon: "/icons/chain-icons/bnb-chain.svg", explorer: "https://bscscan.com" };
            default: return { name: "Chain " + id, icon: "/icons/chain-icons/eth.svg", explorer: "" };
        }
    };

    const chainInfo = getChainInfo(chainId);

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = -50;
        if (info.offset.x < threshold) {
            controls.start({ x: -260 }); // Reveal width
            setIsSlid(true);
        } else {
            controls.start({ x: 0 });
            setIsSlid(false);
        }
    };

    const toggleSlide = () => {
        if (isSlid) {
            controls.start({ x: 0 });
            setIsSlid(false);
        } else {
             controls.start({ x: -260 });
             setIsSlid(true);
        }
    };

    // Prepare Assets (Tokens & NFTs)
    const tokens = (portfolioData?.tokens || []).filter(t => t.logo && parseFloat(t.balance) > 0).slice(0, 4);
    const nfts = (portfolioData?.nfts || [])
        .map(n => n.normalized_metadata?.image || n.media?.original_media_url)
        .filter(Boolean)
        .slice(0, 3);

    return (
        <div className="relative w-full h-[72px] overflow-hidden rounded-lg mb-1 group/row border-b border-border">
            {/* Actions Background Layer */}
            <motion.div 
                initial={false}
                animate={{ 
                    opacity: isSlid ? 1 : 0,
                    pointerEvents: isSlid ? "auto" : "none"
                }}
                className="absolute inset-y-0 right-0 z-0 flex items-center bg-background dark:bg-[#0f0f10] h-full rounded-r-lg overflow-hidden borderContainer"
            >
                <Button
                    variant="ghost"
                    disabled
                    className="h-full rounded-none px-3 bg-background dark:bg-[#0f0f10] flex flex-col items-center justify-center gap-1 min-w-[60px] opacity-40 cursor-not-allowed"
                    title="Export is unavailable -- Safe wallets are migrating to Nex Wallets"
                >
                    <Key className="w-4 h-4 text-foreground/40 dark:text-white/40" />
                    <span className="text-[9px] text-foreground/30 dark:text-white/30">Export</span>
                </Button>
                <Button
                    variant="ghost"
                    disabled
                    className="h-full rounded-none px-3 bg-background dark:bg-[#0f0f10] flex flex-col items-center justify-center gap-1 min-w-[60px] opacity-40 cursor-not-allowed"
                    title="Allowance management is unavailable -- Safe wallets are migrating to Nex Wallets"
                >
                    <Scale className="w-4 h-4 text-foreground/40 dark:text-white/40" />
                    <span className="text-[9px] text-foreground/30 dark:text-white/30">Allow</span>
                </Button>
                <Button
                    variant="ghost"
                    disabled
                    className="h-full rounded-none px-3 bg-background dark:bg-[#0f0f10] flex flex-col items-center justify-center gap-1 min-w-[60px] opacity-40 cursor-not-allowed"
                    title="Recovery is unavailable -- Safe wallets are migrating to Nex Wallets"
                >
                    <ShieldAlert className="w-4 h-4 text-foreground/40 dark:text-white/40" />
                    <span className="text-[9px] text-foreground/30 dark:text-white/30">Recover</span>
                </Button>
                 <Button
                    variant="ghost"
                    disabled
                    className="h-full rounded-none px-3 bg-background dark:bg-[#0f0f10] flex flex-col items-center justify-center gap-1 min-w-[60px] opacity-40 cursor-not-allowed"
                    title="Deletion is unavailable -- Safe wallets are migrating to Nex Wallets"
                >
                    <Trash2 className="w-4 h-4 text-foreground/40 dark:text-white/40" />
                    <span className="text-[9px] text-foreground/30 dark:text-white/30">Delete</span>
                </Button>
            </motion.div>

            {/* Draggable Row Content */}
            <motion.div 
                animate={controls}
                drag="x"
                dragConstraints={{ left: -260, right: 0 }}
                dragElastic={0.1}
                onDragEnd={onDragEnd}
                onClick={toggleSlide}
                className="absolute inset-y-0 inset-x-0 z-10 bg-background dark:bg-[#0f0f10] grid grid-cols-12 gap-4 px-4 items-center cursor-pointer hover:bg-foreground/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                whileTap={{ cursor: "grabbing" }}
            >
                 {/* Wallet Info (Logo + Name + Address) */}
                <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-foreground/5 dark:bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                         <Image 
                            src={chainInfo.icon} 
                            alt={chainInfo.name} 
                            width={32} 
                            height={32} 
                            className="w-full h-full object-contain" 
                        />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                                {wallet.label || wallet.customLabel || "Safe Wallet"}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                               {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                            </span>
                             {isAddressReady && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                    <button 
                                        onClick={copyAddress}
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        <Copy className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                                    </button>
                                     {chainInfo.explorer && (
                                        <a 
                                            href={`${chainInfo.explorer}/address/${rawAddress}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 hover:bg-white/10 rounded"
                                        >
                                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                                        </a>
                                    )}
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                 {/* Assets Column */}
                <div className="col-span-4 flex items-center gap-4">
                    {/* Tokens */}
                    <div className="flex items-center -space-x-2">
                        {tokens.length > 0 ? tokens.map((t, i) => (
                             <div key={`${t.token_address}-${i}`} className="w-8 h-8 rounded-md border border-[#0A0A0A] bg-transparent overflow-hidden relative" style={{ zIndex: 10 - i }}>
                                 <Image 
                                    src={t.logo!} 
                                    alt={t.symbol} 
                                    width={32} 
                                    height={32} 
                                    className="w-full h-full object-cover" 
                                />
                             </div>
                        )) : (
                            <div className="w-8 h-8 rounded-md bg-foreground/5 dark:bg-white/5 flex items-center justify-center border border-border z-10">
                                <span className="text-[9px] text-foreground/20 dark:text-white/20">-</span>
                            </div>
                        )}
                        {tokens.length === 4 && (portfolioData?.tokens.length || 0) > 4 && (
                            <div className="w-8 h-8 rounded-md bg-muted dark:bg-[#252525] flex items-center justify-center text-[10px] text-foreground border border-border z-0">
                                +{(portfolioData?.tokens.length || 0) - 4}
                            </div>
                        )}
                    </div>
                    
                    {/* Divider if both exist */}
                    {tokens.length > 0 && nfts.length > 0 && (
                        <div className="w-px h-6 bg-white/10" />
                    )}

                    {/* NFTs */}
                     <div className="flex items-center -space-x-2">
                        {nfts.length > 0 && nfts.map((url, i) => (
                             <div key={`nft-${i}`} className="w-8 h-8 rounded-md border border-[#0A0A0A] bg-transparent overflow-hidden relative" style={{ zIndex: 10 - i }}>
                                 <Image 
                                    src={url as string} 
                                    alt="NFT" 
                                    width={32} 
                                    height={32} 
                                    className="w-full h-full object-cover" 
                                />
                             </div>
                        ))}
                    </div>
                </div>

                {/* Status Column (Hidden on smaller screens if needed, but grid 12 handles it) */}
                {/* Actually user replaced "Network" column essentially with Logo in first col. So let's re-eval columns.
                    Request: "Use Chain logo... for Safe Wallet logo".
                    I merged them in Col 1.
                    Columns from previous: Wallet (Col 5) -> Status (2) -> Network (2) -> Value (3).
                    New Request: "column for Tokens, NFT's, DeFi added".
                    Layout:
                    - Col 1-3: Wallet (Logo + Details)
                    - Col 4-8: Assets (Tokens, NFTs)
                    - Col 9-10: Status / Network?
                    - Col 11-12: Value
                */}
                
                 {/* Status (Small Pill) */}
                <div className="col-span-2 flex items-center">
                    <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1.5",
                        status === "active" || status === "ready"
                            ? "bg-green-500/10 text-green-500 border-green-500/20" 
                            : status === "dead" 
                                ? "bg-red-500/10 text-red-500 border-red-500/20 cursor-pointer hover:bg-red-500/20"
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    )}
                    onClick={(e) => {
                        if (status === "dead") {
                            e.stopPropagation();
                            fetch("/api/wallets/provision", { method: "POST" }).then(() => {
                                toast.info("Retrying wallet creation...");
                                setTimeout(() => window.location.reload(), 1000);
                            });
                        }
                    }}
                    title={status === "dead" ? "Creation failed. Click to retry." : status}
                    >
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                            status === "active" || status === "ready" ? "bg-green-500" : 
                            status === "dead" ? "bg-red-500" : "bg-yellow-500"
                        )} />
                        {status === "active" || status === "ready" ? "Active" : 
                         status === "dead" ? "Failed (Retry)" : "Setup"}
                    </div>
                </div>


                {/* Value / Net Worth */}
                <div className="col-span-2 text-right flex flex-col items-end">
                    {isLoading ? (
                         <div className="h-4 w-16 bg-muted/50 dark:bg-white/5 animate-pulse rounded" />
                    ) : (
                        <>
                            <span className="text-sm font-medium text-foreground">
                                {formatCurrency(portfolioData?.netWorthUsd || 0)}
                            </span>
                            {portfolioData && (
                                <div className={cn(
                                    "flex items-center text-xs mt-0.5",
                                    portfolioData.pnlUsd >= 0 ? "text-[#8eb94f]" : "text-[#f95200]"
                                )}>
                                    {portfolioData.pnlUsd >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5"/> : <ArrowDownRight className="h-3 w-3 mr-0.5"/>}
                                    {formatCurrency(Math.abs(portfolioData.pnlPercent))}%
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Arrow hint for swipe */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none">
                     <ArrowRight className="w-4 h-4 text-foreground/10 dark:text-white/10" />
                </div>

            </motion.div>
        </div>
    );
}

export function SafeWalletsTable({ wallets = [] }: SafeWalletsTableProps) {
  // Filter for Safe wallets.
  const safeWallets = wallets.filter((wallet) => {
    const metadata = getWalletMetadata(wallet);
    const isSafeProvider = getJsonString(metadata, "provider") === "safe";
    const isSafeType = wallet.providerName?.toLowerCase().includes("safe");
    // Also include "agent_generated" type if strictly defined
    return isSafeProvider || isSafeType || wallet.walletType === "agent_generated";
  });

  if (safeWallets.length === 0) {
      return (
        <div className="flex flex-col gap-4 mb-8">
            <h3 className="text-sm font-medium text-muted-foreground">Safe Wallets</h3>
            <div className="w-full p-8 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-foreground/[0.02] dark:bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-foreground/5 dark:bg-white/5 flex items-center justify-center mb-3">
                    <Scale className="w-6 h-6 text-foreground/40 dark:text-white/40" />
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">No Safe Wallets</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                    Safe smart wallets have been migrated to Nex Wallets. New wallets are created through the Nex Wallet provider.
                </p>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col w-full mb-8">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Safe Wallets</h3>

      {/* Nex Wallet migration deprecation banner */}
      <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        <p className="text-xs text-yellow-500/90">
          Safe wallets are being migrated to Nex Wallets. Wallet actions (send, receive, swap) are temporarily disabled. Your balances are safe and viewable.
        </p>
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground font-normal uppercase tracking-wide">
          <div className="col-span-4">Wallet</div>
          <div className="col-span-4">Assets</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Value</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col mt-2">
          {safeWallets.map((wallet) => (
             <SafeWalletRow key={wallet.walletId} wallet={wallet} />
          ))}
        </div>
      </div>
    </div>
  );
}
