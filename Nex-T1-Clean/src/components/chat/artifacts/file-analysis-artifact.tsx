"use client";

/**
 * File Analysis Artifact
 * Displays analysis results for uploaded files
 */

import { memo } from "react";
import { FileText, CheckCircle2 } from "lucide-react";

type FileAnalysisPayload = {
  type: "file-analysis";
  filename: string;
  fileType: string;
  summary: string;
  keyPoints?: string[];
  fullText?: string;
};

type FileAnalysisArtifactProps = {
  payload: FileAnalysisPayload;
};

export const FileAnalysisArtifact = memo(function FileAnalysisArtifact({
  payload,
}: FileAnalysisArtifactProps) {
  return (
    <div className="my-4 space-y-3 rounded-lg border border-border/40 bg-background/70 p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <FileText className="size-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-regular text-sm text-foreground">{payload.filename}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {payload.fileType} Analysis
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <p className="text-xs font-regular uppercase tracking-wide text-muted-foreground/70">
          Summary
        </p>
        <p className="text-sm text-foreground leading-relaxed">{payload.summary}</p>
      </div>

      {/* Key points */}
      {payload.keyPoints && payload.keyPoints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-regular uppercase tracking-wide text-muted-foreground/70">
            Key Points
          </p>
          <ul className="space-y-1.5">
            {payload.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full text (collapsible if needed) */}
      {payload.fullText && payload.fullText.length > 500 && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-xs font-regular uppercase tracking-wide text-muted-foreground/70 hover:text-foreground">
            Full Text
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-border/30 bg-muted/30 p-3 text-xs text-foreground leading-relaxed">
            {payload.fullText}
          </div>
        </details>
      )}
    </div>
  );
});

