"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface TableRowData {
  id: string;
  name: ReactNode;
  category: string;
  value: number;
  date: string;
  children?: TableRowData[];
}

interface AccordionRowProps {
  row: TableRowData;
  defaultOpen?: boolean;
}

export function AccordionRow({ row, defaultOpen = false }: AccordionRowProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = row.children && row.children.length > 0;

  return (
    <>
      <TableRow
        className={cn("grid grid-cols-6", isOpen && "border-b-0 bg-muted/40")}
      >
        <TableCell className="p-0">
          <Button
            aria-label={isOpen ? "Collapse row" : "Expand row"}
            className={cn(
              "h-full w-full rounded-none p-3 text-muted-foreground transition-colors",
              hasChildren && "hover:bg-transparent hover:text-foreground",
              !hasChildren && "cursor-default opacity-30",
            )}
            disabled={!hasChildren}
            onClick={() => setIsOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="p-3 font-medium font-mono text-muted-foreground text-sm">
          {row.id}
        </TableCell>
        <TableCell className="p-3 font-medium text-sm">{row.name}</TableCell>
        <TableCell className="p-3 text-muted-foreground text-sm">
          {row.category}
        </TableCell>
        <TableCell className="p-3 text-right font-mono font-regular text-sm">
          ${row.value.toLocaleString()}
        </TableCell>
        <TableCell className="p-3 text-muted-foreground text-sm">
          {row.date}
        </TableCell>
      </TableRow>

      {hasChildren && (
        <TableRow className="grid grid-cols-6 border-b-0">
          <TableCell className="col-span-6 p-0" colSpan={6}>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="w-full border-border border-b">
                <Table>
                  <TableHeader>
                    <TableRow className="grid grid-cols-6 border-b-0">
                      <TableHead className="flex h-7 items-center border-border border-y px-3 py-1.5" />
                      <TableHead className="flex h-7 items-center border-border border-y px-3 py-1.5 text-xs">
                        ID
                      </TableHead>
                      <TableHead className="flex h-7 items-center border-border border-y px-3 py-1.5 text-xs">
                        Name
                      </TableHead>
                      <TableHead className="flex h-7 items-center border-border border-y px-3 py-1.5 text-xs">
                        Category
                      </TableHead>
                      <TableHead className="flex h-7 items-center justify-end border-border border-y px-3 py-1.5 text-right text-xs">
                        Value
                      </TableHead>
                      <TableHead className="flex h-7 items-center border-border border-y px-3 py-1.5 text-xs">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {row.children?.map((childRow) => (
                      <TableRow className="grid grid-cols-6" key={childRow.id}>
                        <TableCell className="px-3 py-2" />
                        <TableCell className="px-3 py-2 font-mono text-muted-foreground text-xs">
                          {childRow.id}
                        </TableCell>
                        <TableCell className="px-3 py-2 font-medium text-xs">
                          {childRow.name}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground text-xs">
                          {childRow.category}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right font-mono font-regular text-xs">
                          ${childRow.value.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-muted-foreground text-xs">
                          {childRow.date}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function Table01({
  rows,
  renderNameCell,
}: {
  rows?: TableRowData[];
  renderNameCell?: (row: TableRowData) => React.ReactNode;
}) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const data = rows ?? [];
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = data.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize,
  );

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-transparent">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="grid grid-cols-6">
              <TableHead className="p-3" />
              <TableHead className="p-3 font-regular text-foreground text-sm">
                ID
              </TableHead>
              <TableHead className="p-3 font-regular text-foreground text-sm">
                Name
              </TableHead>
              <TableHead className="p-3 font-regular text-foreground text-sm">
                Category
              </TableHead>
              <TableHead className="p-3 text-right font-regular text-foreground text-sm">
                Value
              </TableHead>
              <TableHead className="p-3 font-regular text-foreground text-sm">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated && paginated.length ? (
              paginated.map((row, index) => (
                <AccordionRow
                  defaultOpen={index === 0}
                  key={row.id}
                  row={{
                    ...row,
                    name: renderNameCell ? renderNameCell(row) : row.name,
                  }}
                />
              ))
            ) : (
              <TableRow className="grid grid-cols-6 border-b-0">
                <TableCell className="col-span-6 p-4 text-center text-sm text-muted-foreground">
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data.length > pageSize ? (
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, data.length)} of {data.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-border/60 bg-transparent px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className="rounded-md border border-border/60 bg-transparent px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
