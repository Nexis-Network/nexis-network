"use client";

import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkbenchEmptyLogo } from "@/components/artifacts/workbench-shell/icons";
import { WorkbenchPdfTab } from "@/components/artifacts/workbench/workbench-pdf-tab";
import { WorkbenchPolymarketTab } from "@/components/artifacts/workbench/workbench-polymarket-tab";
import { WorkbenchPreviewTab } from "@/components/artifacts/workbench/workbench-preview-tab";
import { WorkbenchSimulatorTab } from "@/components/artifacts/workbench/workbench-simulator-tab";
import {
  WorkbenchSmartContractTab,
  type SmartContractFile,
} from "@/components/artifacts/workbench/workbench-smart-contract-tab";
import { WorkbenchWebTab } from "@/components/artifacts/workbench/workbench-web-tab";
import {
  pickLanguage,
  type SandboxFile,
  type SimulatorEntry,
} from "@/components/artifacts/sandbox-workbench-utils";
import type { SandboxMainView } from "@/components/artifacts/sandbox-workbench.types";

function SandboxWorkbenchEmptyState() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[var(--artifact-workbench-empty-surface)]">
      <div className="flex flex-col items-center gap-4 text-[var(--artifact-workbench-empty-logo)]">
        <WorkbenchEmptyLogo className="size-12" />
        <span className="sr-only">Empty artifact editor</span>
      </div>
    </div>
  );
}

type SandboxWorkbenchMainProps = {
  activeView: SandboxMainView;
  code: string;
  contractChain: string | null;
  contractCommands: string[];
  contractFiles: SmartContractFile[];
  contractFramework: string | null;
  files: SandboxFile[];
  loading: boolean;
  pdfBase64: string;
  pdfFileName: string | null;
  pdfUrl: string;
  previewHtml: string;
  previewUrl: string;
  selectedContractPath: string | null;
  selectedFile: string;
  selectedFileContent: string;
  selectedFileLoading: boolean;
  simulatorEntries: SimulatorEntry[];
  webHtml: string;
  webUrl: string;
  onSelectContractPath: (path: string) => void;
};

export function SandboxWorkbenchMain({
  activeView,
  code,
  contractChain,
  contractCommands,
  contractFiles,
  contractFramework,
  files,
  loading,
  pdfBase64,
  pdfFileName,
  pdfUrl,
  previewHtml,
  previewUrl,
  selectedContractPath,
  selectedFile,
  selectedFileContent,
  selectedFileLoading,
  simulatorEntries,
  webHtml,
  webUrl,
  onSelectContractPath,
}: SandboxWorkbenchMainProps) {
  if (activeView === "preview") {
    return (
      <WorkbenchPreviewTab
        hasPreview={Boolean(previewUrl || previewHtml)}
        previewHtml={previewHtml}
        previewUrl={previewUrl}
        loading={loading}
      />
    );
  }

  if (activeView === "contracts") {
    return (
      <div
        className="h-full overflow-hidden p-4"
        data-testid="artifact-contract-view"
      >
        <WorkbenchSmartContractTab
          loading={loading}
          contracts={contractFiles}
          activePath={selectedContractPath}
          framework={contractFramework}
          chain={contractChain}
          commands={contractCommands}
          onSelectPath={onSelectContractPath}
        />
      </div>
    );
  }

  if (activeView === "web") {
    return (
      <div className="h-full overflow-hidden p-4">
        <WorkbenchWebTab loading={loading} webUrl={webUrl} webHtml={webHtml} />
      </div>
    );
  }

  if (activeView === "pdf") {
    return (
      <div className="h-full overflow-hidden p-4" data-testid="artifact-pdf-view">
        <WorkbenchPdfTab
          loading={loading}
          pdfUrl={pdfUrl}
          pdfBase64={pdfBase64}
          fileName={pdfFileName}
        />
      </div>
    );
  }

  if (activeView === "simulator") {
    return (
      <div className="h-full overflow-auto p-4">
        <WorkbenchSimulatorTab entries={simulatorEntries} />
      </div>
    );
  }

  if (activeView === "polymarket") {
    return (
      <div className="h-full overflow-auto p-4">
        <WorkbenchPolymarketTab />
      </div>
    );
  }

  if (selectedFileLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[var(--artifact-terminal-min-height)] w-full" />
      </div>
    );
  }

  const fallbackPath = selectedFile || files[0]?.path || "artifact.txt";
  const content = selectedFileContent || code;
  if (!content.trim()) {
    return <SandboxWorkbenchEmptyState />;
  }

  return (
    <div className="h-full overflow-hidden" data-testid="artifact-code-view">
      <CodeBlock
        code={content}
        language={pickLanguage(fallbackPath, "text")}
        showLineNumbers
        className="h-full rounded-none border-0 bg-[var(--artifact-code-background)]"
      >
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  );
}
