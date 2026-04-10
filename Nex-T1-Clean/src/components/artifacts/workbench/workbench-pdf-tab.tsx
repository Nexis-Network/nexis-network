"use client";

import { FileText, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WorkbenchPdfTabProps = {
  loading?: boolean;
  pdfUrl: string;
  pdfBase64: string;
  fileName?: string | null;
};

function toPdfDataUrl(pdfBase64: string): string {
  if (!pdfBase64) return "";
  if (pdfBase64.startsWith("data:application/pdf")) {
    return pdfBase64;
  }
  return `data:application/pdf;base64,${pdfBase64}`;
}

export function WorkbenchPdfTab({
  loading = false,
  pdfUrl,
  pdfBase64,
  fileName,
}: WorkbenchPdfTabProps) {
  const src = pdfUrl || toPdfDataUrl(pdfBase64);

  if (!src && loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
        No PDF output yet. When the agent generates a report or notebook PDF, it will appear here.
      </div>
    );
  }

  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background/40">
      <div className="flex items-center justify-between gap-2 border-border/70 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{fileName || pdfUrl || "PDF Document"}</span>
        </div>
        {pdfUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-1 size-3.5" />
            Open
          </Button>
        ) : null}
      </div>
      <iframe
        title="PDF Preview"
        className="h-full w-full bg-white"
        src={src}
      />
    </div>
  );
}
