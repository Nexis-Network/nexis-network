import type { SmartContractFile } from "@/components/artifacts/workbench/workbench-smart-contract-tab";

export type SandboxFile = {
  path: string;
  name: string;
  kind: "file" | "dir";
};

export type SimulatorEntry = {
  id: string;
  label: string;
  status?: string;
  details?: string;
  createdAt: number;
};

export type StructuredArtifactResult = {
  artifactType: string;
  payload: Record<string, UntypedJson>;
};

export type InlineArtifactFile = {
  path: string;
  content: string;
  language: string;
};

export const asRecord = (value: UntypedJson): Record<string, UntypedJson> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, UntypedJson>;
  }
  return {};
};

export const coerceString = (value: UntypedJson): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const pickLanguage = (path: string, fallback = "tsx") => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "sol":
      return "solidity";
    case "rs":
      return "rust";
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "py":
      return "python";
    case "json":
      return "json";
    case "sh":
    case "bash":
      return "bash";
    case "md":
      return "markdown";
    default:
      return fallback;
  }
};

export const normalizeFiles = (value: UntypedJson): SandboxFile[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const record = asRecord(entry);
      const path =
        coerceString(record.path) ??
        coerceString(record.name) ??
        coerceString(record.fileName) ??
        "";
      if (!path) return null;
      const name = path.split("/").pop() ?? path;
      const kindHint =
        coerceString(record.type) ??
        coerceString(record.kind) ??
        (record.isDir === true ? "dir" : "file");
      const kind = kindHint === "dir" || kindHint === "directory" ? "dir" : "file";

      return {
        path,
        name,
        kind,
      } satisfies SandboxFile;
    })
    .filter((entry): entry is SandboxFile => entry !== null)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
};

