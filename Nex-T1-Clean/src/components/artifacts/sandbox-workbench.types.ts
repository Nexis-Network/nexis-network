export type WorkbenchTab =
  | "code"
  | "contracts"
  | "files"
  | "terminal"
  | "web"
  | "preview"
  | "pdf"
  | "simulator"
  | "polymarket";

export type SandboxMainView = Exclude<WorkbenchTab, "terminal">;
export type SandboxDockView = "logs" | "terminal";
export type SandboxCompactView = SandboxMainView | SandboxDockView;
