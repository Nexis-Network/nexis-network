"use client";

import { useCallback, useEffect, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { workbenchShellClass } from "@/components/artifacts/workbench/workbench-ui";
import type { WorkbenchTab } from "@/components/artifacts/sandbox-workbench-surface";
import { SandboxWorkbenchChromeBody } from "./sandbox-workbench-chrome-body";
import { SandboxWorkbenchChromeHeader, SandboxWorkbenchChromeMetaBar, SandboxWorkbenchChromeStatusBar } from "./sandbox-workbench-chrome-bars";
import { inferWorkbenchCodeFileName, WORKBENCH_TAB_LABELS, WORKBENCH_TAB_ORDER } from "./sandbox-workbench-chrome.utils";

type SandboxWorkbenchChromeProps = {
  activeTab: WorkbenchTab;
  contractChain: string | null;
  contractCommands: string[];
  contractFiles: Array<{ path: string; content: string; language: string }>;
  contractFramework: string | null;
  effectiveCode: string;
  error: string | null;
  files: Array<{ path: string; name: string; kind: "file" | "dir" }>;
  filesLoading: boolean;
  hasAnyArtifactData: boolean;
  hasCode: boolean;
  hasPreview: boolean;
  hasTerminal: boolean;
  loading: boolean;
  onCollapsePanel?: () => void;
  onLoadFileContent: (path: string) => void;
  onRefreshFiles: () => void;
  onRunCommand: (event: FormEvent<HTMLFormElement>) => void;
  onSelectContractPath: (path: string) => void;
  onSetActiveTab: (tab: WorkbenchTab) => void;
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

export function SandboxWorkbenchChrome(props: SandboxWorkbenchChromeProps) {
  const { activeTab, onSetActiveTab } = props;
  const hasWeb =
    props.webUrl.trim().length > 0 || props.webHtml.trim().length > 0;
  const hasPdf =
    props.pdfUrl.trim().length > 0 || props.pdfBase64.trim().length > 0;
  const hasContracts = props.contractFiles.length > 0;
  const hasFiles = props.files.length > 0;
  const hasSimulator = props.simulatorEntries.length > 0;

  const viewTabEnabled: Record<WorkbenchTab, boolean> = {
    code: props.hasCode || props.loading || activeTab === "code",
    preview: props.hasPreview || props.loading || activeTab === "preview",
    files: hasFiles || props.filesLoading || activeTab === "files",
    terminal: props.hasTerminal || activeTab === "terminal",
    contracts: hasContracts || activeTab === "contracts",
    web: hasWeb || activeTab === "web",
    pdf: hasPdf || activeTab === "pdf",
    simulator: hasSimulator || activeTab === "simulator",
    polymarket: activeTab === "polymarket",
  };
  const visibleTabs = WORKBENCH_TAB_ORDER.filter(
    (tab) =>
      viewTabEnabled[tab] ||
      (!props.hasAnyArtifactData && (tab === "code" || tab === "preview")),
  );
  const statusLabel = props.loading
    ? "Running"
    : props.error
      ? "Error"
      : props.hasAnyArtifactData
        ? "Ready"
        : "Idle";

  const inferredCodeFileName = inferWorkbenchCodeFileName({
    contractFiles: props.contractFiles,
    effectiveCode: props.effectiveCode,
    selectedContractPath: props.selectedContractPath,
    selectedFile: props.selectedFile,
  });

  const metaTitle =
    props.activeTab === "preview"
      ? props.previewUrl || "Live Preview"
      : props.activeTab === "code"
        ? props.selectedFile || inferredCodeFileName
        : WORKBENCH_TAB_LABELS[props.activeTab];
  const copySource =
    props.activeTab === "code"
      ? props.selectedFileContent || props.effectiveCode
      : props.activeTab === "terminal"
        ? props.terminalText
        : props.activeTab === "preview"
          ? props.previewUrl || props.previewHtml
          : "";
  const canCopy = Boolean(copySource?.trim());
  const canDownload = Boolean(
    (props.activeTab === "code" &&
      Boolean(props.selectedFileContent || props.hasCode || hasFiles)) ||
    (props.activeTab === "preview" && props.hasPreview) ||
    (props.activeTab === "terminal" && props.hasTerminal),
  );

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (visibleTabs.includes(activeTab)) return;
    onSetActiveTab(visibleTabs[0]);
  }, [activeTab, onSetActiveTab, visibleTabs]);

  const handleCopyCurrentView = useCallback(async () => {
    if (!canCopy || !copySource) return;
    try {
      await navigator.clipboard.writeText(copySource);
    } catch {
      // clipboard may be unavailable in restricted contexts
    }
  }, [canCopy, copySource]);

  const handleDownloadCurrentView = useCallback(() => {
    if (!canDownload) return;

    let fileName = props.selectedFile || inferredCodeFileName;
    let content = props.selectedFileContent || props.effectiveCode;
    let mimeType = "text/plain;charset=utf-8";

    if (props.activeTab === "preview") {
      fileName = props.previewUrl ? "preview.url" : "preview.html";
      content = props.previewUrl || props.previewHtml;
      mimeType = props.previewUrl
        ? "text/plain;charset=utf-8"
        : "text/html;charset=utf-8";
    } else if (props.activeTab === "terminal") {
      fileName = "terminal.log";
      content = props.terminalText;
      mimeType = "text/plain;charset=utf-8";
    }

    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  }, [
    canDownload,
    inferredCodeFileName,
    props.activeTab,
    props.effectiveCode,
    props.previewHtml,
    props.previewUrl,
    props.selectedFile,
    props.selectedFileContent,
    props.terminalText,
  ]);

  return (
    <div
      data-testid="artifact-panel"
      className={cn(
        workbenchShellClass,
        "flex h-full min-h-0 flex-col overflow-hidden",
      )}
    >
      <SandboxWorkbenchChromeHeader
        activeTab={props.activeTab}
        onCollapsePanel={props.onCollapsePanel}
        onSetActiveTab={props.onSetActiveTab}
        viewTabEnabled={viewTabEnabled}
        visibleTabs={visibleTabs}
      />
      <SandboxWorkbenchChromeMetaBar
        activeTab={props.activeTab}
        canCopy={canCopy}
        canDownload={canDownload}
        metaTitle={metaTitle}
        previewUrl={props.previewUrl}
        onCopy={() => void handleCopyCurrentView()}
        onDownload={handleDownloadCurrentView}
      />
      <SandboxWorkbenchChromeBody
        activeTab={props.activeTab}
        code={props.effectiveCode}
        contractChain={props.contractChain}
        contractCommands={props.contractCommands}
        contractFiles={props.contractFiles}
        contractFramework={props.contractFramework}
        error={props.error}
        files={props.files}
        filesLoading={props.filesLoading}
        hasAnyArtifactData={props.hasAnyArtifactData}
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
      <SandboxWorkbenchChromeStatusBar
        activeTab={props.activeTab}
        fileCount={props.files.length}
        hasFiles={hasFiles}
        sandboxId={props.sandboxId}
        statusLabel={statusLabel}
      />
    </div>
  );
}
