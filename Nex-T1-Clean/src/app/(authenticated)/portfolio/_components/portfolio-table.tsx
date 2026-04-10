"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface PortfolioTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  emptyMessage?: string;
}

export function PortfolioTable<T extends { id?: string | number }>({
  data,
  columns,
  pageSize = 10,
  emptyMessage = "No data available",
}: PortfolioTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIdx, startIdx + pageSize);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="rounded-md border border-border/50 overflow-hidden bg-card/20">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-border/40">
            {columns.map((col, idx) => (
              <TableHead 
                key={idx} 
                className={cn(
                  "h-12 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider", // Enhanced height and padding
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, rowIdx) => (
              <TableRow 
                key={item.id || rowIdx} 
                className="hover:bg-muted/20 transition-colors border-border/40"
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className={cn("py-4 px-4", col.className)}> {/* Adjusted cell padding to match header */}
                    {col.cell ? col.cell(item) : (item as UntypedJson)[col.accessorKey as string]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="h-24 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 disabled:opacity-30"
              onClick={handlePrev}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 disabled:opacity-30"
              onClick={handleNext}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
