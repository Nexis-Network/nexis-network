"use client";

import { useCallback } from "react";
import {
  coerceString,
  normalizeFiles,
  parseApiPayload,
} from "@/components/artifacts/sandbox-workbench-utils";
import {
  assertSandboxJsonResponse,
  type SandboxWorkbenchFileBindings,
  syncContractFile,
} from "@/components/artifacts/sandbox-workbench-file-utils";

export function useSandboxWorkbenchFiles({
  inlineFiles,
  sandboxId,
  selectedFile,
  setActiveTab,
  setCode,
  setContractChain,
  setError,
  setFiles,
  setFilesLoading,
  setSelectedFile,
  setSelectedFileContent,
  setSelectedFileLoading,
  upsertContractFile,
}: SandboxWorkbenchFileBindings) {
  const refreshFiles = useCallback(async () => {
    if (!sandboxId) {
      const nextFiles = normalizeFiles(
        Object.values(inlineFiles).map((file) => ({
          path: file.path,
          kind: "file",
        })),
      );
      if (nextFiles.length === 0) return;
      setFiles(nextFiles);
      if (!selectedFile) {
        const firstFile = nextFiles.find((file) => file.kind === "file");
        if (firstFile) setSelectedFile(firstFile.path);
      }
      return;
    }

    setFilesLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sandbox/files?mode=list&sandboxId=${encodeURIComponent(sandboxId)}&path=${encodeURIComponent(".")}`,
        { cache: "no-store" },
      );
      const payload = await assertSandboxJsonResponse(
        response,
        "Failed to load files",
      );
      const data = parseApiPayload<{ files?: UntypedJson }>(payload);
      const nextFiles = normalizeFiles(data?.files ?? []);
      setFiles(nextFiles);
      if (!selectedFile) {
        const firstFile = nextFiles.find((file) => file.kind === "file");
        if (firstFile) setSelectedFile(firstFile.path);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setFilesLoading(false);
    }
  }, [
    inlineFiles,
    sandboxId,
    selectedFile,
    setError,
    setFiles,
    setFilesLoading,
    setSelectedFile,
  ]);

  const loadFileContent = useCallback(
    async (path: string) => {
      if (!path) return;
      setSelectedFile(path);

      const inlineFile = inlineFiles[path];
      if (inlineFile) {
        setSelectedFileContent(inlineFile.content);
        setCode(inlineFile.content);
        syncContractFile({
          path,
          content: inlineFile.content,
          setContractChain,
          setActiveTab: () => setActiveTab("contracts"),
          upsertContractFile,
        });
        return;
      }

      if (!sandboxId) return;

      setSelectedFileLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sandbox/files?mode=read&sandboxId=${encodeURIComponent(sandboxId)}&path=${encodeURIComponent(path)}`,
          { cache: "no-store" },
        );
        const payload = await assertSandboxJsonResponse(
          response,
          "Failed to load file",
        );
        const data = parseApiPayload<{ content?: UntypedJson }>(payload);
        const content = coerceString(data?.content) ?? "";
        setSelectedFileContent(content);
        setCode(content);
        syncContractFile({
          path,
          content,
          setContractChain,
          setActiveTab: () => setActiveTab("contracts"),
          upsertContractFile,
        });
      } catch (error) {
        setSelectedFileContent("");
        setError((error as Error).message);
      } finally {
        setSelectedFileLoading(false);
      }
    },
    [
      inlineFiles,
      sandboxId,
      setActiveTab,
      setCode,
      setContractChain,
      setError,
      setSelectedFile,
      setSelectedFileContent,
      setSelectedFileLoading,
      upsertContractFile,
    ],
  );

  return {
    loadFileContent,
    refreshFiles,
  };
}
