"use client";

import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { FileTree } from "@/components/ai-elements/file-tree";
import { JSXPreview } from "@/components/ai-elements/jsx-preview";
import {
  Plan,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Queue } from "@/components/ai-elements/queue";
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import { TestResults } from "@/components/ai-elements/test-results";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
} from "@/components/ai-elements/web-preview";
import {
  workbenchEmptyStateClass,
} from "@/components/artifacts/workbench/workbench-ui";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { NativeIdeWorkbenchTab } from "./native-ide-workbench.utils";

type NativeIdeWorkbenchContentProps = {
  activeTab: NativeIdeWorkbenchTab;
  selectedPath: string | null;
  session: NativeIdeSessionData;
  onSelectPath: (path: string | null) => void;
  onTabChange: (tab: NativeIdeWorkbenchTab) => void;
};

export function NativeIdeWorkbenchContent({
  activeTab,
  selectedPath,
  session,
  onSelectPath,
  onTabChange,
}: NativeIdeWorkbenchContentProps) {
  const selectedFile =
    session.files.find((file) => file.path === selectedPath) ?? session.files[0];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col gap-3 xl:min-w-[260px]">
        <div className="min-h-[220px] overflow-auto xl:min-h-0 xl:flex-1">
          <FileTree
            nodes={session.files.map((file) => ({
              path: file.path,
              kind: file.kind ?? "file",
              label: file.path.split("/").pop(),
            }))}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
            className="h-full"
          />
        </div>

        {session.queue ? (
          <Queue
            pending={session.queue.pending}
            completed={session.queue.completed}
            failed={session.queue.failed}
          />
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as NativeIdeWorkbenchTab)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {session.plan?.length ? (
          <Plan
            defaultOpen
            isStreaming={session.status === "running"}
            className="border-[color:var(--artifact-border)] bg-[var(--artifact-toolbar)]"
          >
            <PlanHeader className="flex-row items-center">
              <div>
                <PlanTitle>Implementation Plan</PlanTitle>
                <PlanDescription>Live execution outline</PlanDescription>
              </div>
              <PlanTrigger />
            </PlanHeader>
            <PlanContent className="space-y-2">
              {session.plan.map((step) => (
                <div
                  key={step.id}
                  className="rounded-[18px] border px-3 py-2"
                  style={{
                    borderColor: "var(--artifact-border)",
                    backgroundColor: "var(--artifact-shell)",
                  }}
                >
                  <div className="text-sm font-medium text-[var(--artifact-foreground)]">
                    {step.title}
                  </div>
                  {step.description ? (
                    <div className="mt-1 text-xs text-[var(--artifact-muted)]">
                      {step.description}
                    </div>
                  ) : null}
                </div>
              ))}
            </PlanContent>
          </Plan>
        ) : null}

        <TabsContent
          value="code"
          className="min-h-0 flex-1 overflow-auto"
          data-testid="artifact-code-view"
        >
          {selectedFile ? (
            <CodeBlock
              code={selectedFile.content ?? ""}
              language={selectedFile.language ?? "text"}
              showLineNumbers
              className="h-full rounded-[var(--artifact-radius-panel)] border-[var(--artifact-border)]"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
          ) : (
            <div
              className={cn(
                workbenchEmptyStateClass,
                "bg-[var(--artifact-code-background)]",
              )}
            >
              No file selected.
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="preview"
          className="min-h-0 flex-1 overflow-hidden"
          data-testid="artifact-preview-view"
        >
          {session.jsxPreview ? (
            <JSXPreview
              code={session.jsxPreview.code}
              srcDoc={session.previewHtml}
              language={session.jsxPreview.language ?? "tsx"}
              className="h-full"
            />
          ) : session.previewUrl || session.previewHtml ? (
            <WebPreview className="h-full rounded-[var(--artifact-radius-panel)] border-[var(--artifact-border)] bg-[var(--artifact-preview-chrome)]">
              <WebPreviewNavigation className="border-[var(--artifact-border)] bg-[var(--artifact-preview-chrome)] text-xs uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
                {session.previewUrl ?? "Live preview"}
              </WebPreviewNavigation>
              <WebPreviewBody
                src={session.previewUrl}
                srcDoc={session.previewHtml}
              />
            </WebPreview>
          ) : (
            <div
              className={cn(
                workbenchEmptyStateClass,
                "bg-[var(--artifact-preview-chrome)]",
              )}
            >
              No preview available yet.
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="terminal"
          className="min-h-0 flex-1 overflow-hidden"
          data-testid="artifact-terminal-view"
        >
          {session.terminal ? (
            <Terminal
              output={session.terminal.output}
              isStreaming={!session.terminal.isComplete}
              autoScroll
              className="h-full rounded-[var(--artifact-radius-panel)] border-[var(--artifact-border)]"
            >
              <TerminalHeader className="border-[var(--artifact-border)] bg-[var(--artifact-preview-chrome)]">
                <TerminalTitle>
                  {session.terminal.command ?? "Terminal"}
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
          ) : (
            <div
              className={cn(
                workbenchEmptyStateClass,
                "bg-[var(--artifact-terminal-background)]",
              )}
            >
              No terminal output available yet.
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="tests"
          className="min-h-0 flex-1 overflow-auto"
          data-testid="artifact-tests-view"
        >
          {session.testResults?.items?.length ? (
            <TestResults items={session.testResults.items} />
          ) : (
            <div className={workbenchEmptyStateClass}>No test results yet.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
