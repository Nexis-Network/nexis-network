"use client";

import { WorkbenchTerminalTab } from "@/components/artifacts/workbench/workbench-terminal-tab";

type SandboxWorkbenchTerminalDockProps = {
  sandboxId: string | null;
  terminalBusy: boolean;
  terminalInput: string;
  terminalText: string;
  onRunCommand: React.FormEventHandler<HTMLFormElement>;
  onTerminalInputChange: (value: string) => void;
};

export function SandboxWorkbenchTerminalDock(
  props: SandboxWorkbenchTerminalDockProps,
) {
  return (
    <div className="h-full overflow-hidden p-4" data-testid="artifact-terminal-view">
      <WorkbenchTerminalTab {...props} />
    </div>
  );
}
