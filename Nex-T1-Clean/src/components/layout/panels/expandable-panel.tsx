"use client";

import { ChevronsLeft } from "lucide-react";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

/**
 * Function type for custom collapsed panel triggers
 * Allows you to create custom buttons/content when the panel is collapsed
 */
type CollapsedTriggerRender = (options: { onExpand: () => void }) => ReactNode;

/**
 * Configuration for panel open events
 * Allows panels to respond to custom events (like keyboard shortcuts)
 */
export type PanelOpenEvent = {
  name: string; // Event name to listen for
  handler?: (event: CustomEvent<UntypedJson>) => void; // Custom handler function
};

/**
 * Predefined panel size configurations
 * Each preset has different default sizes optimized for different use cases
 */
export type PanelPreset =
  | "sidebar" // Small side panel (30% default)
  | "main" // Main content area (70% default)
  | "chat" // Chat interface (30% default, 28% collapsed)
  | "artifact" // Artifact viewer (60% default, 12% collapsed)
  | "full" // Full width panel (100% default)
  | "custom"; // Custom sizing (50% default)

/**
 * Panel sizing configuration
 * Controls how large the panel is in different states
 */
export type PanelSizing = {
  preset?: PanelPreset; // Use a predefined size configuration
  defaultSize?: number; // Normal size when expanded (percentage)
  collapsedSize?: number; // Size when collapsed (percentage)
  minSize?: number; // Minimum allowed size (percentage)
  maxSize?: number; // Maximum allowed size (percentage)
};

/**
 * Current status of a panel
 * Tracks the panel's current state and recent activity
 */
export type PanelStatus = {
  uiState: "collapsed" | "expanded" | "closed"; // Current visual state
  isResizing: boolean; // Whether user is currently resizing
  lastSize: number; // Last known size of the panel
};

/**
 * Coordinator for managing multiple panels together
 * Allows panels to communicate and coordinate their behavior
 */
export type PanelCoordinator = {
  id: string; // Unique identifier
  panels: Map<string, ExpandablePanelState>; // All registered panels
  emitSizeChange: (panelId: string, size: number) => void; // Notify of size changes
  emitCollapse: (panelId: string) => void; // Tell panel to collapse
  emitExpand: (panelId: string) => void; // Tell panel to expand
};

/**
 * Props passed to the actual panel component
 * Contains all the state and handlers needed to render a panel
 */
export type PanelProps = {
  id?: string; // Unique panel identifier
  isOpen: boolean; // Whether panel is visible
  isCollapsed: boolean; // Whether panel is collapsed
  onCollapse: () => void; // Function to collapse panel
  onExpand: () => void; // Function to expand panel
  defaultSize: number; // Normal size when expanded
  collapsedSize: number; // Size when collapsed
  minSize: number; // Minimum allowed size
  maxSize: number; // Maximum allowed size
  panelRef?: React.RefObject<{ resize: (size: number) => void } | null>; // Reference for resizing
  // Accessibility attributes (handled automatically)
  "aria-expanded": boolean; // Screen reader accessibility
  "aria-controls"?: string; // Screen reader accessibility
};

/**
 * Complete state object returned by the expandable panel hook
 * Contains all the state, actions, and configuration for a panel
 */
export type ExpandablePanelState = {
  // Core state - whether panel is visible and collapsed
  isOpen: boolean; // Whether panel is visible
  setIsOpen: Dispatch<SetStateAction<boolean>>; // Function to show/hide panel
  isCollapsed: boolean; // Whether panel is collapsed
  setIsCollapsed: Dispatch<SetStateAction<boolean>>; // Function to collapse/expand
  isExpanded: boolean; // Computed: open and not collapsed

  // Actions - functions to control the panel
  expand: () => void; // Expand the panel
  collapse: () => void; // Collapse the panel
  close: () => void; // Close the panel completely
  resizeTo: (size: number) => void; // Resize to specific size
  triggerOpen: (eventName?: string) => void; // Open and optionally emit event

  // Props bundle - ready-to-use props for the panel component
  panelProps: PanelProps;

  // Status - current state information
  status: PanelStatus;

  // Coordination - for multi-panel setups
  id?: string; // Unique panel identifier
  coordinator?: PanelCoordinator; // Coordinator for multi-panel behavior
};

