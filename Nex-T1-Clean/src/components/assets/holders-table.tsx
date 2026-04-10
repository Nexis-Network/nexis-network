"use strict";

import { TokenHolder } from "@/types/market";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/utils";

import { useState } from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface HoldersTableProps {
    holders: TokenHolder[];
    symbol: string;
    description?: string;
    price: number;
    marketCap: number;
}

const ITEMS_PER_PAGE = 25;

export function HoldersTable({ holders, symbol, price, marketCap }: HoldersTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    if (!holders || holders.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No holder data available</div>;
    }

    const totalPages = Math.ceil(holders.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentHolders = holders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="w-full space-y-4">
            <div className="w-full overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/60">
                            <TableHead className="w-[80px] text-muted-foreground">Rank</TableHead>
                            <TableHead className="text-muted-foreground">Address</TableHead>
                            <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                            <TableHead className="text-right text-muted-foreground">Value</TableHead>
                            <TableHead className="text-right text-muted-foreground">%</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentHolders.map((holder, index) => {
                            const amount = holder.uiAmount;
                            const value = amount * price;
                            const percent = marketCap > 0 ? (value / marketCap) * 100 : 0;
                            const globalIndex = startIndex + index + 1;
                            
                            return (
                                <TableRow key={`${holder.owner}-${globalIndex}`} className="hover:bg-accent/40 border-border/60 transition-colors group">
                                    <TableCell className="font-mono text-muted-foreground">
                                        {globalIndex}
                                    </TableCell>
                                    <TableCell>
                                        <a 
                                            href={`https://solscan.io/account/${holder.owner}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-primary hover:text-primary/80 font-mono"
                                        >
                                            {holder.owner.slice(0, 4)}...{holder.owner.slice(-4)}
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-foreground">
                                        {formatNumber(amount)} {symbol}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">
                                        ${formatNumber(value)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">
                                        {percent > 0 ? `${percent.toFixed(2)}%` : '-'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        
                        {/* Simple Logic: Show current page if total is large, or all if small. For now keeping it simple */}
                        <PaginationItem>
                            <span className="text-sm text-muted-foreground px-4">
                                Page {currentPage} of {totalPages}
                            </span>
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationNext 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
