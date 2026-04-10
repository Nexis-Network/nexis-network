"use client";

import type { LucideIcon } from "lucide-react";
import {
  FileCode2,
  FolderTree,
  Globe,
  Route,
  ScrollText,
  TerminalSquare,
  TrendingUp,
} from "lucide-react";
import type { WorkbenchTab } from "./sandbox-workbench-surface";

export const WORKBENCH_TAB_ORDER: WorkbenchTab[] = [
  "code",
  "preview",
  "files",
  "terminal",
  "contracts",
  "web",
  "pdf",
  "simulator",
  "polymarket",
];

export const WORKBENCH_TAB_LABELS: Record<WorkbenchTab, string> = {
  code: "Code",
  preview: "Preview",
  files: "Files",
  terminal: "Terminal",
  contracts: "Contracts",
  web: "Web",
  pdf: "PDF",
  simulator: "Simulator",
  polymarket: "Polymarket",
};

export const WORKBENCH_TAB_ICONS: Record<WorkbenchTab, LucideIcon> = {
  code: FileCode2,
  preview: Globe,
  files: FolderTree,
  terminal: TerminalSquare,
  contracts: ScrollText,
  web: Globe,
  pdf: ScrollText,
  simulator: Route,
  polymarket: TrendingUp,
};

type InferWorkbenchCodeFileNameArgs = {
  contractFiles: Array<{ path: string }>;
  effectiveCode: string;
  selectedContractPath: string | null;
  selectedFile: string;
};

export function inferWorkbenchCodeFileName({
  contractFiles,
  effectiveCode,
  selectedContractPath,
  selectedFile,
}: InferWorkbenchCodeFileNameArgs): string {
  const selected =
    selectedFile || selectedContractPath || contractFiles[0]?.path;

  if (selected) {
    const parts = selected.split("/");
    return parts[parts.length - 1] ?? selected;
  }

  if (/pragma\s+solidity/i.test(effectiveCode)) {
    const contractMatch = effectiveCode.match(
      /contract\s+([A-Za-z_][A-Za-z0-9_]*)/,
    );
    return `${contractMatch?.[1] ?? "Contract"}.sol`;
  }

  if (/^import\s+React|from\s+["']react["']/m.test(effectiveCode)) {
    return "App.tsx";
  }

  if (/^\s*def\s+\w+\(/m.test(effectiveCode)) {
    return "artifact.py";
  }

  return "artifact.txt";
}
