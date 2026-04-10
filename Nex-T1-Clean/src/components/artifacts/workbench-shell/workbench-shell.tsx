"use client";

import { WorkbenchCompactShell } from "./compact-shell";
import { WorkbenchDesktopShell } from "./desktop-shell";
import type { WorkbenchShellModel } from "./types";

type WorkbenchShellProps = {
  model: WorkbenchShellModel;
  className?: string;
};

export function WorkbenchShell({ model, className }: WorkbenchShellProps) {
  if (model.viewport === "desktop") {
    return <WorkbenchDesktopShell model={model} className={className} />;
  }

  return <WorkbenchCompactShell model={model} className={className} />;
}
