"use client";

import { useState } from "react";
import type {
  InlineArtifactFile,
  SandboxFile,
} from "@/components/artifacts/sandbox-workbench-utils";
import type { WorkbenchTab } from "@/components/artifacts/sandbox-workbench.types";

export function useSandboxWorkbenchArtifactState() {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("code");
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webHtml, setWebHtml] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [hasPolymarket, setHasPolymarket] = useState(false);
  const [files, setFiles] = useState<SandboxFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [selectedFileLoading, setSelectedFileLoading] = useState(false);
  const [inlineFiles, setInlineFiles] = useState<
    Record<string, InlineArtifactFile>
  >({});
  const [error, setError] = useState<string | null>(null);

  const effectiveCode = selectedFileContent || code;
  const hasCode =
    code.trim().length > 0 || selectedFileContent.trim().length > 0;
  const hasPreview =
    previewUrl.trim().length > 0 || previewHtml.trim().length > 0;
  const hasWeb = webUrl.trim().length > 0 || webHtml.trim().length > 0;
  const hasPdf = pdfUrl.trim().length > 0 || pdfBase64.trim().length > 0;
  const hasFiles = files.length > 0;

  return {
    activeTab,
    code,
    effectiveCode,
    error,
    files,
    filesLoading,
    hasCode,
    hasFiles,
    hasPdf,
    hasPolymarket,
    hasPreview,
    hasWeb,
    inlineFiles,
    pdfBase64,
    pdfFileName,
    pdfUrl,
    previewHtml,
    previewUrl,
    sandboxId,
    selectedFile,
    selectedFileContent,
    selectedFileLoading,
    setActiveTab,
    setCode,
    setError,
    setFiles,
    setFilesLoading,
    setHasPolymarket,
    setInlineFiles,
    setPdfBase64,
    setPdfFileName,
    setPdfUrl,
    setPreviewHtml,
    setPreviewUrl,
    setSandboxId,
    setSelectedFile,
    setSelectedFileContent,
    setSelectedFileLoading,
    setWebHtml,
    setWebUrl,
    webHtml,
    webUrl,
  };
}
