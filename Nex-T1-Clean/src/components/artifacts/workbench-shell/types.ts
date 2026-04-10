import type { ReactNode } from "react";

export type WorkbenchShellViewport = "desktop" | "tablet" | "phone";

export type WorkbenchShellIconName =
  | "panel"
  | "preview"
  | "code"
  | "sparkles"
  | "overflow"
  | "terminal"
  | "explorer"
  | "search"
  | "extensions"
  | "status"
  | "keyboard"
  | "bell"
  | "close"
  | "files"
  | "tests"
  | "contracts"
  | "web"
  | "pdf"
  | "simulator"
  | "market"
  | "logs";

export type WorkbenchShellViewId =
  | "files"
  | "code"
  | "preview"
  | "terminal"
  | "logs"
  | "tests"
  | "contracts"
  | "web"
  | "pdf"
  | "simulator"
  | "polymarket";

export type WorkbenchShellAction = {
  id: WorkbenchShellViewId | string;
  label: string;
  icon: WorkbenchShellIconName;
  onSelect: () => void;
  active?: boolean;
  disabled?: boolean;
  testId?: string;
};

export type WorkbenchShellStatusItem = {
  id: string;
  label: string;
  icon?: WorkbenchShellIconName;
  tone?: "default" | "muted";
};

export type WorkbenchShellRail = {
  actions: WorkbenchShellAction[];
  title: string;
  controls?: WorkbenchShellAction[];
  content: ReactNode;
};

export type WorkbenchShellDock = {
  tabs: WorkbenchShellAction[];
  content: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export type WorkbenchShellModel = {
  key: string;
  title: string;
  subtitle?: string;
  viewport: WorkbenchShellViewport;
  filesAction?: WorkbenchShellAction;
  primaryTabs: WorkbenchShellAction[];
  compactTabs: WorkbenchShellAction[];
  overflowTabs: WorkbenchShellAction[];
  headerActions?: WorkbenchShellAction[];
  rail?: WorkbenchShellRail | null;
  main: ReactNode;
  dock?: WorkbenchShellDock | null;
  statusBar?: {
    left: WorkbenchShellStatusItem[];
    right: WorkbenchShellStatusItem[];
  };
  showMobileBack?: boolean;
  onMobileBack?: () => void;
};
