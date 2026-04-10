import type {
  WorkbenchShellAction,
  WorkbenchShellStatusItem,
} from "./types";

export function resolveWorkbenchRowTemplate(args: {
  hasDock: boolean;
  dockCollapsed: boolean;
}): string {
  if (!args.hasDock) {
    return "minmax(0, 1fr)";
  }

  if (args.dockCollapsed) {
    return "minmax(0, 1fr) var(--artifact-workbench-dock-header-height)";
  }

  return "minmax(0, 339fr) minmax(100px, 428fr)";
}

export function shouldShowWorkbenchMobileBack(args: {
  viewport: "desktop" | "tablet" | "phone";
  showMobileBack?: boolean;
}): boolean {
  return args.viewport === "phone" && Boolean(args.showMobileBack);
}

export function splitWorkbenchActions(actions: WorkbenchShellAction[]): {
  visible: WorkbenchShellAction[];
  overflow: WorkbenchShellAction[];
} {
  return {
    visible: actions.filter((action) => action.active),
    overflow: actions.filter((action) => !action.active),
  };
}

export function hasWorkbenchStatusItems(
  items: WorkbenchShellStatusItem[],
): boolean {
  return items.some((item) => item.label.trim().length > 0);
}
