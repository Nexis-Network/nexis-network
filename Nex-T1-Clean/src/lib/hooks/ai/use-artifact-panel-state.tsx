"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { OPEN_ARTIFACT_PANEL_EVENT } from "@/lib/ai/artifact-runtime";
import type { UseMessageArtifactReturn } from "@/lib/ai/use-message-artifact";

import {
  type PanelOpenEvent,
  type UseExpandablePanelStateReturn,
  useExpandablePanelState,
  type UseExpandablePanelStateOptions,
} from "@/components/layout/panels/expandable-panel";

export type ArtifactPanelOpenEvent = PanelOpenEvent;

export type UseArtifactPanelStateOptions<TData> = {
  artifact: UseMessageArtifactReturn<TData> | null | undefined;
  autoOpenWhen?: (
    artifact: UseMessageArtifactReturn<TData> | null | undefined
  ) => boolean;
  openEvents?: ArtifactPanelOpenEvent[];
  triggers?: string[];
  initialOpen?: boolean;
  initialCollapsed?: boolean;
};

export interface UseArtifactPanelStateReturn
  extends UseExpandablePanelStateReturn {
  hasArtifactData: boolean;
}

const shouldAutoOpenByDefault = <TData,>(
  artifact: UseMessageArtifactReturn<TData> | null | undefined
) => {
  if (!artifact) {
    return false;
  }
  return artifact.status === "loading" || artifact.status === "streaming";
};

export function useArtifactPanelState<TData>(
  options: UseArtifactPanelStateOptions<TData>
): UseArtifactPanelStateReturn {
  const {
    artifact,
    autoOpenWhen,
    openEvents,
    triggers = ["openTableArtifact", OPEN_ARTIFACT_PANEL_EVENT],
    initialOpen,
    initialCollapsed,
  } =
    options;

  const panelState = useExpandablePanelState({
    initialOpen,
    initialCollapsed,
    openEvents,
    triggers,
  });

  const { expand } = panelState;

  const evaluateAutoOpen = useCallback(
    (currentArtifact: UseMessageArtifactReturn<TData> | null | undefined) => {
      if (typeof autoOpenWhen === "function") {
        return autoOpenWhen(currentArtifact);
      }
      return shouldAutoOpenByDefault(currentArtifact);
    },
    [autoOpenWhen]
  );

  const previousAutoOpen = useRef<boolean>(evaluateAutoOpen(artifact));

  useEffect(() => {
    const nextShouldOpen = evaluateAutoOpen(artifact);

    if (nextShouldOpen && !previousAutoOpen.current) {
      expand();
    }

    previousAutoOpen.current = nextShouldOpen;
  }, [artifact, evaluateAutoOpen, expand]);

  // Separate effect to expand when data becomes available
  useEffect(() => {
    if (artifact?.hasData && artifact?.data) {
      expand();
    }
  }, [artifact?.hasData, artifact?.data, expand]);

  const hasArtifactData = useMemo(
    () => Boolean(artifact?.hasData && artifact?.data),
    [artifact?.data, artifact?.hasData]
  );

  return {
    ...panelState,
    hasArtifactData,
  };
}

type CoordinationOptions = {
  autoResize?: boolean;
  cascadeCollapse?: boolean;
};

export type UseChatArtifactPairOptions<TData> = UseArtifactPanelStateOptions<TData> & {
  leftOptions?: UseExpandablePanelStateOptions;
  coordination?: CoordinationOptions;
};

export type UseChatArtifactPairReturn = {
  leftState: UseExpandablePanelStateReturn;
  rightState: UseArtifactPanelStateReturn;
};

export function useChatArtifactPair<TData>(
  options: UseChatArtifactPairOptions<TData>
): UseChatArtifactPairReturn {
  const { coordination, leftOptions, ...artifactOptions } = options;

  const leftState = useExpandablePanelState({
    initialOpen: true,
    initialCollapsed: false,
    ...leftOptions,
  });

  const rightState = useArtifactPanelState(artifactOptions);

  const { autoResize = false, cascadeCollapse = false } = coordination ?? {};

  const { expand: leftExpand, collapse: leftCollapse, isCollapsed: leftCollapsed } = leftState;
  const { isCollapsed: rightCollapsed, isOpen: rightOpen } = rightState;

  useEffect(() => {
    if (!autoResize) return;
    if (rightOpen && !rightCollapsed && leftCollapsed) {
      leftExpand();
    }
  }, [autoResize, rightOpen, rightCollapsed, leftCollapsed, leftExpand]);

  useEffect(() => {
    if (!cascadeCollapse) return;
    if (rightCollapsed && !leftCollapsed) {
      leftCollapse();
    } else if (!rightCollapsed && leftCollapsed && rightOpen) {
      leftExpand();
    }
  }, [cascadeCollapse, rightCollapsed, leftCollapsed, rightOpen, leftCollapse, leftExpand]);

  return { leftState, rightState };
}
