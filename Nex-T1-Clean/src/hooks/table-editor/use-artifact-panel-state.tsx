"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UseMessageArtifactReturn } from "@/lib/ai/use-message-artifact";

import {
  computeComplementarySizes,
  type ExpandablePanelState,
  type PanelCoordinator,
  type UseExpandablePanelStateOptions,
  useExpandablePanelState,
  usePanelCoordinator,
} from "@/components/features/table-editor/expandable-panel";

/**
 * Hook that manages the coordination between chat and table panels
 *
 * This hook handles:
 * - Creating and managing two panels (left chat, right table)
 * - Automatically opening the table panel when AI generates data
 * - Coordinating panel resizing and layout
 * - Managing panel collapse/expand behavior
 *
 * Used in the main chat interface to create a split-panel layout
 */
export function useChatArtifactPair(config: {
  artifact: UseMessageArtifactReturn<UntypedJson> | null | undefined;
  autoOpenWhen?: (current: UseMessageArtifactReturn<UntypedJson> | null | undefined) => boolean;
  coordination?: {
    autoResize?: boolean; // Automatically resize panels when content changes
    cascadeCollapse?: boolean; // When one panel collapses, expand the other
    persistLayout?: boolean; // Remember panel sizes between sessions
  };
  triggers?: string[]; // Events that can trigger panel actions
}) {
  const { artifact, autoOpenWhen, coordination = {}, triggers = ["openTableArtifact"] } = config;
  const {
    autoResize = true, // Default: panels resize automatically
    cascadeCollapse = false, // Default: panels don't cascade collapse
    persistLayout = false, // Default: don't remember layout between sessions
  } = coordination;

  // Create a coordinator to manage both panels together
  const coordinator = usePanelCoordinator({
    panels: [
      {
        id: "left", // Left panel = chat messages
        config: {
          initialOpen: true,
          sizing: { preset: "chat" }, // Use chat-optimized sizing
        },
      },
      {
        id: "right", // Right panel = table editor
        config: {
          initialOpen: true,
          sizing: { preset: "artifact" }, // Use artifact-optimized sizing
        },
      },
    ],
    autoResize,
    persistLayout,
  });

  // Create individual panel states that work together
  const leftState = useExpandablePanelState({
    id: "left",
    initialOpen: true,
    sizing: { preset: "chat" },
    coordinator, // Connect to the coordinator for synchronized behavior
  });

  const rightState = useExpandablePanelState({
    id: "right",
    initialOpen: false,
    sizing: { preset: "artifact" },
    coordinator, // Connect to the coordinator for synchronized behavior
    triggers, // Listen for events that should open this panel
  });

  // Calculate how much space each panel should take up
  // This ensures they work well together and don't overlap
  const { leftSize, rightSize } = computeComplementarySizes(leftState, rightState);

  // Automatically resize panels when their calculated sizes change
  useEffect(() => {
    if (autoResize) {
      // Resize the left panel (chat) to its calculated size
      if (leftState.panelProps.panelRef?.current) {
        leftState.panelProps.panelRef.current.resize(leftSize);
      }
      // Resize the right panel (table) to its calculated size
      if (rightState.panelProps.panelRef?.current) {
        rightState.panelProps.panelRef.current.resize(rightSize);
      }
    }
  }, [leftSize, rightSize, autoResize, leftState.panelProps.panelRef, rightState.panelProps.panelRef]);

  // Handle cascade collapse: when chat panel collapses, expand table panel
  useEffect(() => {
    if (cascadeCollapse && leftState.isCollapsed) {
      rightState.expand();
    }
  }, [leftState.isCollapsed, cascadeCollapse, rightState]);

  // Automatically open the table panel when AI generates data
  useEffect(() => {
    if (autoOpenWhen && artifact) {
      const shouldOpen = autoOpenWhen(artifact);
      if (shouldOpen && !rightState.isOpen) {
        rightState.expand();
      }
    }
  }, [autoOpenWhen, artifact, rightState]);

  return {
    leftState, // State for the chat panel
    rightState, // State for the table panel
    coordinator, // Coordinator for managing both panels
  };
}

/**
 * Configuration options for managing a single artifact panel
 */
export type UseArtifactPanelStateOptions<TData> = {
  artifact: UseMessageArtifactReturn<TData> | null | undefined;
  autoOpenWhen?: (artifact: UseMessageArtifactReturn<TData> | null | undefined) => boolean;
  coordination?: PanelCoordinator;
  sizing?: UseExpandablePanelStateOptions["sizing"];
  triggers?: string[];
  initialOpen?: boolean;
  initialCollapsed?: boolean;
};

/**
 * Status information about the artifact's current state
 * Used to determine what UI to show (loading, error, complete, etc.)
 */
export type ArtifactStatus = {
  hasData: boolean; // Whether the artifact has any data
  isLoading: boolean; // Whether the artifact is currently loading
  isError: boolean; // Whether there was an error loading the artifact
  uiState: "idle" | "loading" | "streaming" | "complete" | "error"; // Current UI state
};

