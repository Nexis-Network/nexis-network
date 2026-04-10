"use client";

import { useArtifactRegistryArtifact } from "@/lib/ai/artifact-runtime";
import {
  MarketTerminalArtifact,
  type MarketTerminalArtifactPayload,
} from "@/modules/ai/artifacts/market-terminal";

export function useMarketTerminalArtifact() {
  const artifactData =
    useArtifactRegistryArtifact<MarketTerminalArtifactPayload>(
      MarketTerminalArtifact,
    );

  return {
    ...artifactData,
    data: artifactData.data as MarketTerminalArtifactPayload | null,
  };
}
