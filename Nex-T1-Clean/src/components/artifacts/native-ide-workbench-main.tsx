"use client";

import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { JSXPreview } from "@/components/ai-elements/jsx-preview";
import { TestResults } from "@/components/ai-elements/test-results";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
} from "@/components/ai-elements/web-preview";
import { WorkbenchEmptyLogo } from "@/components/artifacts/workbench-shell/icons";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";

function NativeIdeEmptyEditor() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[var(--artifact-workbench-empty-surface)]">
      <div className="flex flex-col items-center justify-center gap-4 text-[var(--artifact-workbench-empty-logo)]">
        <WorkbenchEmptyLogo className="size-12" />
        <span className="sr-only">Empty editor</span>
      </div>
    </div>
  );
}

type NativeIdeWorkbenchMainProps = {
  activeView: "files" | "code" | "preview" | "tests";
  selectedPath: string | null;
  session: NativeIdeSessionData;
};

export function NativeIdeWorkbenchMain({
  activeView,
  selectedPath,
  session,
}: NativeIdeWorkbenchMainProps) {
  const selectedFile =
    session.files.find((file) => file.path === selectedPath) ?? session.files[0];

  if (activeView === "preview") {
    if (session.jsxPreview) {
      return (
        <JSXPreview
          code={session.jsxPreview.code}
          srcDoc={session.previewHtml}
          language={session.jsxPreview.language ?? "tsx"}
          className="h-full rounded-none border-0 bg-[var(--artifact-preview-chrome)]"
        />
      );
    }

    if (session.previewUrl || session.previewHtml) {
      return (
        <WebPreview className="h-full rounded-none border-0 bg-[var(--artifact-preview-chrome)]">
          <WebPreviewNavigation className="justify-between border-b border-[var(--artifact-border-strong)] bg-[var(--artifact-preview-chrome)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
            {session.previewUrl ?? "Live preview"}
          </WebPreviewNavigation>
          <WebPreviewBody
            data-testid="artifact-preview-frame"
            src={session.previewUrl}
            srcDoc={session.previewHtml}
          />
        </WebPreview>
      );
    }

    return <NativeIdeEmptyEditor />;
  }

  if (activeView === "tests") {
    if (session.testResults?.items?.length) {
      return (
        <div className="h-full overflow-auto p-4" data-testid="artifact-tests-view">
          <TestResults
            items={session.testResults.items}
            className="border-[var(--artifact-border)] bg-[var(--artifact-panel)]"
          />
        </div>
      );
    }
    return <NativeIdeEmptyEditor />;
  }

  if (!selectedFile) {
    return <NativeIdeEmptyEditor />;
  }

  return (
    <div className="h-full overflow-hidden" data-testid="artifact-code-view">
      <CodeBlock
        code={selectedFile.content ?? ""}
        language={selectedFile.language ?? "text"}
        showLineNumbers
        className="h-full rounded-none border-0 bg-[var(--artifact-code-background)]"
      >
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  );
}