/**
 * Configuration options for creating an expandable panel
 */
export type UseExpandablePanelStateOptions = {
  id?: string; // Unique identifier for the panel
  initialOpen?: boolean; // Whether panel starts open
  initialCollapsed?: boolean; // Whether panel starts collapsed
  sizing?: PanelSizing; // Size configuration
  triggers?: string[]; // Event names that should open this panel
  coordinator?: PanelCoordinator; // Coordinator for multi-panel behavior
  openEvents?: PanelOpenEvent[]; // Custom events to listen for
};

// Legacy type aliases for backward compatibility
export type PanelSizingPreset = PanelPreset;
export type PanelSizingConfig = PanelSizing;
export type UseExpandablePanelStateReturn = ExpandablePanelState;

/**
 * Predefined size configurations for different panel types
 * Each preset is optimized for its specific use case
 */
const SIZING_PRESETS: Record<PanelPreset, Omit<PanelSizing, "preset">> = {
  sidebar: { defaultSize: 30, collapsedSize: 8, minSize: 0, maxSize: 50 }, // Small side panel
  main: { defaultSize: 70, collapsedSize: 8, minSize: 20, maxSize: 100 }, // Main content area
  chat: { defaultSize: 30, collapsedSize: 28, minSize: 0, maxSize: 100 }, // Chat interface (stays wide when collapsed)
  artifact: { defaultSize: 60, collapsedSize: 12, minSize: 24, maxSize: 100 }, // Artifact viewer (needs minimum space)
  full: { defaultSize: 100, collapsedSize: 8, minSize: 50, maxSize: 100 }, // Full width panel
  custom: { defaultSize: 50, collapsedSize: 8, minSize: 8, maxSize: 100 }, // Default custom sizing
};

/**
 * Main hook for managing expandable panel state
 */
