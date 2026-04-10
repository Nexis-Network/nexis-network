"use client";

import type { ToolUIPart } from "ai";
import {
  EnvironmentVariable,
  EnvironmentVariables,
  EnvironmentVariablesContent,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
} from "@/components/ai-elements/environment-variables";
import { CodeSandbox } from "@/components/ai-elements/code-sandbox";
import { TerminalElement } from "@/components/ai-elements/terminal-element";

export function renderActiveToolContent(activeTool?: UntypedJson | null) {
  if (!activeTool) return null;

  const toolName =
    typeof activeTool === "object" &&
    activeTool &&
    typeof (activeTool as { toolName?: unknown }).toolName === "string"
      ? ((activeTool as { toolName: string }).toolName as string)
      : "";
  if (!toolName) return null;

  const toolInvocation = activeTool as {
    state?: string;
    args?: UntypedJson;
    result?: UntypedJson;
  };
  const toolPart = {
    ...(activeTool as object),
    input: toolInvocation.args,
    output: toolInvocation.result,
    state:
      toolInvocation.state === "partial-call"
        ? "input-streaming"
        : toolInvocation.state === "result"
          ? "output-available"
          : "input-available",
  };

  if (
    ["sandbox", "code_interpreter", "execute_python", "python"].includes(
      toolName,
    )
  ) {
    return <CodeSandbox toolPart={toolPart as ToolUIPart} />;
  }

  if (["terminal", "execute_command", "run_terminal", "bash"].includes(toolName)) {
    return <TerminalElement toolPart={toolPart as ToolUIPart} />;
  }

  if (!["set_environment_variables", "manage_env"].includes(toolName)) {
    return null;
  }

  const args = (toolInvocation.args ?? {}) as Record<string, UntypedJson>;
  const entries = args.variables
    ? Object.entries(args.variables as Record<string, UntypedJson>)
    : Object.entries(args);

  return (
    <div className="w-full">
      <EnvironmentVariables defaultShowValues>
        <EnvironmentVariablesHeader>
          <EnvironmentVariablesTitle>Environment Variables</EnvironmentVariablesTitle>
        </EnvironmentVariablesHeader>
        <EnvironmentVariablesContent>
          {entries.map(([key, val]) => (
            <EnvironmentVariable key={key} name={key} value={String(val)} />
          ))}
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No variables set.</div>
          ) : null}
        </EnvironmentVariablesContent>
      </EnvironmentVariables>
    </div>
  );
}
