"use client";

import { FileTree } from "@/components/ai-elements/file-tree";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";

type NativeIdeWorkbenchExplorerProps = {
  session: NativeIdeSessionData;
  selectedPath: string | null;
  onSelectPath: (path: string | null) => void;
  onOpenCode?: () => void;
};

export function NativeIdeWorkbenchExplorer({
  session,
  selectedPath,
  onSelectPath,
  onOpenCode,
}: NativeIdeWorkbenchExplorerProps) {
  return (
    <FileTree
      nodes={session.files.map((file) => ({
        path: file.path,
        kind: file.kind ?? "file",
        label: file.path.split("/").pop(),
      }))}
      selectedPath={selectedPath}
      onSelectPath={(path) => {
        onSelectPath(path);
        onOpenCode?.();
      }}
      className="h-full border-none bg-transparent p-0"
    />
  );
}