/**
 * Return type for the artifact panel state hook
 * Extends the basic panel state with artifact-specific information
 */
export interface UseArtifactPanelStateReturn<TData = UntypedJson> extends Omit<ExpandablePanelState, "status"> {
  hasArtifactData: boolean; // Whether the artifact has data to display
  isLoading: boolean; // Whether the artifact is currently loading
  status: ArtifactStatus; // Detailed status information
  artifact: UseMessageArtifactReturn<TData> | null | undefined; // The artifact data itself
  shouldShowLoading: boolean; // Whether to show the loading UI
}

/**
 * Default logic for when to automatically open an artifact panel
 * Opens when the artifact is loading or streaming (receiving data)
 */
const shouldAutoOpenByDefault = <TData,>(artifact: UseMessageArtifactReturn<TData> | null | undefined) => {
  if (!artifact) {
    return false;
  }
  return artifact.status === "loading" || artifact.status === "streaming";
};

/**
 * Hook for managing a single artifact panel's state and behavior
 *
 * This hook handles:
 * - Automatically opening the panel when AI generates data
 * - Tracking the artifact's loading, error, and completion states
 * - Managing panel expand/collapse behavior
 * - Providing status information for UI rendering
 *
 * Used for individual artifact panels (like the table editor)
 */
export function useArtifactPanelState<TData>(
  options: UseArtifactPanelStateOptions<TData>
): UseArtifactPanelStateReturn<TData> {
  const {
    artifact,
    autoOpenWhen,
    coordination,
    sizing,
    triggers = ["openTableArtifact"],
    initialOpen,
    initialCollapsed,
  } = options;

  // Create the basic panel state
  const panelState = useExpandablePanelState({
    id: "artifact-panel",
    initialOpen,
    initialCollapsed,
    sizing: { preset: "artifact", ...sizing },
    triggers,
    coordinator: coordination,
  });

  const { expand } = panelState;

  // Function to determine if the panel should auto-open
  const evaluateAutoOpen = useCallback(
    (currentArtifact: UseMessageArtifactReturn<TData> | null | undefined) => {
      // Use custom logic if provided, otherwise use default behavior
      if (typeof autoOpenWhen === "function") {
        return autoOpenWhen(currentArtifact);
      }
      return shouldAutoOpenByDefault(currentArtifact);
    },
    [autoOpenWhen]
  );

  // Track the previous auto-open state to detect changes
  const previousAutoOpen = useRef<boolean>(evaluateAutoOpen(artifact));

  // Auto-open the panel when conditions change from false to true
  useEffect(() => {
    const nextShouldOpen = evaluateAutoOpen(artifact);

    // Only expand if we're transitioning from "shouldn't open" to "should open"
    if (nextShouldOpen && !previousAutoOpen.current) {
      expand();
    }

    previousAutoOpen.current = nextShouldOpen;
  }, [artifact, evaluateAutoOpen, expand]);

  // Also expand when data becomes available (regardless of auto-open logic)
  useEffect(() => {
    if (artifact?.hasData && artifact?.data) {
      expand();
    }
  }, [artifact?.hasData, artifact?.data, expand]);

  // Calculate if the artifact has data to display
  const hasArtifactData = useMemo(
    () => Boolean(artifact?.hasData && artifact?.data),
    [artifact?.data, artifact?.hasData]
  );

  // Calculate if the artifact is currently loading
  const isLoading = useMemo(
    () => artifact?.status === "loading" || artifact?.status === "streaming",
    [artifact?.status]
  );

  // Calculate if there was an error loading the artifact
  const isError = useMemo(() => artifact?.status === "error", [artifact?.status]);

  // Determine the current UI state based on artifact status
  const uiState = useMemo((): ArtifactStatus["uiState"] => {
    if (isError) {
      return "error";
    }
    if (artifact?.status === "streaming") {
      return "streaming";
    }
    if (isLoading) {
      return "loading";
    }
    if (hasArtifactData) {
      return "complete";
    }
    return "idle";
  }, [isError, isLoading, hasArtifactData, artifact?.status]);

  // Combine all status information into a single object
  const status = useMemo(
    () => ({
      hasData: hasArtifactData,
      isLoading,
      isError,
      uiState,
    }),
    [hasArtifactData, isLoading, isError, uiState]
  );

  // Determine if we should show the loading UI
  // This is more specific than just "isLoading" - it checks if the artifact
  // is actively working and not yet complete
  const shouldShowLoading = useMemo(() => {
    const isActive = artifact?.isActive;
    const stage = (artifact?.data as { stage?: string })?.stage;
    return Boolean(isActive && stage && stage !== "complete");
  }, [artifact?.isActive, artifact?.data]);

  return {
    ...panelState, // All the basic panel state (expand, collapse, etc.)
    hasArtifactData, // Whether there's data to show
    isLoading, // Whether it's currently loading
    status, // Detailed status information
    artifact, // The artifact data itself
    shouldShowLoading, // Whether to show loading UI
  };
}
