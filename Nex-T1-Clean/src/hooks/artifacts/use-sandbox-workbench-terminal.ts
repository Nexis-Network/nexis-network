"use client";

import { type FormEvent, useCallback, useState } from "react";
import {
  asRecord,
  coerceString,
  normalizeTerminalResult,
  parseApiPayload,
  parseSsePayload,
} from "@/components/artifacts/sandbox-workbench-utils";

type UseSandboxWorkbenchTerminalArgs = {
  sandboxId: string | null;
  setError: (value: string | null) => void;
  appendSimulatorEntry: (entry: {
    label: string;
    status?: string;
    details?: string;
  }) => void;
};

export function useSandboxWorkbenchTerminal({
  appendSimulatorEntry,
  sandboxId,
  setError,
}: UseSandboxWorkbenchTerminalArgs) {
  const [terminalBuffer, setTerminalBuffer] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalBusy, setTerminalBusy] = useState(false);

  const appendTerminal = useCallback((value: string) => {
    if (!value) return;
    setTerminalBuffer((previous) =>
      `${previous}${previous ? "\n" : ""}${value}`,
    );
  }, []);

  const runTerminalCommand = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!sandboxId || !terminalInput.trim()) return;

      const command = terminalInput.trim();
      setTerminalInput("");
      appendTerminal(`$ ${command}`);
      setTerminalBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/sandbox/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId, command, stream: true }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as UntypedJson;
          throw new Error(
            coerceString(asRecord(payload).message) ??
              `Command failed (${response.status})`,
          );
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("text/event-stream") && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const payload = parseSsePayload(buffer.slice(0, boundary));
              buffer = buffer.slice(boundary + 2);
              if (payload) {
                const eventName = coerceString(payload.event);
                if (eventName === "stdout" || eventName === "stderr") {
                  const chunk = coerceString(payload.chunk);
                  if (chunk) appendTerminal(chunk);
                } else if (eventName === "complete") {
                  appendTerminal(normalizeTerminalResult(payload.result));
                } else if (eventName === "error") {
                  throw new Error(
                    coerceString(payload.message) ?? "Command execution failed",
                  );
                }
              }
              boundary = buffer.indexOf("\n\n");
            }
          }
        } else {
          const payload = (await response.json().catch(() => ({}))) as UntypedJson;
          const data = parseApiPayload<{ result?: UntypedJson }>(payload);
          appendTerminal(
            normalizeTerminalResult(data?.result ?? payload) ||
              "Command completed.",
          );
        }

        appendSimulatorEntry({
          label: "Terminal Command",
          status: "completed",
          details: command,
        });
      } catch (error) {
        const message = (error as Error).message;
        appendTerminal(`error: ${message}`);
        appendSimulatorEntry({
          label: "Terminal Command",
          status: "failed",
          details: message,
        });
        setError(message);
      } finally {
        setTerminalBusy(false);
      }
    },
    [appendSimulatorEntry, appendTerminal, sandboxId, setError, terminalInput],
  );

  const hasTerminal = terminalBuffer.trim().length > 0 || terminalBusy;
  const terminalText =
    terminalBuffer.trim().length > 0
      ? terminalBuffer
      : "No terminal output yet.";

  return {
    appendTerminal,
    hasTerminal,
    runTerminalCommand,
    setTerminalInput,
    terminalBusy,
    terminalInput,
    terminalText,
  };
}
