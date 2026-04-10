import type { SmartContractFile } from "@/components/artifacts/workbench/workbench-smart-contract-tab";
import {
  asRecord,
  coerceString,
  normalizeFiles,
  pickLanguage,
  type InlineArtifactFile,
} from "@/components/artifacts/sandbox-workbench-utils";
import type { WorkbenchTab } from "@/components/artifacts/sandbox-workbench.types";

export type SandboxWorkbenchFileBindings = {
  inlineFiles: Record<string, InlineArtifactFile>;
  sandboxId: string | null;
  selectedFile: string;
  setActiveTab: (tab: WorkbenchTab) => void;
  setCode: (value: string) => void;
  setContractChain: (value: string | null) => void;
  setError: (value: string | null) => void;
  setFiles: (files: ReturnType<typeof normalizeFiles>) => void;
  setFilesLoading: (value: boolean) => void;
  setSelectedFile: (value: string) => void;
  setSelectedFileContent: (value: string) => void;
  setSelectedFileLoading: (value: boolean) => void;
  upsertContractFile: (entry: SmartContractFile) => void;
};

export async function assertSandboxJsonResponse(
  response: Response,
  fallbackMessage: string,
) {
  const payload = (await response.json().catch(() => ({}))) as UntypedJson;
  if (!response.ok) {
    throw new Error(
      coerceString(asRecord(payload).message) ??
        `${fallbackMessage} (${response.status})`,
    );
  }
  return payload;
}

export function syncContractFile(args: {
  content: string;
  path: string;
  setContractChain: (value: string | null) => void;
  setActiveTab: () => void;
  upsertContractFile: (entry: SmartContractFile) => void;
}) {
  const language = pickLanguage(args.path);
  if (language !== "solidity" && language !== "rust") return false;

  args.upsertContractFile({
    path: args.path,
    content: args.content,
    language,
  });
  args.setContractChain(language === "solidity" ? "evm" : "solana");
  args.setActiveTab();
  return true;
}
