import {
  normalizeFiles,
  parseContractFiles,
  parseInlineArtifactFiles,
} from "@/components/artifacts/sandbox-workbench-utils";
import type { WorkbenchTab } from "@/components/artifacts/sandbox-workbench.types";

export const POLYMARKET_TOOL_NAMES = new Set([
  "polymarket_markets",
  "polymarket_orderbook",
  "polymarket_positions",
  "polymarket_trade",
  "polymarket_bridge",
]);

export type SandboxWorkbenchToolBindings = {
  appendSimulatorEntry: (entry: {
    label: string;
    status?: string;
    details?: string;
  }) => void;
  appendTerminal: (value: string) => void;
  refreshFiles: () => Promise<void>;
  sandboxId: string | null;
  selectedFile: string;
  setActiveTab: (tab: WorkbenchTab) => void;
  setCode: (value: string) => void;
  setContractChain: (value: string | null) => void;
  setContractCommands: (value: string[]) => void;
  setContractFiles: (value: ReturnType<typeof parseContractFiles>) => void;
  setContractFramework: (value: string | null) => void;
  setFiles: (value: ReturnType<typeof normalizeFiles>) => void;
  setHasPolymarket: (value: boolean) => void;
  setInlineFiles: (value: Record<string, ReturnType<typeof parseInlineArtifactFiles>[number]>) => void;
  setPdfBase64: (value: string) => void;
  setPdfFileName: (value: string | null) => void;
  setPdfUrl: (value: string) => void;
  setPreviewHtml: (value: string) => void;
  setPreviewUrl: (value: string) => void;
  setSandboxId: (value: string | null) => void;
  setSelectedContractPath: (value: string | null) => void;
  setSelectedFile: (value: string) => void;
  setSelectedFileContent: (value: string) => void;
  setWebHtml: (value: string) => void;
  setWebUrl: (value: string) => void;
  upsertContractFile: (entry: {
    path: string;
    content: string;
    language: string;
  }) => void;
};

export function setContractStateFromFile(args: {
  content: string;
  path: string;
  setActiveTab: (tab: WorkbenchTab) => void;
  setContractChain: (value: string | null) => void;
  upsertContractFile: (entry: {
    path: string;
    content: string;
    language: string;
  }) => void;
}) {
  const extension = args.path.split(".").pop()?.toLowerCase();
  const language =
    extension === "sol" ? "solidity" : extension === "rs" ? "rust" : null;
  if (!language) return false;

  args.upsertContractFile({ path: args.path, content: args.content, language });
  args.setContractChain(language === "solidity" ? "evm" : "solana");
  args.setActiveTab("contracts");
  return true;
}