export function useExpandablePanelState(options: UseExpandablePanelStateOptions = {}): ExpandablePanelState {
  const {
    id,
    initialOpen = false, // Panel starts closed by default
    initialCollapsed = false, // Panel starts expanded by default
    sizing = {}, // Use custom sizing or presets
    triggers = [], // Event names that should open this panel
    coordinator, // Coordinator for multi-panel behavior
    openEvents, // Custom events with handlers
  } = options;

  // Core state - whether panel is visible and collapsed
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isResizing] = useState(false); // Track if user is resizing
  const [lastSize, setLastSize] = useState(50); // Remember last size
  const panelRef = useRef<{ resize: (size: number) => void } | null>(null);

  // Action functions to control the panel
  const expand = useCallback(() => {
    setIsOpen(true); // Make panel visible
    setIsCollapsed(false); // Make panel expanded (not collapsed)
  }, []);

  const collapse = useCallback(() => {
    setIsOpen(true); // Keep panel visible
    setIsCollapsed(true); // Make panel collapsed
  }, []);

  const close = useCallback(() => {
    setIsOpen(false); // Hide panel completely
    setIsCollapsed(true); // Also collapse it
  }, []);

  const resizeTo = useCallback((size: number) => {
    if (panelRef.current) {
      panelRef.current.resize(size); // Resize the actual panel
      setLastSize(size); // Remember the new size
    }
  }, []);

  const triggerOpen = useCallback(
    (eventName?: string) => {
      expand(); // Open the panel
      // Optionally emit a custom event
      if (eventName && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(eventName));
      }
    },
    [expand]
  );

  // Calculate the final sizing configuration
  // Combines preset values with any custom overrides
  const sizingConfig = useMemo(() => {
    const preset = sizing.preset || "custom";
    const presetConfig = SIZING_PRESETS[preset];

    return {
      defaultSize: sizing.defaultSize ?? presetConfig.defaultSize ?? 50, // Normal size when expanded
      collapsedSize: sizing.collapsedSize ?? presetConfig.collapsedSize ?? 8, // Size when collapsed
      minSize: sizing.minSize ?? presetConfig.minSize ?? 8, // Minimum allowed size
      maxSize: sizing.maxSize ?? presetConfig.maxSize ?? 100, // Maximum allowed size
    };
  }, [sizing]);

  // Combine custom events with simple trigger names
  const allEvents = useMemo(
    () => [
      ...(openEvents?.filter(Boolean) ?? []), // Custom events with handlers
      ...triggers.map((name) => ({ name, handler: undefined })), // Simple trigger names
    ],
    [openEvents, triggers]
  );

  // Set up event listeners for custom triggers
  useEffect(() => {
    // Skip if we're on the server or have no events to listen for
    if (typeof window === "undefined" || allEvents.length === 0) {
      return;
    }

    // Create event listeners for each configured event
    const listeners = allEvents.map((eventConfig) => {
      const { name, handler } = eventConfig;
      const eventHandler = (event: Event) => {
        expand(); // Open the panel when event is triggered
        // Call custom handler if provided
        if (handler) {
          handler(event as CustomEvent<UntypedJson>);
        }
      };

      window.addEventListener(name, eventHandler as EventListener);
      return { name, eventHandler };
    });

    // Cleanup: remove all event listeners when component unmounts
    return () => {
      for (const { name, eventHandler } of listeners) {
        window.removeEventListener(name, eventHandler as EventListener);
      }
    };
  }, [allEvents, expand]);

  // Register this panel with the coordinator (if provided)
  useEffect(() => {
    if (coordinator && id) {
      coordinator.panels.set(id, {
        isOpen,
        setIsOpen,
        isCollapsed,
        setIsCollapsed,
        isExpanded: isOpen && !isCollapsed,
        expand,
        collapse,
        close,
        panelProps: {} as PanelProps, // Will be updated below
        status: {
          uiState: isOpen ? (isCollapsed ? "collapsed" : "expanded") : "closed",
          isResizing,
          lastSize,
        },
        id,
        coordinator,
        resizeTo,
        triggerOpen,
      });
    }
  }, [coordinator, id, isOpen, isCollapsed, isResizing, lastSize, expand, collapse, close, resizeTo, triggerOpen]);

  // Calculate current status information
  const status: PanelStatus = useMemo(
    () => ({
      uiState: isOpen ? (isCollapsed ? "collapsed" : "expanded") : "closed",
      isResizing,
      lastSize,
    }),
    [isOpen, isCollapsed, isResizing, lastSize]
  );

  // Create props bundle for the panel component
  const panelProps: PanelProps = useMemo(
    () => ({
      id,
      isOpen,
      isCollapsed,
      onCollapse: collapse,
      onExpand: expand,
      defaultSize: sizingConfig.defaultSize,
      collapsedSize: sizingConfig.collapsedSize,
      minSize: sizingConfig.minSize,
      maxSize: sizingConfig.maxSize,
      panelRef,
      "aria-expanded": isOpen && !isCollapsed, // Screen reader accessibility
      "aria-controls": id ? `${id}-content` : undefined, // Screen reader accessibility
    }),
    [id, isOpen, isCollapsed, collapse, expand, sizingConfig]
  );

  return {
    isOpen,
    setIsOpen,
    isCollapsed,
    setIsCollapsed,
    isExpanded: isOpen && !isCollapsed,
    expand,
    collapse,
    close,
    resizeTo,
    triggerOpen,
    panelProps,
    status,
    id,
    coordinator,
  };
}

/**
 * Hook for coordinating multiple panels together
 */
