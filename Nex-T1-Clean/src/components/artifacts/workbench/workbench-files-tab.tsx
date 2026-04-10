"use client";

import { RefreshCw } from "lucide-react";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { FileTree } from "@/components/ai-elements/file-tree";
import {
  artifactEmptyStateClass,
  artifactGhostControlClass,
} from "@/components/ai-elements/artifact-ui";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  pickLanguage,
  type SandboxFile,
} from "@/components/artifacts/sandbox-workbench-utils";

type WorkbenchFilesTabProps = {
  sandboxId: string | null;
  filesLoading: boolean;
  files: SandboxFile[];
  selectedFile: string;
  selectedFileContent: string;
  selectedFileLoading: boolean;
  onRefreshFiles: () => void;
  onLoadFileContent: (path: string) => void;
};

export function WorkbenchFilesTab({
  sandboxId,
  filesLoading,
  files,
  selectedFile,
  selectedFileContent,
  selectedFileLoading,
  onRefreshFiles,
  onLoadFileContent,
}: WorkbenchFilesTabProps) {
  const fileNodes = files.map((file) => ({
    path: file.path,
    kind: file.kind,
    label: file.name,
  }));
  const treePane = filesLoading ? (
    <div className="space-y-2 p-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  ) : files.length === 0 ? (
    <div className="p-3 text-xs text-[var(--artifact-muted)]">
      No files found yet.
    </div>
  ) : (
    <FileTree
      nodes={fileNodes}
      selectedPath={selectedFile}
      onSelectPath={onLoadFileContent}
      className="border-none bg-transparent p-0"
    />
  );
  const contentPane = selectedFileLoading ? (
    <div className="space-y-2 p-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-[var(--artifact-terminal-min-height)] w-full" />
    </div>
  ) : selectedFile && selectedFileContent ? (
    <CodeBlock
      code={selectedFileContent}
      language={pickLanguage(selectedFile)}
      className="h-full border-none rounded-none"
    >
      <CodeBlockCopyButton />
    </CodeBlock>
  ) : (
    <div className={cn(artifactEmptyStateClass, "rounded-none border-none")}>
      Select a file to inspect its content.
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
            Files
          </p>
          <p className="text-sm text-[var(--artifact-foreground)]">
            Explore the generated artifact workspace.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRefreshFiles}
          disabled={!sandboxId || filesLoading}
          className={cn(
            artifactGhostControlClass,
            "rounded-[var(--artifact-radius-pill)] px-4",
          )}
        >
          <RefreshCw
            className={cn("mr-1.5 size-3.5", filesLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:hidden">
        <div className="min-h-[220px] overflow-hidden rounded-[var(--artifact-radius-panel)] border border-[var(--artifact-border)] bg-[var(--artifact-file-tree-bg)] p-2">
          {treePane}
        </div>
        <div className="min-h-0 overflow-hidden rounded-[var(--artifact-radius-panel)] border border-[var(--artifact-border)] bg-[var(--artifact-code-background)]">
          {contentPane}
        </div>
      </div>

      <ResizablePanelGroup
        autoSaveId="artifact-workbench-files"
        className="hidden min-h-0 flex-1 md:flex"
        direction="horizontal"
      >
        <ResizablePanel
          className="min-w-0"
          defaultSize={28}
          minSize={20}
          maxSize={42}
        >
          <div className="h-full overflow-hidden rounded-[var(--artifact-radius-panel)] border border-[var(--artifact-border)] bg-[var(--artifact-file-tree-bg)] p-2">
            {treePane}
          </div>
        </ResizablePanel>
        <ResizableHandle
          className="mx-1.5 bg-transparent after:w-px after:bg-[var(--artifact-divider)] [&>div]:h-10 [&>div]:w-4 [&>div]:rounded-[var(--artifact-radius-pill)] [&>div]:border-[var(--artifact-border)] [&>div]:bg-[var(--artifact-toolbar)] [&>div]:text-[var(--artifact-muted)]"
          withHandle
        />
        <ResizablePanel className="min-w-0" defaultSize={72} minSize={46}>
          <div
            className="h-full overflow-hidden rounded-[var(--artifact-radius-panel)] border border-[var(--artifact-border)] bg-[var(--artifact-code-background)]"
            data-testid="artifact-code-view"
          >
            {contentPane}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
