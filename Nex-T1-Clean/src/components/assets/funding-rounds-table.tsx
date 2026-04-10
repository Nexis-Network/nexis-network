"use client";

import { formatNumber, cn } from "@/lib/utils";
import { History } from "lucide-react";

interface FundingRoundsTableProps {
  rounds: UntypedJson[];
  symbol: string;
  isLoading?: boolean;
}

export function FundingRoundsTable({
  rounds,
  symbol: _symbol,
  isLoading
}: FundingRoundsTableProps) {
  if ((!rounds || rounds.length === 0) && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mb-3 opacity-20" />
        <p>No funding rounds found</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className={cn("w-full overflow-x-auto", isLoading && "opacity-50 pointer-events-none")}>
        <table className="w-full text-left">
          <thead className="text-muted-foreground font-medium text-[12px]">
            <tr>
              <th className="pb-4 pl-4 font-normal">Date</th>
              <th className="pb-4 font-normal">Round</th>
              <th className="pb-4 font-normal">Price</th>
              <th className="pb-4 font-normal">Raise</th>
              <th className="pb-4 font-normal">Valuation</th>
              <th className="pb-4 font-normal text-right pr-4">Investors</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {rounds.map((round, index) => {
              return (
                <tr key={`${index}`} className="group hover:bg-accent/40 transition-colors border-b border-border/60 last:border-0">
                  <td className="py-4 text-muted-foreground pl-4 whitespace-nowrap text-[12px] sm:text-[14px]">
                    {round.date ? new Date(round.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-4 text-foreground font-medium">
                    {round.type || 'Seed'}
                  </td>
                  <td className="py-4 text-muted-foreground font-medium">
                    ${round.price ? round.price.toFixed(4) : 'N/A'}
                  </td>
                  <td className="py-4 text-muted-foreground font-medium">
                     ${round.raise ? formatNumber(round.raise) : 'N/A'}
                  </td>
                   <td className="py-4 text-muted-foreground font-medium">
                     ${round.valuation ? formatNumber(round.valuation) : 'N/A'}
                  </td>
                  <td className="py-4 text-right text-foreground font-medium pr-4 max-w-[200px] truncate">
                     {round.investors ? round.investors.map((i: UntypedJson) => i.name).join(', ') : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
