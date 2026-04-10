"use client";

import { cn } from "@/lib/utils";
import { workbenchEmptyStateClass } from "@/components/artifacts/workbench/workbench-ui";
import {
  SandboxWorkbenchSurface,
  type WorkbenchTab,
} from "@/components/artifacts/sandbox-workbench-surface";

type SandboxWorkbenchChromeBodyProps = {
  activeTab: WorkbenchTab;
  code: string;
  contractChain: string | null;
  contractCommands: string[];
  contractFiles: Array<{ path: string; content: string; language: string }>;
  contractFramework: string | null;
  error: string | null;
  files: Array<{ path: string; name: string; kind: "file" | "dir" }>;
  filesLoading: boolean;
  hasAnyArtifactData: boolean;
  hasCode: boolean;
  hasPreview: boolean;
  loading: boolean;
  onLoadFileContent: (path: string) => void;
  onRefreshFiles: () => void;
  onRunCommand: React.FormEventHandler<HTMLFormElement>;
  onSelectContractPath: (path: string) => void;
  onTerminalInputChange: (value: string) => void;
  pdfBase64: string;
  pdfFileName: string | null;
  pdfUrl: string;
  previewHtml: string;
  previewUrl: string;
  sandboxId: string | null;
  selectedContractPath: string | null;
  selectedFile: string;
  selectedFileContent: string;
  selectedFileLoading: boolean;
  simulatorEntries: Array<{
    id: string;
    label: string;
    status?: string;
    details?: string;
    createdAt: number;
  }>;
  terminalBusy: boolean;
  terminalInput: string;
  terminalText: string;
  webHtml: string;
  webUrl: string;
};

export function SandboxWorkbenchChromeBody(
  props: SandboxWorkbenchChromeBodyProps,
) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {props.hasAnyArtifactData || props.loading ? (
          <SandboxWorkbenchSurface
            activeTab={props.activeTab}
            code={props.code}
            contractChain={props.contractChain}
            contractCommands={props.contractCommands}
            contractFiles={props.contractFiles}
            contractFramework={props.contractFramework}
            files={props.files}
            filesLoading={props.filesLoading}
            hasCode={props.hasCode}
            hasPreview={props.hasPreview}
            loading={props.loading}
            onLoadFileContent={props.onLoadFileContent}
            onRefreshFiles={props.onRefreshFiles}
            onRunCommand={props.onRunCommand}
            onSelectContractPath={props.onSelectContractPath}
            onTerminalInputChange={props.onTerminalInputChange}
            pdfBase64={props.pdfBase64}
            pdfFileName={props.pdfFileName}
            pdfUrl={props.pdfUrl}
            previewHtml={props.previewHtml}
            previewUrl={props.previewUrl}
            sandboxId={props.sandboxId}
            selectedContractPath={props.selectedContractPath}
            selectedFile={props.selectedFile}
            selectedFileContent={props.selectedFileContent}
            selectedFileLoading={props.selectedFileLoading}
            simulatorEntries={props.simulatorEntries}
            terminalBusy={props.terminalBusy}
            terminalInput={props.terminalInput}
            terminalText={props.terminalText}
            webHtml={props.webHtml}
            webUrl={props.webUrl}
          />
        ) : (
          <div
            className={cn(
              workbenchEmptyStateClass,
              "min-h-0 flex-1 text-[12px]",
            )}
          >
            Ask the agent to build, run, or simulate to display an artifact in
            this panel.
          </div>
        )}
      </div>

      {props.error ? (
        <p className="px-3 pb-2 text-xs text-destructive">{props.error}</p>
      ) : null}
    </>
  );
}
