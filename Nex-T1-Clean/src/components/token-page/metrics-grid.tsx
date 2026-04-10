import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS } from "./constants";

type MetricCell = {
  label: string;
  value: string;
  helperText?: string;
};

export type MetricMatrix = (MetricCell | null)[][];

type MetricsGridProps = {
  rows: MetricMatrix;
};

export function MetricsGrid({ rows }: MetricsGridProps) {
  if (!rows.length) {
    return null;
  }

  return (
    <Card
      className={cn(
        TOKEN_PANEL_FRAME_CLASS,
        TOKEN_PANEL_MAX_WIDTH_CLASS,
        "bg-transparent text-foreground",
      )}
    >
      <div className={cn(TOKEN_PANEL_INNER_CLASS, "relative h-full rounded-[11px] bg-transparent")}>
        <div className="max-h-[110px] overflow-auto rounded-[11px]">
          <div className="flex flex-col divide-y divide-border">
            {rows.map((row, rowIndex) => {
              const normalizedRow = [...row];
              while (normalizedRow.length < 3) normalizedRow.push(null);

              return (
                <div
                  key={row.map((cell) => cell?.label).join("-") || `row-${rowIndex}`}
                  className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
                >
                  {normalizedRow.map((cell, cellIndex) => (
                    <div
                      key={cell?.label ?? `empty-${cellIndex}`}
                      className="flex min-h-[36px] items-center justify-between px-4 py-2"
                    >
                      {cell ? (
                        <>
                          <span className="text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
                            {cell.label}
                          </span>
                          <span className="text-[14px] font-normal leading-[18px] tracking-[0.16px] text-foreground">
                            {cell.value || "--"}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-light tracking-[0.16px] text-muted-foreground/50">—</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