export function usePanelCoordinator(options: {
  panels: Array<{ id: string; config: UseExpandablePanelStateOptions }>; // List of panels to coordinate
  autoResize?: boolean; // Whether to auto-resize panels
  persistLayout?: boolean; // Whether to save layout to localStorage
}): PanelCoordinator {
  const { persistLayout = false } = options;

  // Generate unique ID for this coordinator
  const coordinatorId = useMemo(() => `coordinator-${Math.random().toString(36).substr(2, 9)}`, []);

  // Map to store all registered panels
  const panelsMap = useMemo(() => new Map<string, ExpandablePanelState>(), []);

  // Handle size changes from panels
  const emitSizeChange = useCallback(
    (panelId: string, size: number) => {
      // Just persist the layout, don't call resizeTo to avoid circular dependency
      if (persistLayout) {
        localStorage.setItem(`panel-${panelId}-size`, size.toString());
      }
    },
    [persistLayout]
  );

  // Tell a panel to collapse
  const emitCollapse = useCallback(
    (panelId: string) => {
      const panel = panelsMap.get(panelId);
      if (panel) {
        panel.setIsOpen(true);
        panel.setIsCollapsed(true);
      }
    },
    [panelsMap]
  );

  // Tell a panel to expand
  const emitExpand = useCallback(
    (panelId: string) => {
      const panel = panelsMap.get(panelId);
      if (panel) {
        panel.setIsOpen(true);
        panel.setIsCollapsed(false);
      }
    },
    [panelsMap]
  );

  const coordinator: PanelCoordinator = useMemo(
    () => ({
      id: coordinatorId,
      panels: panelsMap,
      emitSizeChange,
      emitCollapse,
      emitExpand,
    }),
    [coordinatorId, panelsMap, emitSizeChange, emitCollapse, emitExpand]
  );

  return coordinator;
}

/**
 * Calculates how much space each panel should take up
 */
export function computeComplementarySizes(
  leftState: ExpandablePanelState,
  rightState: ExpandablePanelState,
  totalSize = 100
): { leftSize: number; rightSize: number } {
  const leftCollapsed = leftState.isCollapsed;
  const rightCollapsed = rightState.isCollapsed;

  const collapsedSize = 8; // Size when collapsed (8%)
  const defaultLeftSize = 30; // Default size for left panel (30%)

  if (leftCollapsed && rightCollapsed) {
    return { leftSize: totalSize / 2, rightSize: totalSize / 2 };
  }

  if (leftCollapsed) {
    return { leftSize: collapsedSize, rightSize: totalSize - collapsedSize };
  }

  if (rightCollapsed) {
    return { leftSize: totalSize - collapsedSize, rightSize: collapsedSize };
  }

  return { leftSize: defaultLeftSize, rightSize: totalSize - defaultLeftSize };
}

/**
 * Props for the ExpandablePanel component
 * Extends PanelProps with additional UI customization options
 */
export type ExpandablePanelProps = PanelProps & {
  title?: ReactNode; // Panel title (rendered in header)
  header?: ReactNode; // Custom header content
  headerActions?: ReactNode; // Actions to show in header (buttons, etc.)
  collapseButtonLabel?: string; // Text for collapse button
  collapsedLabel?: ReactNode; // Text/content shown when collapsed
  collapseIcon?: ReactNode; // Custom icon for collapse button
  collapsedTrigger?: ReactNode | CollapsedTriggerRender; // Custom collapsed content
  children: ReactNode; // Main panel content
  className?: string; // CSS classes for the panel container
  panelClassName?: string; // CSS classes for the panel body
  contentClassName?: string; // CSS classes for the content area
  collapsedContainerClassName?: string; // CSS classes for collapsed state
  openClassName?: string; // CSS classes when panel is open
  collapsedClassName?: string; // CSS classes when panel is collapsed
  side?: "left" | "right"; // Which side the panel is on (affects borders)
  enableResize?: boolean; // Whether panel can be resized by user
};

