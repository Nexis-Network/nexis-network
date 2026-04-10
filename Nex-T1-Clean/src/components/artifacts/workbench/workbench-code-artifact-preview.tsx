"use client";

import { ChevronDown, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SandboxFile } from "@/components/artifacts/sandbox-workbench-utils";

type WorkbenchCodeArtifactPreviewProps = {
  loading?: boolean;
  view: "code" | "preview";
  onViewChange: (view: "code" | "preview") => void;
  files: SandboxFile[];
  filesLoading: boolean;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  code: string;
  hasCode: boolean;
  hasPreview: boolean;
  previewUrl: string;
  previewHtml: string;
};

type TreeEntry = {
  id: string;
  path: string;
  label: string;
  depth: number;
  kind: "folder" | "file";
};

function buildTreeEntries(paths: string[]): TreeEntry[] {
  const entries = new Map<string, TreeEntry>();

  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    for (let index = 0; index < parts.length; index += 1) {
      const partial = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      const kind: TreeEntry["kind"] = isFile ? "file" : "folder";

      if (!entries.has(partial)) {
        entries.set(partial, {
          id: partial,
          path: partial,
          label: parts[index],
          depth: index,
          kind,
        });
      }
    }
  }

  return Array.from(entries.values()).sort((a, b) => {
    if (a.path === b.path) return 0;
    if (a.path.startsWith(`${b.path}/`)) return 1;
    if (b.path.startsWith(`${a.path}/`)) return -1;

    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }

    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }

    return a.path.localeCompare(b.path);
  });
}

