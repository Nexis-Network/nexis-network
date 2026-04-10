"use client";

import type { ToolUIPart } from "ai";
import {
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@/components/ai-elements/sandbox";
import { CodeBlock } from "@/components/ai-elements/code-block";

type CodeSandboxProps = {
  toolPart: ToolUIPart;
};

export const CodeSandbox = ({ toolPart }: CodeSandboxProps) => {
  const input = toolPart.input;
  const outputPayload = toolPart.output;
  const inputRecord =
    input && typeof input === "object"
      ? (input as Record<string, UntypedJson>)
      : {};
  const outputRecord =
    outputPayload && typeof outputPayload === "object"
      ? (outputPayload as Record<string, UntypedJson>)
      : {};
  const code = typeof inputRecord.code === "string" ? inputRecord.code : "";
  const output = typeof outputRecord.logs === "string" ? outputRecord.logs : "";
  const filename =
    typeof inputRecord.filename === "string"
      ? inputRecord.filename
      : "code.tsx";

  return (
    <Sandbox>
      <SandboxHeader state={toolPart.state} title={filename} />
      <SandboxContent>
        <SandboxTabs defaultValue="code">
          <SandboxTabsBar>
            <SandboxTabsList>
              <SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
              <SandboxTabsTrigger value="output">Output</SandboxTabsTrigger>
            </SandboxTabsList>
          </SandboxTabsBar>
          <SandboxTabContent value="code">
            <CodeBlock code={code} language="tsx" />
          </SandboxTabContent>
          <SandboxTabContent value="output">
            <CodeBlock code={output} language="log" />
          </SandboxTabContent>
        </SandboxTabs>
      </SandboxContent>
    </Sandbox>
  );
};
