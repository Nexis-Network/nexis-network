"use client";

import { Button } from "@/components/ui/button";
import {
  artifactGhostControlClass,
  artifactViewportClass,
} from "@/components/ai-elements/artifact-ui";
import { cn } from "@/lib/utils";
import {
  ChevronRightIcon,
  FileCode2Icon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { useMemo, useState, type HTMLAttributes } from "react";

export type FileTreeNode = {
  path: string;
  label?: string;
  kind?: "file" | "dir";
  language?: string;
};

export type FileTreeProps = HTMLAttributes<HTMLDivElement> & {
  nodes: FileTreeNode[];
  selectedPath?: string | null;
  onSelectPath?: (path: string) => void;
};

type TreeItem = {
  name: string;
  path: string;
  kind: "file" | "dir";
  children: Map<string, TreeItem>;
};

function buildTree(nodes: FileTreeNode[]) {
  const root: TreeItem = {
    name: "",
    path: "",
    kind: "dir",
    children: new Map(),
  };

  for (const node of nodes) {
    const kind = node.kind ?? "file";
    const segments = node.path.split("/").filter(Boolean);
    let current = root;

    segments.forEach((segment, index) => {
      const currentPath = segments.slice(0, index + 1).join("/");
      const isLeaf = index === segments.length - 1;
      const nextKind = isLeaf ? kind : "dir";
      const existing = current.children.get(segment);

      if (existing) {
        current = existing;
        return;
      }

      const created: TreeItem = {
        name: segment,
        path: currentPath,
        kind: nextKind,
        children: new Map(),
      };
      current.children.set(segment, created);
      current = created;
    });
  }

  return root;
}

function sortTreeItems(left: TreeItem, right: TreeItem): number {
  if (left.kind !== right.kind) {
    return left.kind === "dir" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

function TreeBranch({
  item,
  depth,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelectPath,
}: {
  item: TreeItem;
  depth: number;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectPath?: (path: string) => void;
}) {
  const isDir = item.kind === "dir";
  const isExpanded = isDir ? expandedPaths.has(item.path) : false;
  const hasChildren = item.children.size > 0;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          artifactGhostControlClass,
          "h-8 w-full justify-start px-2 text-left font-normal shadow-none",
          selectedPath === item.path &&
            "bg-[var(--artifact-control-active)] text-[var(--artifact-control-foreground)]",
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          if (isDir) {
            onToggle(item.path);
          } else {
            onSelectPath?.(item.path);
          }
        }}
        aria-current={selectedPath === item.path ? "true" : undefined}
      >
        {isDir ? (
          <>
            <ChevronRightIcon
              className={cn("mr-1 size-4 shrink-0 transition-transform", isExpanded && "rotate-90")}
            />
            {isExpanded ? (
              <FolderOpenIcon className="mr-2 size-4 shrink-0 text-[var(--artifact-folder)]" />
            ) : (
              <FolderIcon className="mr-2 size-4 shrink-0 text-[var(--artifact-folder)]" />
            )}
          </>
        ) : (
          <>
            <span className="mr-1 block size-4 shrink-0" />
            {item.name.match(/\.(tsx?|jsx?|json|html|css|md|sol|rs|py|sh)$/i) ? (
              <FileCode2Icon className="mr-2 size-4 shrink-0 text-[var(--artifact-control-foreground)]" />
            ) : (
              <FileIcon className="mr-2 size-4 shrink-0 text-[var(--artifact-file)]" />
            )}
          </>
        )}
        <span className="truncate">{item.name}</span>
      </Button>
      {isDir && isExpanded && hasChildren ? (
        <div className="space-y-0.5">
          {Array.from(item.children.values())
            .sort(sortTreeItems)
            .map((child) => (
              <TreeBranch
                key={child.path}
                item={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelectPath={onSelectPath}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function FileTree({
  nodes,
  selectedPath,
  onSelectPath,
  className,
  ...props
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () =>
      new Set(
        nodes
          .map((node) => node.path.split("/").filter(Boolean))
          .flatMap((segments) =>
            segments.slice(0, Math.max(segments.length - 1, 0)).map((_, index) => segments.slice(0, index + 1).join("/")),
          ),
      ),
  );

  return (
    <div
      className={cn(
        artifactViewportClass,
        "flex h-full flex-col gap-1 p-2 text-sm text-[var(--artifact-foreground)]",
        className,
      )}
      {...props}
    >
      {Array.from(tree.children.values())
        .sort(sortTreeItems)
        .map((item) => (
          <TreeBranch
            key={item.path}
            item={item}
            depth={0}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={(path) => {
              setExpandedPaths((previous) => {
                const next = new Set(previous);
                if (next.has(path)) {
                  next.delete(path);
                } else {
                  next.add(path);
                }
                return next;
              });
            }}
            onSelectPath={onSelectPath}
          />
        ))}
    </div>
  );
}
