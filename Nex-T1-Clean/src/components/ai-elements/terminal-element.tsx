"use client";

import type { ToolUIPart } from "ai";
import {
  Terminal,
  TerminalActions,
  TerminalClearButton,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";

type TerminalElementProps = {
  toolPart: ToolUIPart;
};

export const TerminalElement = ({ toolPart }: TerminalElementProps) => {
  // Try to extract output reasonably
  let output = "";
  if (toolPart.output) {
    if (typeof toolPart.output === "string") {
      output = toolPart.output;
    } else {
      const outputRecord =
        typeof toolPart.output === "object"
          ? (toolPart.output as Record<string, UntypedJson>)
          : null;
      if (outputRecord && typeof outputRecord.logs === "string") {
        output = outputRecord.logs;
      } else {
        output = JSON.stringify(toolPart.output, null, 2);
      }
    }
  }

  const isStreaming =
    toolPart.state === "input-streaming" ||
    toolPart.state === "input-available";
  // Maybe show command in title if available
  const inputRecord =
    toolPart.input && typeof toolPart.input === "object"
      ? (toolPart.input as Record<string, UntypedJson>)
      : null;
  const command =
    typeof inputRecord?.command === "string" ? inputRecord.command : "Terminal";

  return (
    <Terminal autoScroll={true} isStreaming={isStreaming} output={output}>
      <TerminalHeader>
        <TerminalTitle>{command}</TerminalTitle>
        <div className="flex items-center gap-1">
          <TerminalStatus />
          <TerminalActions>
            <TerminalCopyButton />
            <TerminalClearButton />
          </TerminalActions>
        </div>
      </TerminalHeader>
      <TerminalContent />
    </Terminal>
  );
};
