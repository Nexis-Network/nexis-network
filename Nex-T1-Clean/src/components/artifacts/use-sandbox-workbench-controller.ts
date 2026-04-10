"use client";

import { useEffect } from "react";
import type { AIEvent } from "@/lib/schema";
import { useSandboxWorkbenchArtifactState } from "../../hooks/artifacts/use-sandbox-workbench-artifact-state";
import { useSandboxWorkbenchContractSimulator } from "../../hooks/artifacts/use-sandbox-workbench-contract-simulator";
import { useSandboxWorkbenchEventIngestion } from "../../hooks/artifacts/use-sandbox-workbench-event-ingestion";
import { useSandboxWorkbenchFiles } from "../../hooks/artifacts/use-sandbox-workbench-files";
import { useSandboxWorkbenchTerminal } from "../../hooks/artifacts/use-sandbox-workbench-terminal";
import { useSandboxWorkbenchToolIngestion } from "../../hooks/artifacts/use-sandbox-workbench-tool-ingestion";

export function useSandboxWorkbenchController(options: {
  activeTool?: UntypedJson | null;
  activeEvent?: AIEvent | null;
}) {
  const artifact = useSandboxWorkbenchArtifactState();
  const contractSimulator = useSandboxWorkbenchContractSimulator();
  const terminal = useSandboxWorkbenchTerminal({
    sandboxId: artifact.sandboxId,
    setError: artifact.setError,
    appendSimulatorEntry: contractSimulator.appendSimulatorEntry,
  });
  const files = useSandboxWorkbenchFiles({
    inlineFiles: artifact.inlineFiles,
    sandboxId: artifact.sandboxId,
    selectedFile: artifact.selectedFile,
    setActiveTab: artifact.setActiveTab,
    setCode: artifact.setCode,
    setContractChain: contractSimulator.setContractChain,
    setError: artifact.setError,
    setFiles: artifact.setFiles,
    setFilesLoading: artifact.setFilesLoading,
    setSelectedFile: artifact.setSelectedFile,
    setSelectedFileContent: artifact.setSelectedFileContent,
    setSelectedFileLoading: artifact.setSelectedFileLoading,
    upsertContractFile: contractSimulator.upsertContractFile,
  });
  const { loadFileContent, refreshFiles } = files;
  const hasRichArtifactData =
    artifact.hasCode ||
    artifact.hasPreview ||
    contractSimulator.hasContracts ||
    artifact.hasFiles ||
    artifact.hasWeb ||
    artifact.hasPdf;

  useSandboxWorkbenchToolIngestion({
    activeTool: options.activeTool,
    appendSimulatorEntry: contractSimulator.appendSimulatorEntry,
    appendTerminal: terminal.appendTerminal,
    refreshFiles,
    sandboxId: artifact.sandboxId,
    selectedFile: artifact.selectedFile,
    setActiveTab: artifact.setActiveTab,
    setCode: artifact.setCode,
    setContractChain: contractSimulator.setContractChain,
    setContractCommands: contractSimulator.setContractCommands,
    setContractFiles: contractSimulator.setContractFiles,
    setContractFramework: contractSimulator.setContractFramework,
    setFiles: artifact.setFiles,
    setHasPolymarket: artifact.setHasPolymarket,
    setInlineFiles: artifact.setInlineFiles,
    setPdfBase64: artifact.setPdfBase64,
    setPdfFileName: artifact.setPdfFileName,
    setPdfUrl: artifact.setPdfUrl,
    setPreviewHtml: artifact.setPreviewHtml,
    setPreviewUrl: artifact.setPreviewUrl,
    setSandboxId: artifact.setSandboxId,
    setSelectedContractPath: contractSimulator.setSelectedContractPath,
    setSelectedFile: artifact.setSelectedFile,
    setSelectedFileContent: artifact.setSelectedFileContent,
    setWebHtml: artifact.setWebHtml,
    setWebUrl: artifact.setWebUrl,
    upsertContractFile: contractSimulator.upsertContractFile,
  });

  useSandboxWorkbenchEventIngestion({
    activeEvent: options.activeEvent,
    appendSimulatorEntry: contractSimulator.appendSimulatorEntry,
    appendTerminal: terminal.appendTerminal,
    hasRichArtifactData,
    setActiveTab: artifact.setActiveTab,
    setCode: artifact.setCode,
    setPreviewHtml: artifact.setPreviewHtml,
    setPreviewUrl: artifact.setPreviewUrl,
    setSandboxId: artifact.setSandboxId,
    setWebHtml: artifact.setWebHtml,
    setWebUrl: artifact.setWebUrl,
  });

  useEffect(() => {
    if (!["code", "preview", "files"].includes(artifact.activeTab)) return;
    if (!artifact.sandboxId || artifact.files.length > 0) return;
    void refreshFiles();
  }, [
    artifact.activeTab,
    artifact.files.length,
    artifact.sandboxId,
    refreshFiles,
  ]);

  useEffect(() => {
    if (!artifact.selectedFile || artifact.selectedFileContent) return;
    void loadFileContent(artifact.selectedFile);
  }, [artifact.selectedFile, artifact.selectedFileContent, loadFileContent]);

  return {
    activeTab: artifact.activeTab,
    contractChain: contractSimulator.contractChain,
    contractCommands: contractSimulator.contractCommands,
    contractFiles: contractSimulator.contractFiles,
    contractFramework: contractSimulator.contractFramework,
    effectiveCode: artifact.effectiveCode,
    error: artifact.error,
    files: artifact.files,
    filesLoading: artifact.filesLoading,
    hasAnyArtifactData:
      artifact.hasCode ||
      artifact.hasPreview ||
      contractSimulator.hasContracts ||
      artifact.hasFiles ||
      terminal.hasTerminal ||
      artifact.hasWeb ||
      artifact.hasPdf ||
      contractSimulator.hasSimulator ||
      artifact.hasPolymarket,
    hasCode: artifact.hasCode,
    hasPolymarket: artifact.hasPolymarket,
    hasPreview: artifact.hasPreview,
    hasTerminal: terminal.hasTerminal,
    loadFileContent,
    pdfBase64: artifact.pdfBase64,
    pdfFileName: artifact.pdfFileName,
    pdfUrl: artifact.pdfUrl,
    previewHtml: artifact.previewHtml,
    previewUrl: artifact.previewUrl,
    refreshFiles,
    runTerminalCommand: terminal.runTerminalCommand,
    sandboxId: artifact.sandboxId,
    selectedContractPath: contractSimulator.selectedContractPath,
    selectedFile: artifact.selectedFile,
    selectedFileContent: artifact.selectedFileContent,
    selectedFileLoading: artifact.selectedFileLoading,
    setActiveTab: artifact.setActiveTab,
    setSelectedContractPath: contractSimulator.setSelectedContractPath,
    setTerminalInput: terminal.setTerminalInput,
    simulatorEntries: contractSimulator.simulatorEntries,
    terminalBusy: terminal.terminalBusy,
    terminalInput: terminal.terminalInput,
    terminalText: terminal.terminalText,
    webHtml: artifact.webHtml,
    webUrl: artifact.webUrl,
  };
}
