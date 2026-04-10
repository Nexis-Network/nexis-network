"use client";

import { useMemo } from "react";
import type { UseMessageArtifactReturn } from "@/lib/ai/use-message-artifact";

/**
 * Hook to determine the currently active artifact from a list of artifacts.
 * Returns the first artifact that is streaming or has data, along with its type.
 */
export function useActiveArtifact(
  candidates: {
    type: string;
    artifact: UseMessageArtifactReturn<UntypedJson> | null | undefined;
  }[],
): [UseMessageArtifactReturn<UntypedJson> | null, string | null] {
  return useMemo(() => {
    // Priority: Streaming artifacts take precedence
    const streaming = candidates.find((c) => c.artifact?.status === "streaming");
    if (streaming && streaming.artifact) return [streaming.artifact, streaming.type];

    // Then artifacts that are loading/hydrating
    const loading = candidates.find(
      (c) => c.artifact?.status === "loading" || c.artifact?.isActive
    );
    if (loading && loading.artifact) return [loading.artifact, loading.type];

    // Finally artifacts that have data
    const hasData = candidates.find(
      (c) => c.artifact?.hasData && c.artifact?.data
    );
    if (hasData && hasData.artifact) return [hasData.artifact, hasData.type];

    return [null, null];
  }, [candidates]);
}
