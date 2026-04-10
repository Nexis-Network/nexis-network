import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type MarketSnapshotRow = {
  lastPrice: string;
  ema: string;
  change: string;
  changePct: string;
  high: string;
  low: string;
};

type MarketSnapshotTableProps = {
  row: MarketSnapshotRow;
  isPriceUp: boolean;
  className?: string;
};

export function MarketSnapshotTable({
  row,
  isPriceUp,
  className,
}: MarketSnapshotTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow>
            <TableHead>Last Price</TableHead>
            <TableHead>EMA (12)</TableHead>
            <TableHead>24h Δ</TableHead>
            <TableHead>24h Δ %</TableHead>
            <TableHead>24h High</TableHead>
            <TableHead>24h Low</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-[11px] font-medium">
              {row.lastPrice}
            </TableCell>
            <TableCell className="text-[11px] font-medium">{row.ema}</TableCell>
            <TableCell
              className={cn(
                "text-[11px] font-medium",
                isPriceUp ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {row.change}
            </TableCell>
            <TableCell
              className={cn(
                "text-[11px] font-medium",
                isPriceUp ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {row.changePct}
            </TableCell>
            <TableCell className="text-[11px] font-medium">{row.high}</TableCell>
            <TableCell className="text-[11px] font-medium">{row.low}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
