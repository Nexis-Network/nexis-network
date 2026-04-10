import type {
  NativeIdeFile,
  NativeIdeSessionData,
  NativeTaskData,
  NativeWorkflowNode,
  UnknownRecord,
} from "./types";

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object";
}

export function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function coerceString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function pickLanguage(path: string, fallback = "text"): string {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "sol":
      return "solidity";
    case "rs":
      return "rust";
    case "py":
      return "python";
    case "sh":
      return "bash";
    default:
      return fallback;
  }
}

export function normalizeTaskStatus(value: unknown): NativeTaskData["status"] {
  const normalized = coerceString(value)?.toLowerCase();
  if (normalized === "in_progress" || normalized === "running") {
    return "in_progress";
  }
  if (normalized === "done" || normalized === "completed" || normalized === "complete") {
    return "done";
  }
  if (normalized === "error" || normalized === "failed") {
    return "error";
  }
  return "pending";
}

export function humanizeWorkflowStepName(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeWorkflowStatus(
  value: unknown,
): NonNullable<NativeWorkflowNode["status"]> {
  const normalized = coerceString(value)?.toLowerCase();
  if (normalized === "running" || normalized === "in_progress") return "running";
  if (normalized === "completed" || normalized === "complete") return "completed";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "done") return "done";
  return "pending";
}

export function appendTerminalOutput(previous: string, next: string): string {
  if (!next) return previous;
  if (!previous) return next;
  if (previous.includes(next)) return previous;
  return `${previous}\n${next}`;
}

export function upsertIdeFile(
  files: NativeIdeFile[],
  file: NativeIdeFile,
): NativeIdeFile[] {
  const nextFiles = [...files];
  const index = nextFiles.findIndex((entry) => entry.path === file.path);

  if (index === -1) {
    nextFiles.push(file);
    return nextFiles;
  }

  nextFiles[index] = {
    ...nextFiles[index],
    ...file,
  };
  return nextFiles;
}

export function createDefaultIdeSession(): NativeIdeSessionData {
  return {
    files: [],
    plan: [],
    checkpoints: [],
  };
}

export function hasRenderableIdeSessionSurface(
  session: NativeIdeSessionData | null | undefined,
): session is NativeIdeSessionData {
  if (!session) {
    return false;
  }

  return Boolean(
    session.files.length > 0 ||
      session.terminal ||
      session.previewUrl ||
      session.previewHtml ||
      session.jsxPreview ||
      session.testResults,
  );
}
