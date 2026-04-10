"use client";

import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";

type NativeIdeWorkbenchTerminalDockProps = {
  session: NativeIdeSessionData;
};

export function NativeIdeWorkbenchTerminalDock({
  session,
}: NativeIdeWorkbenchTerminalDockProps) {
  if (!session.terminal) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden p-4" data-testid="artifact-terminal-view">
      <Terminal
        output={session.terminal.output}
        isStreaming={!session.terminal.isComplete}
        autoScroll
        className="h-full border-[var(--artifact-border)]"
      >
        <TerminalHeader>
          <TerminalTitle>{session.terminal.command ?? "Terminal"}</TerminalTitle>
          <div className="flex items-center gap-2">
            <TerminalStatus />
            <TerminalActions>
              <TerminalCopyButton />
            </TerminalActions>
          </div>
        </TerminalHeader>
        <TerminalContent />
      </Terminal>
    </div>
  );
}
