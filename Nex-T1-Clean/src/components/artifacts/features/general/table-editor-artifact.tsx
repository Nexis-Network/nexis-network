"use client";

import { FileSpreadsheet } from "lucide-react";
import { useCallback } from "react";

export type TableEditorArtifactData = {
  columns: {
    key: string;
    header?: string;
    label?: string;
    type?: string;
  }[];
  data?: Record<string, UntypedJson>[];
  rows?: Record<string, UntypedJson>[]; // Support 'rows' alias
  title?: string;
};

export function TableEditorArtifact({ data }: { data: TableEditorArtifactData }) {
  const handleOpen = useCallback(() => {
    // Dispatch event to open the artifact panel
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("openTableArtifact"));
    }
  }, []);

  return (
    <div className="rounded-lg border bg-muted/50 p-3 my-4 max-w-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <p className="font-medium text-sm">Table editor ready</p>
        </div>
        <p className="text-muted-foreground text-xs">
          Open the artifact to explore the editable spreadsheet, summary, and AI operations.
        </p>
        <div className="flex items-center gap-2">
           <button
             className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition hover:bg-primary/90"
             onClick={handleOpen}
             type="button"
           >
             Open table editor
           </button>
           {data?.data?.length ? (
               <span className="text-xs text-muted-foreground">
                   {data.data.length} rows
               </span>
           ) : null}
        </div>
      </div>
    </div>
  );
}
