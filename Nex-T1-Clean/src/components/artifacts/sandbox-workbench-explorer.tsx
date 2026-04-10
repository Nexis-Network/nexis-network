"use client";

import { FileTree } from "@/components/ai-elements/file-tree";
import type { SandboxFile } from "@/components/artifacts/sandbox-workbench-utils";

type SandboxWorkbenchExplorerProps = {
  files: SandboxFile[];
  selectedFile: string;
  onOpenCode?: () => void;
  onSelectPath: (path: string) => void;
};

export function SandboxWorkbenchExplorer({
  files,
  selectedFile,
  onOpenCode,
  onSelectPath,
}: SandboxWorkbenchExplorerProps) {
  if (files.length === 0) {
    return (
      <div className="flex h-full items-center px-4 text-sm text-[var(--artifact-muted)]">
        Generated files will appear here once the sandbox writes them.
      </div>
    );
  }

  return (
    <FileTree
      nodes={files.map((file) => ({
        path: file.path,
        kind: file.kind,
        label: file.name,
      }))}
      selectedPath={selectedFile}
      onSelectPath={(path) => {
        onSelectPath(path);
        onOpenCode?.();
      }}
      className="h-full border-none bg-transparent p-0"
    />
  );
}
