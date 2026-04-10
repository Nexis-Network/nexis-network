import type { NativeIdeFile, NativeIdeSessionData, UnknownRecord } from "./types";
import {
  appendTerminalOutput,
  asRecord,
  coerceString,
  pickLanguage,
  upsertIdeFile,
} from "./utils";
import type { ToolExecutionPayloadPart } from "./tool-execution-payload";

export function mergeIdeSessionFromToolExecution(
  session: NativeIdeSessionData,
  payload: ToolExecutionPayloadPart,
): void {
  const toolName = coerceString(payload.toolName) ?? "";
  if (!toolName) return;

  const input = asRecord(payload.input);
  const output = asRecord(payload.output);
  const sandboxId = extractSandboxId(output) ?? extractSandboxId(input);

  if (sandboxId) {
    session.sandboxId = sandboxId;
  }

  const payloadStatus = coerceString(payload.status)?.toLowerCase();
  if (payloadStatus === "pending" || payloadStatus === "executing") {
    session.status = "running";
  }

  switch (toolName) {
    case "e2b_write_file":
      applyFileUpdate(session, input, output);
      return;
    case "e2b_read_file":
      applyFileRead(session, input, output);
      return;
    case "e2b_list_dir":
      applyDirectoryListing(session, output);
      return;
    case "e2b_npm_install":
    case "e2b_npm_run":
      applyTerminalExecution(session, toolName, input, output, payloadStatus);
      return;
    case "e2b_get_preview_url":
      applyPreviewUrl(session, input, output);
      return;
    default:
      return;
  }
}

function extractSandboxId(value: unknown): string | null {
  const record = asRecord(value);
  return coerceString(record.sandboxID) ?? coerceString(record.sandboxId) ?? null;
}

function applyFileUpdate(
  session: NativeIdeSessionData,
  input: UnknownRecord,
  output: UnknownRecord,
): void {
  const path = coerceString(input.path) ?? coerceString(output.path);
  const content = coerceString(input.content) ?? coerceString(output.content);
  if (!path) return;

  session.mode = session.mode ?? "code";
  session.title = session.title ?? "Artifact Workbench";
  session.files = upsertIdeFile(session.files, {
    path,
    content: content ?? undefined,
    kind: "file",
    language: pickLanguage(path),
  });
  session.activePath = session.activePath ?? path;
  session.entryFile = session.entryFile ?? path;
}

function applyFileRead(
  session: NativeIdeSessionData,
  input: UnknownRecord,
  output: UnknownRecord,
): void {
  const path = coerceString(input.path) ?? coerceString(output.path);
  if (!path) return;

  session.mode = session.mode ?? "code";
  session.title = session.title ?? "Artifact Workbench";
  session.files = upsertIdeFile(session.files, {
    path,
    content: coerceString(output.content) ?? undefined,
    kind: "file",
    language: pickLanguage(path),
  });
  session.activePath = path;
  session.entryFile = session.entryFile ?? path;
}

function applyDirectoryListing(
  session: NativeIdeSessionData,
  output: UnknownRecord,
): void {
  const listedFiles = deriveFilesFromDirectoryListing(output);
  if (listedFiles.length === 0) return;

  session.mode = session.mode ?? "code";
  session.title = session.title ?? "Artifact Workbench";
  for (const file of listedFiles) {
    session.files = upsertIdeFile(session.files, file);
  }

  const firstFile = listedFiles.find((file) => file.kind !== "dir") ?? listedFiles[0];
  session.activePath = session.activePath ?? firstFile?.path;
  session.entryFile = session.entryFile ?? firstFile?.path;
}

function applyTerminalExecution(
  session: NativeIdeSessionData,
  toolName: string,
  input: UnknownRecord,
  output: UnknownRecord,
  payloadStatus: string | undefined,
): void {
  session.mode = session.mode ?? "terminal";
  session.title = session.title ?? "Terminal Canvas";
  session.terminal = {
    command: deriveTerminalCommand(toolName, input, output) ?? session.terminal?.command,
    output: appendTerminalOutput(session.terminal?.output ?? "", deriveTerminalOutput(output)),
    isComplete: payloadStatus === "complete" || payloadStatus === "error",
  };
}

function applyPreviewUrl(
  session: NativeIdeSessionData,
  input: UnknownRecord,
  output: UnknownRecord,
): void {
  const previewUrl =
    coerceString(output.url) ??
    coerceString(output.previewUrl) ??
    coerceString(input.url) ??
    coerceString(input.previewUrl);

  if (!previewUrl) return;

  session.mode = session.mode ?? "web";
  session.title = session.title ?? "Artifact Workbench";
  session.previewUrl = previewUrl;
}

function deriveTerminalCommand(
  toolName: string,
  input: UnknownRecord,
  output: UnknownRecord,
): string | undefined {
  const explicitCommand = coerceString(output.command) ?? coerceString(input.command);
  if (explicitCommand) return explicitCommand;

  const cwd = coerceString(input.cwd);
  const prefix = cwd ? `cd '${cwd}' && ` : "";

  if (toolName === "e2b_npm_install") {
    const packages = coerceString(input.packages);
    return packages ? `${prefix}npm install ${packages}` : `${prefix}npm install`;
  }

  if (toolName === "e2b_npm_run") {
    const script = coerceString(input.script);
    return script ? `${prefix}npm run ${script}` : undefined;
  }

  return undefined;
}

function deriveTerminalOutput(output: UnknownRecord): string {
  return [
    coerceString(output.stdout),
    coerceString(output.stderr),
    coerceString(output.output),
    coerceString(output.error),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function deriveFilesFromDirectoryListing(output: UnknownRecord): NativeIdeFile[] {
  const files = Array.isArray(output.files) ? output.files : [];

  return files.reduce<NativeIdeFile[]>((acc, entry) => {
    const record = asRecord(entry);
    const path = coerceString(record.path) ?? coerceString(record.name);
    if (!path) return acc;

    const rawKind = coerceString(record.kind) ?? coerceString(record.type);
    acc.push({
      path,
      kind: rawKind === "dir" || rawKind === "directory" ? "dir" : "file",
      language: rawKind === "dir" ? undefined : pickLanguage(path),
    });
    return acc;
  }, []);
}
