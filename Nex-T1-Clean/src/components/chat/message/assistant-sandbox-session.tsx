"use client";

import { memo } from "react";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import {
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
  type SandboxHeaderProps,
} from "@/components/ai-elements/sandbox";
import { WebPreview, WebPreviewBody } from "@/components/ai-elements/web-preview";
import { resolveActiveIdeSessionFromMessage } from "@/components/dashboard/chat-shell/helpers/active-tool";
import type { ConversationMessage } from "@/components/chat/types";
import type { NativeIdeFile, NativeIdeSessionData } from "@/modules/chat/ui-message-parts";

type SandboxView = {
  title: string;
  code: string;
  language: string;
};

function pickPrimaryFile(session: NativeIdeSessionData): NativeIdeFile | null {
  if (session.activePath) {
    const activeFile = session.files.find((file) => file.path === session.activePath);
    if (activeFile) return activeFile;
  }

  if (session.entryFile) {
    const entryFile = session.files.find((file) => file.path === session.entryFile);
    if (entryFile) return entryFile;
  }

  return session.files.find((file) => file.content) ?? session.files[0] ?? null;
}

function getCodeView(session: NativeIdeSessionData): SandboxView | null {
  const primaryFile = pickPrimaryFile(session);
  if (!primaryFile) return null;
  if (typeof primaryFile.content === "string" && primaryFile.content.length > 0) {
    return {
      title: primaryFile.path,
      code: primaryFile.content,
      language: primaryFile.language ?? "text",
    };
  }

  const fileList = session.files
    .map((file) => (file.kind === "dir" ? `${file.path}/` : file.path))
    .join("\n");

  if (!fileList) return null;

  return {
    title: session.title ?? primaryFile.path,
    code: fileList,
    language: "text",
  };
}

function getOutputView(session: NativeIdeSessionData): string | null {
  const lines: string[] = [];
  if (session.terminal?.command) {
    lines.push(`$ ${session.terminal.command}`);
  }
  if (session.terminal?.output) {
    lines.push(session.terminal.output);
  }
  if (session.previewUrl) {
    lines.push(`Preview: ${session.previewUrl}`);
  }

  const testSummary = session.testResults?.items
    ?.map((item) => `[${item.status}] ${item.name}`)
    .join("\n");
  if (testSummary) {
    lines.push(testSummary);
  }

  const content = lines.filter(Boolean).join("\n\n").trim();
  return content.length > 0 ? content : null;
}

function getHeaderState(
  session: NativeIdeSessionData,
): SandboxHeaderProps["state"] {
  const normalizedStatus = session.status?.toLowerCase();

  if (normalizedStatus === "error" || normalizedStatus === "failed") {
    return "output-error";
  }
  if (session.terminal && session.terminal.isComplete === false) {
    return "input-available";
  }
  if (normalizedStatus === "running" || normalizedStatus === "pending") {
    return "input-streaming";
  }
  return "output-available";
}

export const AssistantSandboxSession = memo(function AssistantSandboxSession({
  message,
}: {
  message: ConversationMessage;
}) {
  const session = resolveActiveIdeSessionFromMessage(message);
  const codeView = session ? getCodeView(session) : null;
  const outputView = session ? getOutputView(session) : null;
  if (!session || (!codeView && !outputView && !session.previewHtml && !session.previewUrl)) {
    return null;
  }

  const tabs = [
    codeView ? "code" : null,
    outputView ? "output" : null,
    session.previewHtml || session.previewUrl ? "preview" : null,
  ].filter((value): value is "code" | "output" | "preview" => value !== null);

  const defaultTab = tabs[0] ?? "code";
  const title = codeView?.title ?? session.title ?? (session.sandboxId ? `Sandbox ${session.sandboxId.slice(0, 8)}` : "Sandbox");

  return (
    <Sandbox className="mt-3 overflow-hidden" data-testid="assistant-sandbox-session">
      <SandboxHeader state={getHeaderState(session)} title={title} />
      <SandboxContent>
        <SandboxTabs defaultValue={defaultTab}>
          {tabs.length > 1 ? (
            <SandboxTabsBar>
              <SandboxTabsList>
                {codeView ? (
                  <SandboxTabsTrigger value="code">Code</SandboxTabsTrigger>
                ) : null}
                {outputView ? (
                  <SandboxTabsTrigger value="output">Output</SandboxTabsTrigger>
                ) : null}
                {session.previewHtml || session.previewUrl ? (
                  <SandboxTabsTrigger value="preview">Preview</SandboxTabsTrigger>
                ) : null}
              </SandboxTabsList>
            </SandboxTabsBar>
          ) : null}

          {codeView ? (
            <SandboxTabContent value="code">
              <CodeBlock code={codeView.code} language={codeView.language}>
                <CodeBlockCopyButton />
              </CodeBlock>
            </SandboxTabContent>
          ) : null}

          {outputView ? (
            <SandboxTabContent value="output">
              <CodeBlock code={outputView} language="text">
                <CodeBlockCopyButton />
              </CodeBlock>
            </SandboxTabContent>
          ) : null}

          {session.previewHtml || session.previewUrl ? (
            <SandboxTabContent value="preview">
              <WebPreview className="min-h-[320px]">
                <WebPreviewBody
                  className="min-h-[320px]"
                  src={session.previewHtml ? undefined : session.previewUrl ?? undefined}
                  srcDoc={session.previewHtml ?? undefined}
                />
              </WebPreview>
            </SandboxTabContent>
          ) : null}
        </SandboxTabs>
      </SandboxContent>
    </Sandbox>
  );
});
