"use client";

import type { FormEvent } from "react";
import { Play } from "lucide-react";
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WorkbenchTerminalTabProps = {
  sandboxId: string | null;
  terminalText: string;
  terminalBusy: boolean;
  terminalInput: string;
  onTerminalInputChange: (value: string) => void;
  onRunCommand: (event: FormEvent<HTMLFormElement>) => void;
};

export function WorkbenchTerminalTab({
  sandboxId,
  terminalText,
  terminalBusy,
  terminalInput,
  onTerminalInputChange,
  onRunCommand,
}: WorkbenchTerminalTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--artifact-radius-panel)] border border-[var(--artifact-border)]">
        <Terminal output={terminalText} isStreaming={terminalBusy} autoScroll>
          <TerminalHeader>
            <TerminalTitle>
              {sandboxId ? `Sandbox ${sandboxId.slice(0, 8)}` : "Terminal"}
            </TerminalTitle>
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

      <form className="flex items-center gap-2" onSubmit={onRunCommand}>
        <Input
          value={terminalInput}
          onChange={(event) => onTerminalInputChange(event.target.value)}
          placeholder={
            sandboxId
              ? "Run a command (e.g. npm run dev)"
              : "Waiting for sandbox..."
          }
          disabled={!sandboxId || terminalBusy}
          className="h-11 rounded-[var(--artifact-radius-pill)] border-[var(--artifact-border)] bg-[var(--artifact-shell)] text-[var(--artifact-foreground)]"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!sandboxId || !terminalInput.trim() || terminalBusy}
          className="h-11 rounded-[var(--artifact-radius-pill)] border border-[var(--artifact-border)] bg-[var(--artifact-control-active)] px-4 text-[var(--artifact-control-foreground)] hover:bg-[var(--artifact-control-hover)]"
        >
          <Play className="mr-1.5 size-3.5" />
          Run
        </Button>
      </form>
    </div>
  );
}
