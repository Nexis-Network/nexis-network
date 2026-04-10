"use client";

import { TokenTransaction } from "@/types/market";
import { formatNumber, cn, sanitizeImageSrc } from "@/lib/utils";
import { ExternalLink, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface TransactionsTableProps {
    transactions: TokenTransaction[];
    symbol: string;
    tokenLogoUrl?: string;
    currentPage: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export function TransactionsTable({ 
    transactions, 
    symbol, 
    tokenLogoUrl,
    currentPage,
    onPageChange,
    isLoading
}: TransactionsTableProps) {
    const safeLogoUrl = sanitizeImageSrc(tokenLogoUrl);

    if ((!transactions || transactions.length === 0) && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mb-3 opacity-20" />
                <p>No recent transactions found</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <div className={cn("w-full overflow-x-auto", isLoading && "opacity-50 pointer-events-none")}>
                <table className="w-full text-left">
                    <thead className="text-muted-foreground font-medium text-[12px]">
                        <tr>
                            <th className="pb-4 pl-4 font-normal">Time</th>
                            <th className="pb-4 font-normal">Type</th>
                            <th className="pb-4 font-normal">{symbol}</th>
                            {/* Hide on mobile */}
                            <th className="pb-4 font-normal hidden md:table-cell">For</th>
                            <th className="pb-4 font-normal hidden sm:table-cell">USD</th>
                            <th className="pb-4 font-normal text-right pr-4">Wallet</th>
                        </tr>
                    </thead>
                    <tbody className="text-[14px]">
                        {transactions.map((tx, index) => {
                            const isBuy = tx.type === "buy";
                            const timeAgo = formatDistanceToNow(tx.blockTime * 1000, { addSuffix: true });
                            
                            return (
                                <tr key={`${tx.id}-${index}`} className="group hover:bg-accent/40 transition-colors border-b border-border/60 last:border-0">
                                    <td className="py-4 text-muted-foreground pl-4 whitespace-nowrap text-[12px] sm:text-[14px]">{timeAgo}</td>
                                    <td className={cn("py-4 font-medium", !isBuy ? "text-rose-500" : "text-emerald-500")}>
                                        <div className="flex items-center gap-1">
                                            {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                            <span className="hidden sm:inline">{isBuy ? "Buy" : "Sell"}</span>
                                            <span className="sm:hidden">{isBuy ? "B" : "S"}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-foreground font-medium">
                                        <div className="flex items-center gap-1.5">
                                            {safeLogoUrl && (
                                                <Image
                                                    src={safeLogoUrl}
                                                    alt={symbol}
                                                    width={16}
                                                    height={16}
                                                    className="rounded-full hidden sm:block"
                                                />
                                            )}
                                            <span className="text-[12px] sm:text-[14px]">{formatNumber(tx.baseAmount)}</span>
                                        </div>
                                    </td>
                                    {/* Hide on mobile */}
                                    <td className="py-4 text-muted-foreground font-medium hidden md:table-cell">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-foreground">{formatNumber(tx.quoteAmount)} {tx.quoteSymbol}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-muted-foreground font-medium hidden sm:table-cell">
                                        ${tx.usdValue > 1000 ? formatNumber(tx.usdValue) : tx.usdValue.toFixed(2)}
                                    </td>
                                    <td className="py-4 text-right text-muted-foreground pr-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Show short address on desktop, very short on mobile */}
                                            <span className="font-mono text-[12px] opacity-60 hidden sm:inline">
                                                {tx.owner.slice(0, 4)}...{tx.owner.slice(-4)}
                                            </span>
                                            <span className="font-mono text-[10px] opacity-60 sm:hidden">
                                                {tx.owner.slice(0, 3)}..{tx.owner.slice(-3)}
                                            </span>
                                            {tx.url && (
                                                <a 
                                                    href={tx.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                    Page {currentPage}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || isLoading}
                        className="px-3 py-1 text-xs font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground hover:bg-accent rounded transition-all"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={isLoading || transactions.length < 15} // Limit 15
                        className="px-3 py-1 text-xs font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground hover:bg-accent rounded transition-all"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