/**
 * Main ExpandablePanel component
 */
export function ExpandablePanel({
  isOpen,
  isCollapsed,
  onCollapse,
  onExpand,
  title,
  header,
  headerActions,
  collapseButtonLabel = "Collapse",
  collapsedLabel = "Open Panel",
  collapseIcon,
  collapsedTrigger,
  children,
  className,
  panelClassName,
  contentClassName,
  collapsedContainerClassName,
  openClassName = "w-1/2",
  collapsedClassName = "w-12",
  side = "right",
  enableResize = true,
  minSize = 6,
  maxSize = 100,
  defaultSize = 50,
  collapsedSize = 6,
  panelRef,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: ExpandablePanelProps) {
  // Determine border styling based on which side the panel is on
  const borderClass = side === "left" ? "border-r border-border" : "border-l border-border";

  // Default header with title and collapse button
  const panelHeader = header ?? (
    <div className="flex items-center justify-between border-border border-b p-4">
      {title ? <h2 className="font-semibold text-foreground text-xl">{title}</h2> : null}
      <div className="flex items-center gap-2">
        {headerActions}
        <button
          aria-controls={ariaControls}
          aria-expanded={ariaExpanded}
          className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent/20"
          onClick={onCollapse}
          type="button"
        >
          {collapseIcon ?? <ChevronsLeft className="h-4 w-4" />}
          {collapseButtonLabel ? <span className="text-sm">{collapseButtonLabel}</span> : null}
        </button>
      </div>
    </div>
  );

  // Main panel body with header and content
  const panelBody = (
    <div
      className={cn(
        "flex h-full w-full flex-col bg-[var(--artifact-surface)] transition-all duration-500 ease-out",
        panelClassName,
      )}
      id={ariaControls}
    >
      {panelHeader}
      <div className={cn("flex-1 overflow-y-auto p-4", contentClassName)}>{children}</div>
    </div>
  );

  // Content shown when panel is collapsed
  const collapsedContent =
    typeof collapsedTrigger === "function"
      ? collapsedTrigger({ onExpand }) // Use custom function
      : (collapsedTrigger ?? ( // Use custom content or default button
          <button
            aria-controls={ariaControls}
            aria-expanded={ariaExpanded}
            className="rounded-md border border-border border-dashed px-2 py-6 font-semibold text-muted-foreground text-xs uppercase tracking-wide transition hover:border-primary hover:text-primary"
            onClick={onExpand}
            style={{ writingMode: "vertical-rl" }} // Vertical text for narrow panel
            type="button"
          >
            {collapsedLabel}
          </button>
        ));

  // Container for collapsed state
  const collapsedContainer = (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[var(--artifact-surface)] transition-all duration-500 ease-out",
        borderClass,
        collapsedContainerClassName
      )}
    >
      {collapsedContent}
    </div>
  );

  // If resizing is disabled, render as a simple div
  if (!enableResize) {
    return (
      <div
        className={cn(
          "relative flex h-full transition-all duration-500 ease-out",
          isOpen && !isCollapsed ? openClassName : collapsedClassName,
          className
        )}
      >
        {isOpen && !isCollapsed ? panelBody : collapsedContainer}
      </div>
    );
  }

  // Render as resizable panel
  return (
    <ResizablePanel
      className={cn("h-full transition-all duration-500 ease-out", className)}
      defaultSize={isCollapsed ? collapsedSize : defaultSize}
      maxSize={maxSize}
      minSize={minSize}
      onCollapse={onCollapse}
      onExpand={onExpand}
      // @ts-expect-error -- ResizablePanel wrapper does not forward ref; upstream component limitation
      ref={panelRef}
    >
      {isOpen && !isCollapsed ? panelBody : collapsedContainer}
    </ResizablePanel>
  );
}