export const normalizeTerminalResult = (value: UntypedJson): string => {
  if (!value) return "";
  if (typeof value === "string") return value;

  const record = asRecord(value);
  const stdout = coerceString(record.stdout) ?? "";
  const stderr = coerceString(record.stderr) ?? "";
  const logs = coerceString(record.logs) ?? "";

  const chunks = [stdout, stderr, logs].filter(Boolean);
  if (chunks.length > 0) {
    return chunks.join("\n");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const extractSandboxId = (
  args: Record<string, UntypedJson>,
  result: Record<string, UntypedJson>,
): string | null => {
  return (
    coerceString(result.sandboxID) ??
    coerceString(result.sandboxId) ??
    coerceString(args.sandboxID) ??
    coerceString(args.sandboxId)
  );
};

export const parseApiPayload = <T,>(payload: UntypedJson): T | null => {
  const root = asRecord(payload);
  if ("data" in root) {
    return root.data as T;
  }
  return payload as T;
};

export const parseSsePayload = (rawEvent: string): Record<string, UntypedJson> | null => {
  if (!rawEvent.trim()) return null;

  const dataLines = rawEvent
    .split("\n")
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (!dataLines.length) return null;
  const payload = dataLines.join("\n").trim();
  if (!payload || payload === "[DONE]") return null;

  try {
    const parsed = JSON.parse(payload) as UntypedJson;
    return asRecord(parsed);
  } catch {
    return null;
  }
};

export const simulatorId = () =>
  `sim-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(16)}`;

export function parseStructuredArtifactResult(
  result: Record<string, UntypedJson>,
): StructuredArtifactResult | null {
  const candidates: Record<string, UntypedJson>[] = [];
  const visited = new Set<Record<string, UntypedJson>>();

  const enqueue = (value: unknown) => {
    const record = asRecord(value as UntypedJson);
    if (!record || visited.has(record)) {
      return;
    }

    visited.add(record);
    candidates.push(record);
  };

  const extractNestedArtifactData = (value: unknown) => {
    const record = asRecord(value as UntypedJson);
    const parts = Array.isArray(record?.parts) ? record.parts : [];

    for (const part of parts) {
      const typedPart = asRecord(part);
      const type = coerceString(typedPart?.type) ?? "";
      if (!type.startsWith("data-artifact-")) {
        continue;
      }

      const nestedArtifact =
        asRecord(typedPart?.data) ??
        asRecord(typedPart?.output) ??
        asRecord(typedPart?.result);
      if (nestedArtifact) {
        return nestedArtifact;
      }
    }

    return null;
  };

  enqueue(result);

  while (candidates.length > 0) {
    const artifactCandidate = candidates.shift();
    if (!artifactCandidate) {
      continue;
    }

    enqueue(artifactCandidate.artifact);
    enqueue(artifactCandidate.result);
    enqueue(artifactCandidate.output);
    enqueue(extractNestedArtifactData(artifactCandidate));

    const artifactType =
      coerceString(artifactCandidate.artifactType) ??
      coerceString(artifactCandidate.type);

    if (!artifactType) {
      continue;
    }

    const payload =
      asRecord(artifactCandidate.payload) ??
      asRecord(artifactCandidate.data) ??
      asRecord(artifactCandidate.content) ??
      artifactCandidate;

    return {
      artifactType,
      payload,
    };
  }

  return null;
}

export function parseContractFiles(
  payload: Record<string, UntypedJson>,
): SmartContractFile[] {
  const filesFromArray = (Array.isArray(payload.files) ? payload.files : [])
    .map((entry) => {
      const record = asRecord(entry);
      const path = coerceString(record.path) ?? coerceString(record.name) ?? "";
      if (!path) return null;
      const content = coerceString(record.content) ?? "";
      const language = coerceString(record.language) ?? pickLanguage(path);
      return { path, content, language } satisfies SmartContractFile;
    })
    .filter((entry): entry is SmartContractFile => entry !== null);

  if (filesFromArray.length > 0) {
    return filesFromArray;
  }

  const fallbackCode =
    coerceString(payload.code) ??
    coerceString(payload.content) ??
    coerceString(payload.source);

  if (!fallbackCode) {
    return [];
  }

  const chain = coerceString(payload.chain)?.toLowerCase() ?? "";
  const defaultPath = chain.includes("solana") ? "program.rs" : "Contract.sol";
  const path = coerceString(payload.fileName) ?? defaultPath;

  return [
    {
      path,
      content: fallbackCode,
      language: pickLanguage(path),
    },
  ];
}

function inferInlineArtifactPath(args: {
  artifactType: string;
  payload: Record<string, UntypedJson>;
  content: string;
}): string {
  const explicitPath =
    coerceString(args.payload.path) ??
    coerceString(args.payload.fileName) ??
    coerceString(args.payload.entryFile) ??
    coerceString(args.payload.filename) ??
    coerceString(args.payload.name);

  if (explicitPath) {
    return explicitPath;
  }

  const language = coerceString(args.payload.language)?.toLowerCase() ?? "";

  if (args.artifactType === "html") return "index.html";
  if (
    args.artifactType === "canvas" &&
    (language === "mermaid" ||
      coerceString(args.payload.type)?.toLowerCase() === "mermaid")
  ) {
    return "diagram.mmd";
  }
  if (language === "solidity") return "contracts/Artifact.sol";
  if (language === "rust") return "src/lib.rs";
  if (language === "typescript") return "src/artifact.ts";
  if (language === "tsx") return "src/artifact.tsx";
  if (language === "javascript") return "src/artifact.js";
  if (language === "jsx") return "src/artifact.jsx";
  if (language === "python") return "artifact.py";
  if (language === "json") return "artifact.json";
  if (language === "markdown") return "artifact.md";
  if (/^\s*<!doctype html>|^\s*<html/i.test(args.content)) return "index.html";
  if (/pragma\s+solidity/i.test(args.content)) return "contracts/Artifact.sol";
  if (/^\s*def\s+\w+\(/m.test(args.content)) return "artifact.py";
  if (
    /^\s*(export\s+)?(default\s+)?function|^\s*(import|export)\s/m.test(
      args.content,
    )
  ) {
    return "src/artifact.ts";
  }

  return "artifact.txt";
}

export function parseInlineArtifactFiles(
  artifactType: string,
  payload: Record<string, UntypedJson>,
): InlineArtifactFile[] {
  const filesFromArray = (Array.isArray(payload.files) ? payload.files : [])
    .map((entry) => {
      const record = asRecord(entry);
      const path =
        coerceString(record.path) ??
        coerceString(record.fileName) ??
        coerceString(record.name) ??
        "";
      const content =
        coerceString(record.content) ??
        coerceString(record.code) ??
        coerceString(record.source) ??
        coerceString(record.html) ??
        "";

      if (!path || !content) return null;

      return {
        path,
        content,
        language: coerceString(record.language) ?? pickLanguage(path),
      } satisfies InlineArtifactFile;
    })
    .filter((entry): entry is InlineArtifactFile => entry !== null);

  if (filesFromArray.length > 0) {
    return filesFromArray;
  }

  const content =
    coerceString(payload.code) ??
    coerceString(payload.content) ??
    coerceString(payload.source) ??
    (artifactType === "html" ? coerceString(payload.html) : null);

  if (!content) {
    return [];
  }

  const path = inferInlineArtifactPath({
    artifactType,
    payload,
    content,
  });

  return [
    {
      path,
      content,
      language: coerceString(payload.language) ?? pickLanguage(path),
    },
  ];
}
