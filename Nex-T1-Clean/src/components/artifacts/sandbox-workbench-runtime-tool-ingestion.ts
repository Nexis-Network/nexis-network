import {
  asRecord,
  coerceString,
  normalizeFiles,
  normalizeTerminalResult,
} from "@/components/artifacts/sandbox-workbench-utils";
import {
  POLYMARKET_TOOL_NAMES,
  setContractStateFromFile,
  type SandboxWorkbenchToolBindings,
} from "./sandbox-workbench-ingestion.shared";

export function ingestRuntimeTool(args: {
  bindings: SandboxWorkbenchToolBindings;
  nestedResult: Record<string, UntypedJson>;
  result: Record<string, UntypedJson>;
  toolArgs: Record<string, UntypedJson>;
  toolName: string;
}) {
  const { bindings, nestedResult, result, toolArgs, toolName } = args;

  if (toolName === "e2b_code_interpreter" || toolName === "openai_code_interpreter") {
    const nextCode = coerceString(toolArgs.code) ?? "";
    const resolvedLanguage = coerceString(toolArgs.language) ?? "python";
    const firstResult = Array.isArray(result.results)
      ? asRecord(result.results[0])
      : Array.isArray(nestedResult.results)
        ? asRecord(nestedResult.results[0])
        : {};
    const output = normalizeTerminalResult(result);

    if (nextCode) bindings.setCode(nextCode);
    if (output) bindings.appendTerminal(output);
    if (coerceString(firstResult.html)) {
      bindings.setPreviewHtml(coerceString(firstResult.html) ?? "");
      bindings.setActiveTab("preview");
    }
    if (coerceString(firstResult.pdf)) {
      bindings.setPdfBase64(coerceString(firstResult.pdf) ?? "");
      bindings.setPdfFileName("interpreter-output.pdf");
      bindings.setActiveTab("pdf");
    }
    if (resolvedLanguage === "solidity" || resolvedLanguage === "rust") {
      bindings.upsertContractFile({
        path: `snippet.${resolvedLanguage === "solidity" ? "sol" : "rs"}`,
        content: nextCode,
        language: resolvedLanguage,
      });
      bindings.setContractChain(resolvedLanguage === "solidity" ? "evm" : "solana");
      bindings.setActiveTab("contracts");
    } else {
      bindings.setActiveTab("code");
    }
    bindings.appendSimulatorEntry({
      label: "Code Execution",
      status: coerceString(result.error) ? "failed" : "completed",
      details: coerceString(result.error) ?? "Interpreter result received",
    });
    return;
  }

  if (toolName === "e2b_get_preview_url") {
    const nextUrl =
      coerceString(result.url) ??
      coerceString(result.previewUrl) ??
      coerceString(nestedResult.url) ??
      coerceString(nestedResult.previewUrl);
    if (nextUrl) {
      bindings.setPreviewUrl(nextUrl);
      bindings.setWebUrl(nextUrl);
      bindings.setActiveTab("web");
    }
    return;
  }

  if (toolName === "e2b_write_file") {
    const path =
      coerceString(toolArgs.path) ??
      coerceString(result.path) ??
      coerceString(nestedResult.path);
    const content =
      coerceString(toolArgs.content) ??
      coerceString(result.content) ??
      coerceString(nestedResult.content);
    if (path) bindings.setSelectedFile(path);
    if (content !== null) {
      bindings.setSelectedFileContent(content);
      bindings.setCode(content);
      if (
        !path ||
        !setContractStateFromFile({
          content,
          path,
          setActiveTab: bindings.setActiveTab,
          setContractChain: bindings.setContractChain,
          upsertContractFile: bindings.upsertContractFile,
        })
      ) {
        bindings.setActiveTab("code");
      }
    } else {
      bindings.setActiveTab("files");
    }
    if (bindings.sandboxId) void bindings.refreshFiles();
    return;
  }

  if (toolName === "e2b_list_dir") {
    const nextFiles = normalizeFiles(result.files ?? nestedResult.files ?? []);
    if (nextFiles.length > 0) {
      bindings.setFiles(nextFiles);
      bindings.setActiveTab("files");
    }
    return;
  }

  if (toolName === "e2b_read_file") {
    const path = coerceString(toolArgs.path);
    const content =
      coerceString(result.content) ?? coerceString(nestedResult.content);
    if (path) bindings.setSelectedFile(path);
    if (content !== null) {
      bindings.setSelectedFileContent(content);
      bindings.setCode(content);
      if (
        path &&
        setContractStateFromFile({
          content,
          path,
          setActiveTab: bindings.setActiveTab,
          setContractChain: bindings.setContractChain,
          upsertContractFile: bindings.upsertContractFile,
        })
      ) {
        return;
      }
    }
    return;
  }

  if (toolName === "e2b_npm_run" || toolName === "e2b_npm_install") {
    const output = normalizeTerminalResult(result);
    if (output) {
      bindings.appendTerminal(output);
      bindings.setActiveTab("terminal");
    }
    return;
  }

  if (POLYMARKET_TOOL_NAMES.has(toolName)) {
    bindings.setHasPolymarket(true);
    bindings.appendSimulatorEntry({
      label: `Polymarket: ${toolName}`,
      status: coerceString(result.error) ? "failed" : "completed",
      details: coerceString(result.error) ?? "Widget data updated",
    });
    bindings.setActiveTab("polymarket");
    return;
  }

  if (
    toolName.includes("simulate") ||
    toolName.includes("transaction") ||
    toolName.includes("workflow") ||
    toolName.includes("swap")
  ) {
    bindings.appendSimulatorEntry({
      label: toolName,
      status: coerceString(result.error) ? "failed" : "completed",
      details:
        coerceString(result.error) ?? normalizeTerminalResult(result).slice(0, 300),
    });
    bindings.setActiveTab("simulator");
  }
}
