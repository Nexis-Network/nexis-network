import {
  coerceString,
  normalizeFiles,
  parseContractFiles,
  parseInlineArtifactFiles,
  type StructuredArtifactResult,
} from "@/components/artifacts/sandbox-workbench-utils";
import type { SandboxWorkbenchToolBindings } from "./sandbox-workbench-ingestion.shared";

export function ingestStructuredArtifactTool(
  bindings: SandboxWorkbenchToolBindings,
  structured: StructuredArtifactResult,
) {
  const artifactType = structured.artifactType.toLowerCase();

  if (artifactType === "code" || artifactType === "html" || artifactType === "canvas") {
    const artifactFiles = parseInlineArtifactFiles(artifactType, structured.payload);
    if (artifactFiles.length > 0) {
      const inlineFileMap = Object.fromEntries(
        artifactFiles.map((file) => [file.path, file]),
      );
      const nextFiles = normalizeFiles(
        artifactFiles.map((file) => ({ path: file.path, kind: "file" })),
      );
      const defaultPath = artifactFiles[0]?.path ?? "";
      const nextPath =
        (bindings.selectedFile && inlineFileMap[bindings.selectedFile]
          ? bindings.selectedFile
          : defaultPath) || defaultPath;
      const selectedArtifact = inlineFileMap[nextPath] ?? artifactFiles[0];

      bindings.setInlineFiles(inlineFileMap);
      bindings.setFiles(nextFiles);
      bindings.setSelectedFile(nextPath);
      if (selectedArtifact) {
        bindings.setSelectedFileContent(selectedArtifact.content);
        bindings.setCode(selectedArtifact.content);
      }
    }

    if (artifactType === "html") {
      bindings.setPreviewHtml(
        coerceString(structured.payload.html) ??
          coerceString(structured.payload.code) ??
          coerceString(structured.payload.content) ??
          "",
      );
      bindings.setPreviewUrl(coerceString(structured.payload.url) ?? "");
      bindings.setActiveTab(
        coerceString(structured.payload.html) || coerceString(structured.payload.url)
          ? "preview"
          : "code",
      );
    } else {
      bindings.setActiveTab("code");
    }
  }

  if (artifactType === "pdf-viewer") {
    bindings.setPdfUrl(coerceString(structured.payload.url) ?? "");
    bindings.setPdfBase64(coerceString(structured.payload.base64) ?? "");
    bindings.setPdfFileName(coerceString(structured.payload.fileName));
    bindings.setActiveTab("pdf");
    return;
  }

  if (artifactType === "smart-contract-viewer") {
    const files = parseContractFiles(structured.payload);
    if (files.length > 0) {
      bindings.setContractFiles(files);
      bindings.setSelectedContractPath(files[0].path);
      bindings.setActiveTab("contracts");
    }
    bindings.setContractFramework(coerceString(structured.payload.framework));
    bindings.setContractChain(coerceString(structured.payload.chain));
    bindings.setContractCommands(
      Array.isArray(structured.payload.commands)
        ? structured.payload.commands
            .map((value) => coerceString(value))
            .filter((value): value is string => Boolean(value))
        : [],
    );
    return;
  }

  if (artifactType === "web") {
    bindings.setWebUrl(coerceString(structured.payload.url) ?? "");
    bindings.setWebHtml(coerceString(structured.payload.html) ?? "");
    bindings.setActiveTab("web");
    return;
  }

  if (artifactType === "preview") {
    bindings.setPreviewUrl(coerceString(structured.payload.url) ?? "");
    bindings.setPreviewHtml(coerceString(structured.payload.html) ?? "");
    bindings.setActiveTab("preview");
    return;
  }

  if (artifactType === "transaction-flow") {
    bindings.appendSimulatorEntry({
      label: coerceString(structured.payload.title) ?? "Transaction Flow",
      status: coerceString(structured.payload.status) ?? "running",
      details: coerceString(structured.payload.network) ?? "",
    });
    bindings.setActiveTab("simulator");
    return;
  }

  if (
    artifactType === "polymarket-widget" ||
    artifactType.startsWith("polymarket-")
  ) {
    bindings.setHasPolymarket(true);
    bindings.setActiveTab("polymarket");
  }
}
