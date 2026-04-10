"use client";

import type { FormEvent } from "react";
import type {
  SandboxFile,
  SimulatorEntry,
} from "@/components/artifacts/sandbox-workbench-utils";
import { pickLanguage } from "@/components/artifacts/sandbox-workbench-utils";
import { WorkbenchCodeTab } from "@/components/artifacts/workbench/workbench-code-tab";
import { WorkbenchFilesTab } from "@/components/artifacts/workbench/workbench-files-tab";
import { WorkbenchPdfTab } from "@/components/artifacts/workbench/workbench-pdf-tab";
import { WorkbenchPolymarketTab } from "@/components/artifacts/workbench/workbench-polymarket-tab";
import { WorkbenchPreviewTab } from "@/components/artifacts/workbench/workbench-preview-tab";
import { WorkbenchSimulatorTab } from "@/components/artifacts/workbench/workbench-simulator-tab";
import {
  WorkbenchSmartContractTab,
  type SmartContractFile,
} from "@/components/artifacts/workbench/workbench-smart-contract-tab";
import { WorkbenchTerminalTab } from "@/components/artifacts/workbench/workbench-terminal-tab";
import { WorkbenchWebTab } from "@/components/artifacts/workbench/workbench-web-tab";

export type WorkbenchTab =
  | "code"
  | "contracts"
  | "files"
  | "terminal"
  | "web"
  | "preview"
  | "pdf"
  | "simulator"
  | "polymarket";

type SandboxWorkbenchSurfaceProps = {
  activeTab: WorkbenchTab;
  code: string;
  contractChain: string | null;
  contractCommands: string[];
  contractFiles: SmartContractFile[];
  contractFramework: string | null;
  files: SandboxFile[];
  filesLoading: boolean;
  hasCode: boolean;
  hasPreview: boolean;
  loading: boolean;
  onLoadFileContent: (path: string) => void;
  onRefreshFiles: () => void;
  onRunCommand: (event: FormEvent<HTMLFormElement>) => void;
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
  simulatorEntries: SimulatorEntry[];
  terminalBusy: boolean;
  terminalInput: string;
  terminalText: string;
  webHtml: string;
  webUrl: string;
};

export function SandboxWorkbenchSurface(props: SandboxWorkbenchSurfaceProps) {
  const codeTabWrapClassName = "min-h-0 flex-1 overflow-hidden";
  const shouldRenderExplorer =
    props.files.length > 0 ||
    (props.selectedFile.trim().length > 0 &&
      props.selectedFileContent.trim().length > 0);

  switch (props.activeTab) {
    case "code":
      return (
        <div
          className={codeTabWrapClassName}
          data-testid="artifact-code-tab-wrap"
        >
          {shouldRenderExplorer ? (
            <div className="h-full p-[var(--artifact-padding)]">
              <WorkbenchFilesTab
                sandboxId={props.sandboxId}
                filesLoading={props.filesLoading}
                files={props.files}
                selectedFile={props.selectedFile}
                selectedFileContent={props.selectedFileContent}
                selectedFileLoading={props.selectedFileLoading}
                onRefreshFiles={props.onRefreshFiles}
                onLoadFileContent={props.onLoadFileContent}
              />
            </div>
          ) : (
            <WorkbenchCodeTab
              loading={props.loading}
              hasCode={props.hasCode}
              code={props.code}
              language={pickLanguage(
                props.selectedFile || "artifact.txt",
                "text",
              )}
            />
          )}
        </div>
      );
    case "preview":
      return (
        <WorkbenchPreviewTab
          hasPreview={props.hasPreview}
          previewUrl={props.previewUrl}
          previewHtml={props.previewHtml}
          loading={props.loading}
        />
      );
    case "contracts":
      return (
        <div
          className="min-h-0 flex-1 overflow-hidden p-[var(--artifact-padding)]"
          data-testid="artifact-contract-view"
        >
          <WorkbenchSmartContractTab
            loading={props.loading}
            contracts={props.contractFiles}
            activePath={props.selectedContractPath}
            framework={props.contractFramework}
            chain={props.contractChain}
            commands={props.contractCommands}
            onSelectPath={props.onSelectContractPath}
          />
        </div>
      );
    case "files":
      return (
        <div className="min-h-0 flex-1 overflow-hidden p-[var(--artifact-padding)]">
          <WorkbenchFilesTab
            sandboxId={props.sandboxId}
            filesLoading={props.filesLoading}
            files={props.files}
            selectedFile={props.selectedFile}
            selectedFileContent={props.selectedFileContent}
            selectedFileLoading={props.selectedFileLoading}
            onRefreshFiles={props.onRefreshFiles}
            onLoadFileContent={props.onLoadFileContent}
          />
        </div>
      );
    case "terminal":
      return (
        <div
          className="min-h-0 flex-1 overflow-hidden p-[var(--artifact-padding)]"
          data-testid="artifact-terminal-view"
        >
          <WorkbenchTerminalTab
            sandboxId={props.sandboxId}
            terminalText={props.terminalText}
            terminalBusy={props.terminalBusy}
            terminalInput={props.terminalInput}
            onTerminalInputChange={props.onTerminalInputChange}
            onRunCommand={props.onRunCommand}
          />
        </div>
      );
    case "web":
      return (
        <div
          className="min-h-0 flex-1 overflow-hidden p-[var(--artifact-padding)]"
          data-testid="artifact-web-view-wrap"
        >
          <WorkbenchWebTab
            loading={props.loading}
            webUrl={props.webUrl}
            webHtml={props.webHtml}
          />
        </div>
      );
    case "pdf":
      return (
        <div
          className="min-h-0 flex-1 overflow-hidden p-[var(--artifact-padding)]"
          data-testid="artifact-pdf-view"
        >
          <WorkbenchPdfTab
            loading={props.loading}
            pdfUrl={props.pdfUrl}
            pdfBase64={props.pdfBase64}
            fileName={props.pdfFileName}
          />
        </div>
      );
    case "simulator":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-[var(--artifact-padding)]">
          <WorkbenchSimulatorTab entries={props.simulatorEntries} />
        </div>
      );
    case "polymarket":
      return (
        <div className="min-h-0 flex-1 overflow-y-auto p-[var(--artifact-padding)]">
          <WorkbenchPolymarketTab />
        </div>
      );
    default:
      return null;
  }
}
