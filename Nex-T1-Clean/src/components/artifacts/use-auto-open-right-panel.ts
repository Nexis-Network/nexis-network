"use client";

import { useEffect, useRef } from "react";

import type { UseArtifactPanelStateReturn } from "@/hooks/ai";

type AutoOpenRightPanelArgs = {
  panelState: Pick<UseArtifactPanelStateReturn, "expand" | "isOpen">;
  shouldAutoOpen: boolean;
};

export function shouldTriggerRightPanelAutoOpen({
  previousShouldAutoOpen,
  shouldAutoOpen,
  isOpen,
}: {
  previousShouldAutoOpen: boolean;
  shouldAutoOpen: boolean;
  isOpen: boolean;
}): boolean {
  return shouldAutoOpen && !previousShouldAutoOpen && !isOpen;
}

export function useAutoOpenRightPanel({
  panelState,
  shouldAutoOpen,
}: AutoOpenRightPanelArgs) {
  const previousShouldAutoOpenRef = useRef(false);
  const { expand, isOpen } = panelState;

  useEffect(() => {
    if (
      shouldTriggerRightPanelAutoOpen({
        previousShouldAutoOpen: previousShouldAutoOpenRef.current,
        shouldAutoOpen,
        isOpen,
      })
    ) {
      expand();
    }

    previousShouldAutoOpenRef.current = shouldAutoOpen;
  }, [expand, isOpen, shouldAutoOpen]);
}
