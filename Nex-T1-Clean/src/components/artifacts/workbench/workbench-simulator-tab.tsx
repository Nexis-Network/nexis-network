"use client";

import { Badge } from "@/components/ui/badge";
import type { SimulatorEntry } from "@/components/artifacts/sandbox-workbench-utils";

type WorkbenchSimulatorTabProps = {
  entries: SimulatorEntry[];
};

export function WorkbenchSimulatorTab({ entries }: WorkbenchSimulatorTabProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
        Transaction flow and simulation updates will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-md border border-border/70 bg-background/40 p-3"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{entry.label}</span>
            {entry.status ? <Badge variant="outline">{entry.status}</Badge> : null}
          </div>
          {entry.details ? (
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
              {entry.details}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
