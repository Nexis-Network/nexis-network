import {
  artifactCardClass,
  artifactCodeSurfaceClass,
  artifactEmptyStateClass,
  artifactGhostControlClass,
  artifactIconButtonClass,
  artifactInsetPanelClass,
  artifactSegmentedControlClass,
  artifactSegmentedTriggerClass,
  artifactViewportClass,
} from "@/components/ai-elements/artifact-ui";

export const workbenchShellClass =
  "rounded-[var(--artifact-radius-shell)] border border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)] shadow-[var(--artifact-shadow)]";

export const workbenchSidebarCardClass = artifactCardClass;
export const workbenchInsetPanelClass = artifactInsetPanelClass;
export const workbenchViewportClass = artifactViewportClass;
export const workbenchCodeSurfaceClass = artifactCodeSurfaceClass;
export const workbenchEmptyStateClass = artifactEmptyStateClass;
export const workbenchIconButtonClass = artifactIconButtonClass;
export const workbenchGhostButtonClass = artifactGhostControlClass;
export const workbenchTabListClass = `${artifactSegmentedControlClass} no-scrollbar flex h-auto w-full flex-nowrap justify-start overflow-x-auto`;
export const workbenchTabTriggerClass = artifactSegmentedTriggerClass;