export function WorkbenchCodeArtifactPreview({
  loading = false,
  view,
  onViewChange,
  files,
  filesLoading,
  selectedFile,
  onSelectFile,
  code,
  hasCode,
  hasPreview,
  previewUrl,
  previewHtml,
}: WorkbenchCodeArtifactPreviewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filePaths = useMemo(() => {
    const normalized = files
      .filter((file) => file.kind === "file")
      .map((file) => file.path)
      .filter((path) => path.length > 0);

    if (normalized.length > 0) {
      return normalized;
    }

    if (selectedFile) {
      return [selectedFile];
    }

    return [];
  }, [files, selectedFile]);

  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) {
      return filePaths;
    }

    const query = searchQuery.trim().toLowerCase();
    return filePaths.filter((path) => path.toLowerCase().includes(query));
  }, [filePaths, searchQuery]);

  const treeEntries = useMemo(() => {
    const limit = 48;
    return buildTreeEntries(filteredPaths.slice(0, limit));
  }, [filteredPaths]);

  const codeLines = useMemo(() => {
    if (!hasCode || !code) return [];
    return code.split("\n");
  }, [code, hasCode]);

  const activeFile = selectedFile || filePaths[0] || "src/App.tsx";

  if (loading && !hasCode && !hasPreview) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  return (
    <div
      data-testid="code-artifact-preview"
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border bg-[var(--artifact-panel)] shadow-none"
      style={{ borderColor: "var(--artifact-border-strong)" }}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className="box-border flex h-[240px] shrink-0 flex-col border bg-[var(--artifact-elevated)] px-[12.6306px] pb-[12.6306px] pt-[15.7882px] md:h-full md:w-[235.24px]"
          style={{ borderColor: "var(--artifact-border-strong)" }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-[15.79px]">
            <div className="box-border flex h-[27.95px] w-[137.78px] items-center justify-center gap-[6.32px] rounded-[11.0517px] border border-[var(--artifact-border-strong)] p-[3.15764px]">
              <button
                type="button"
                onClick={() => onViewChange("code")}
                data-testid="artifact-view-switch-code"
                className={cn(
                  "box-border inline-flex h-[21.63px] min-w-[56.58px] items-center justify-center rounded-[8px] px-[15.7882px] py-[6.31528px] text-[9.47292px] font-medium leading-[100%] transition-colors",
                  view === "code"
                    ? "bg-[var(--artifact-control-active)] text-[var(--artifact-control-foreground)]"
                    : "text-[var(--artifact-muted)]",
                )}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => onViewChange("preview")}
                data-testid="artifact-view-switch-preview"
                className={cn(
                  "box-border inline-flex h-[21.63px] min-w-[68.58px] items-center justify-center rounded-[4.73646px] px-[15.7882px] py-[6.31528px] text-[9.47292px] font-medium leading-[100%] transition-colors",
                  view === "preview"
                    ? "bg-[var(--artifact-control-active)] text-[var(--artifact-control-foreground)]"
                    : "text-[var(--artifact-muted)]",
                )}
              >
                Preview
              </button>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3 -translate-y-1/2 text-[var(--artifact-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files"
                className="box-border h-[31.79px] w-full rounded-[11.0517px] border border-[var(--artifact-border-strong)] bg-transparent px-[9.47292px] pl-8 text-[11.0517px] leading-4 text-[var(--artifact-foreground)] placeholder:text-[var(--artifact-muted)] focus:outline-none"
              />
            </label>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="inline-flex h-[27.79px] items-center px-[9.47292px] text-[9.47292px] font-medium leading-[125%] text-[var(--artifact-foreground)]">
                Files
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                {filesLoading ? (
                  <div className="space-y-2 px-[9.47292px] py-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                ) : treeEntries.length === 0 ? (
                  <div className="px-[9.47292px] py-2 text-[11.0517px] text-[var(--artifact-muted)]">
                    No files yet.
                  </div>
                ) : (
                  treeEntries.map((entry) => {
                    const isActive =
                      entry.kind === "file" && entry.path === activeFile;
                    const indentation = entry.depth * 12;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          if (entry.kind === "file") {
                            onSelectFile(entry.path);
                          }
                        }}
                        className={cn(
                          "flex h-[30px] w-full items-center gap-[7.89px] rounded-[6.31528px] px-[9.47292px] text-left",
                          entry.kind === "file"
                            ? "hover:bg-[var(--artifact-control-hover)]"
                            : "cursor-default",
                          isActive &&
                            "bg-[var(--artifact-control-active)] text-[var(--artifact-control-foreground)]",
                        )}
                        style={{
                          paddingLeft: `${Math.min(18.9458 + indentation, 52)}px`,
                        }}
                        aria-current={isActive ? "true" : undefined}
                      >
                        {entry.kind === "folder" ? (
                          <>
                            <ChevronDown className="size-[12.63px] text-[var(--artifact-muted)]" />
                            <span className="truncate text-[11.0517px] font-normal leading-[125%] text-[var(--artifact-muted)]">
                              {entry.label}
                            </span>
                          </>
                        ) : (
                          <>
                            <FileText
                              className={cn(
                                "size-[12.63px]",
                                isActive
                                  ? "text-[var(--artifact-foreground)]"
                                  : "text-[var(--artifact-muted)]",
                              )}
                            />
                            <span
                              className={cn(
                                "truncate text-[11.0517px] font-normal leading-[125%]",
                                isActive
                                  ? "text-[var(--artifact-foreground)]"
                                  : "text-[var(--artifact-muted)]",
                              )}
                            >
                              {entry.label}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="box-border flex h-[26.63px] items-center gap-[7.89px] border-b border-[var(--artifact-border-strong)] bg-[var(--artifact-elevated)] px-[15.7882px] py-[6.31528px]">
            <span className="truncate text-[11.0517px] font-medium leading-[125%] text-[var(--artifact-muted)]">
              {activeFile}
            </span>
          </header>

          {view === "preview" ? (
            <div className="min-h-0 flex-1 bg-[var(--artifact-surface)]">
              {hasPreview ? (
                <iframe
                  data-testid="artifact-preview-frame"
                  className="h-full w-full border-0 bg-[var(--artifact-preview-canvas)]"
                  src={previewUrl || undefined}
                  srcDoc={previewUrl ? undefined : previewHtml}
                  title="Artifact Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-[11.0517px] text-[var(--artifact-muted)]">
                  No preview available yet.
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="box-border w-[25.26px] shrink-0 border-r border-[var(--artifact-border-strong)] bg-[var(--artifact-elevated)]">
                <div className="no-scrollbar h-full overflow-y-auto py-[6.31528px]">
                  {codeLines.length > 0 ? (
                    codeLines.map((_, index) => (
                      <div
                        key={`line-${index}`}
                        className="h-[14px] px-[2px] text-center text-[9.47292px] font-medium leading-[125%] text-[var(--artifact-muted)] opacity-80"
                      >
                        {index + 1}
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-2 text-center text-[9.47292px] text-[var(--artifact-muted)] opacity-80">
                      1
                    </div>
                  )}
                </div>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-auto bg-[var(--artifact-surface)] p-[12px]">
                {hasCode ? (
                  <pre
                    data-testid="artifact-code-view"
                    className="min-h-full whitespace-pre text-[11.0517px] font-normal leading-[14px] text-[var(--artifact-code-foreground)]"
                    style={{
                      fontFamily:
                        "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    }}
                  >
                    {code}
                  </pre>
                ) : (
                  <div className="text-[11.0517px] text-[var(--artifact-muted)]">
                    Waiting for code stream from the agent.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
