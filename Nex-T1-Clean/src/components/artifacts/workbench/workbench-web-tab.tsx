"use client";

import { Globe, ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
} from "@/components/ai-elements/web-preview";
import { WorkbenchEmptyState } from "@/components/artifacts/workbench/workbench-empty-state";

type WorkbenchWebTabProps = {
  loading?: boolean;
  webUrl: string;
  webHtml: string;
};

export function WorkbenchWebTab({
  loading = false,
  webUrl,
  webHtml,
}: WorkbenchWebTabProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const hasWeb = webUrl.trim().length > 0 || webHtml.trim().length > 0;

  if (!hasWeb && loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-[var(--artifact-terminal-min-height)] w-full" />
      </div>
    );
  }

  if (!hasWeb) {
    return (
      <WorkbenchEmptyState
        eyebrow="Web"
        title="No web output available"
        description="Ask the agent to expose a URL or emit embedded web HTML to render a dApp surface here."
      />
    );
  }

  return (
    <WebPreview className="h-full">
      <WebPreviewNavigation className="justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
          <Globe className="size-3.5 shrink-0" />
          <span className="truncate">{webUrl || "Embedded web output"}</span>
        </div>
        <div className="flex items-center gap-1">
          <WebPreviewNavigationButton
            type="button"
            onClick={() => setIframeKey((key) => key + 1)}
          >
            <RotateCcw className="size-3.5" />
            <span className="sr-only">Reload web view</span>
          </WebPreviewNavigationButton>
          {webUrl ? (
            <WebPreviewNavigationButton
              type="button"
              onClick={() =>
                window.open(webUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="size-3.5" />
              <span className="sr-only">Open web view</span>
            </WebPreviewNavigationButton>
          ) : null}
        </div>
      </WebPreviewNavigation>
      <WebPreviewBody
        key={iframeKey}
        data-testid="artifact-web-view"
        className="h-full w-full"
        src={webUrl || undefined}
        srcDoc={webUrl ? undefined : webHtml}
        title="Artifact Web View"
      />
    </WebPreview>
  );
}
