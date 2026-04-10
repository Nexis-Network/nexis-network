"use client";

import {
  ArtifactContainer,
  ArtifactHeader,
  ArtifactBody,
} from "@/components/artifacts/layout";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewUrl,
  WebPreviewConsole,
} from "@/components/ai-elements/web-preview";
import { Component, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface PreviewArtifactData {
  url?: string;
  sandboxID?: string;
  port?: number;
  title?: string;
  logs?: UntypedJson[]; // Console logs if available
}

interface PreviewArtifactProps {
  data: PreviewArtifactData;
}

export function PreviewArtifact({ data }: PreviewArtifactProps) {
  const { url, sandboxID, port, title = "Web Preview", logs } = data;

  // Construct URL if not provided but sandboxID is
  // Pattern: https://<port>-<sandboxID>.e2b.dev or similar.
  // Ideally this is handled by the backend, but we provide a fallback.
  // Note: This pattern assumes standard E2B behavior.
  const previewUrl =
    url || (sandboxID && port ? `https://${port}-${sandboxID}.e2b.dev` : "");

  return (
    <ArtifactContainer>
      <ArtifactHeader
        title={title}
        icon={<Globe className="h-4 w-4" />}
        actions={
          sandboxID ? (
            <Badge
              variant="outline"
              className="text-[10px] h-5 gap-1 font-mono"
            >
              <Component className="h-3 w-3" />
              {sandboxID.slice(0, 8)}
            </Badge>
          ) : null
        }
      />
      <ArtifactBody className="p-0 flex flex-col h-full">
        <div className="flex min-h-[500px] w-full flex-1 flex-col border-b border-[var(--artifact-border)]">
          <WebPreview defaultUrl={previewUrl}>
            <WebPreviewNavigation>
              <WebPreviewUrl readOnly />
            </WebPreviewNavigation>
            <WebPreviewBody />
            {logs && logs.length > 0 && <WebPreviewConsole logs={logs} />}
          </WebPreview>
        </div>
      </ArtifactBody>
    </ArtifactContainer>
  );
}
