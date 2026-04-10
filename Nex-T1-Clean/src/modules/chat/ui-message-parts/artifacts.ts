import {
  CANONICAL_ARTIFACT_CARD_TYPES,
  CANONICAL_IDE_ARTIFACT_TYPES,
} from "./constants";
import type {
  CanonicalArtifactCardType,
  CanonicalIdeArtifactType,
  NativeArtifactCardData,
  NativeIdeFile,
  UnknownRecord,
} from "./types";
import { asRecord, coerceString, pickLanguage } from "./utils";

export function parseArtifactEnvelope(
  raw: unknown,
  fallbackType?: string,
): NativeArtifactCardData | null {
  const record = asRecord(raw);
  const artifactId =
    coerceString(record.id) ??
    coerceString(record.identifier) ??
    `artifact-${Math.random().toString(36).slice(2, 10)}`;
  const artifactType =
    coerceString(record.type) ??
    coerceString(record.artifactType) ??
    fallbackType ??
    "artifact";
  const data = (
    "payload" in record ? record.payload : "data" in record ? record.data : raw
  ) as NativeArtifactCardData["data"];

  return {
    artifactId,
    artifactType,
    title: coerceString(record.title) ?? undefined,
    status: coerceString(record.status) ?? undefined,
    data,
    updatedAt: coerceString(record.updatedAt) ?? undefined,
  };
}

export function parseInlineArtifactFiles(
  artifactType: string,
  rawPayload: unknown,
): NativeIdeFile[] {
  const payload = asRecord(rawPayload);
  const files = Array.isArray(payload.files) ? payload.files : [];
  const normalizedFiles = files
    .map((entry) => normalizeInlineArtifactFile(entry, artifactType))
    .filter((file): file is NativeIdeFile => file !== null);

  if (normalizedFiles.length > 0) {
    return normalizedFiles;
  }

  const singleContent =
    coerceString(payload.code) ??
    coerceString(payload.content) ??
    coerceString(payload.source) ??
    (artifactType === "html" ? coerceString(payload.html) : null);

  if (!singleContent) {
    return [];
  }

  const inferredPath =
    coerceString(payload.path) ??
    coerceString(payload.fileName) ??
    coerceString(payload.entryFile) ??
    inferArtifactEntryPath(artifactType);

  return [
    {
      path: inferredPath,
      content: singleContent,
      language: coerceString(payload.language) ?? pickLanguage(inferredPath),
      kind: "file",
    },
  ];
}

function normalizeInlineArtifactFile(
  value: unknown,
  artifactType: string,
): NativeIdeFile | null {
  const fileRecord = asRecord(value);
  const path =
    coerceString(fileRecord.path) ??
    coerceString(fileRecord.fileName) ??
    coerceString(fileRecord.name);

  if (!path) {
    return null;
  }

  const content =
    coerceString(fileRecord.content) ??
    coerceString(fileRecord.code) ??
    coerceString(fileRecord.source) ??
    (artifactType === "html" ? coerceString(fileRecord.html) : null) ??
    undefined;

  return {
    path,
    content,
    language: coerceString(fileRecord.language) ?? pickLanguage(path),
    kind: "file",
  };
}

function inferArtifactEntryPath(artifactType: string): string {
  if (artifactType === "html") return "index.html";
  if (artifactType === "canvas") return "diagram.mmd";
  if (artifactType === "smart-contract-viewer") {
    return "contracts/Artifact.sol";
  }
  return "src/artifact.tsx";
}

export function isIdeArtifactType(
  value: string,
): value is CanonicalIdeArtifactType {
  return (CANONICAL_IDE_ARTIFACT_TYPES as readonly string[]).includes(value);
}

export function isArtifactCardType(
  value: string,
): value is CanonicalArtifactCardType {
  return (CANONICAL_ARTIFACT_CARD_TYPES as readonly string[]).includes(value);
}

export function extractArtifactEnvelopeFromPart(
  part: UnknownRecord,
): NativeArtifactCardData | null {
  if (typeof part.type !== "string") {
    return null;
  }

  if (part.type === "data-artifact-card" && "data" in part && part.data) {
    return part.data as NativeArtifactCardData;
  }

  if (part.type.startsWith("data-artifact-")) {
    const artifactType = part.type.replace(/^data-artifact-/, "");
    return parseArtifactEnvelope("data" in part ? part.data : part, artifactType);
  }

  if (part.type !== "data-payload") {
    return null;
  }

  const payloadRecord = asRecord(part.data);
  const artifactType = coerceString(payloadRecord.type);
  return artifactType ? parseArtifactEnvelope(payloadRecord, artifactType) : null;
}
