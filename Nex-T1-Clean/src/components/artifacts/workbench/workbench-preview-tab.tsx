"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
} from "@/components/ai-elements/web-preview";
import { ExternalLink } from "lucide-react";
import { WorkbenchEmptyState } from "@/components/artifacts/workbench/workbench-empty-state";

type WorkbenchPreviewTabProps = {
  hasPreview: boolean;
  previewUrl: string;
  previewHtml: string;
  loading?: boolean;
};

export function WorkbenchPreviewTab({
  hasPreview,
  previewUrl,
  previewHtml,
  loading = false,
}: WorkbenchPreviewTabProps) {
  if (!hasPreview && loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-[var(--artifact-terminal-min-height)] w-full" />
      </div>
    );
  }

  if (!hasPreview) {
    return (
      <WorkbenchEmptyState
        eyebrow="Preview"
        title="No live preview yet"
        description="Run a development server or emit `web_preview_output` to populate the preview surface."
      />
    );
  }

  return (
    <WebPreview className="h-full">
      <WebPreviewNavigation className="justify-between px-3 py-2">
        <span className="truncate text-xs uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
          {previewUrl || "Live HTML Preview"}
        </span>
        {previewUrl ? (
          <WebPreviewNavigationButton
            type="button"
            onClick={() =>
              window.open(previewUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="size-3.5" />
            <span className="sr-only">Open preview</span>
          </WebPreviewNavigationButton>
        ) : null}
      </WebPreviewNavigation>
      <WebPreviewBody
        data-testid="artifact-preview-frame"
        className="h-full w-full"
        src={previewUrl || undefined}
        srcDoc={previewUrl ? undefined : previewHtml}
        title="Artifact Preview"
      />
    </WebPreview>
  );
}
