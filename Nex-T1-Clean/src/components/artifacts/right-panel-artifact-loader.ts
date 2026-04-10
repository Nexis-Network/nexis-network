"use client";

import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";

export const loadRightPanelArtifact = withChunkRetry(() =>
  import("@/components/artifacts/right-panel-artifact").then((mod) => ({
    default: mod.RightPanelArtifact,
  })),
);

export function preloadRightPanelArtifact(): void {
  void loadRightPanelArtifact();
}
