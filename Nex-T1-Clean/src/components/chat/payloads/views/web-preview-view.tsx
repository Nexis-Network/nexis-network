"use client";

import { ExternalLink } from "lucide-react";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import type { WebPreviewPayload } from "@/components/chat/types";

export const WebPreviewView = ({ payload }: { payload: WebPreviewPayload }) => (
  <div className="overflow-hidden rounded-xl border border-border/50 bg-background/70 shadow-sm">
    <WebPreview defaultUrl={payload.url}>
      <WebPreviewNavigation className="items-center gap-2">
        <WebPreviewUrl className="h-8 flex-1 text-xs" readOnly value={payload.url} />
        <WebPreviewNavigationButton
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(payload.url, "_blank", "noopener,noreferrer");
            }
          }}
          tooltip="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </WebPreviewNavigationButton>
      </WebPreviewNavigation>
      <WebPreviewBody className="min-h-[200px]" />
    </WebPreview>
  </div>
);
