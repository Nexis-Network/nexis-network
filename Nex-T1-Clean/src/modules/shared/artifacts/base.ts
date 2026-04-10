import { z } from "zod";

/**
 * Shared error payload schema used by all artifact responses.
 * `code` and `message` are required so downstream error displays can rely on them.
 */
export const ErrorPayloadSchema = z.object({
  code: z.string().min(1, "Error code is required."),
  message: z.string().min(1, "Error message is required."),
  status: z.number().int().nonnegative().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Optional metadata that can be attached to any artifact.
 * `title` is typically rendered in headers, while `summary` can feed expandable panels.
 */
export const ArtifactMetadataSchema = z.object({
  title: z.string().min(1).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  summary: z.string().optional(),
});

/**
 * Streaming lifecycle state for an artifact.
 * The `completed` flag signals that live updates have ended.
 */
export const StreamStateSchema = z.object({
  completed: z.boolean(),
  currentStep: z.string().min(1).optional(),
  error: ErrorPayloadSchema.optional(),
});

/**
 * Helper to compose the envelope schema for a given artifact type.
 * All artifacts must set `type`, `version`, timestamps, and provide a typed `data` object.
 */
export function createArtifactEnvelopeSchema<
  TType extends string,
  TDataSchema extends z.ZodTypeAny
>(type: TType, dataSchema: TDataSchema) {
  return z.object({
    id: z.string().min(1).describe("Unique identifier for this artifact instance."),
    type: z.literal(type).describe("Artifact type discriminator."),
    version: z
      .string()
      .min(1)
      .describe("Semantic version string for this artifact payload."),
    createdAt: z
      .string()
      .datetime()
      .describe("ISO8601 timestamp when the artifact was created."),
    updatedAt: z
      .string()
      .datetime()
      .describe("ISO8601 timestamp when the artifact was last updated."),
    data: dataSchema.describe("Artifact-specific structured payload."),
    metadata: ArtifactMetadataSchema.optional(),
    streamState: StreamStateSchema.optional(),
  });
}

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
export type ArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;
export type StreamState = z.infer<typeof StreamStateSchema>;

export type ArtifactEnvelope<TType extends string, TData> = {
  id: string;
  type: TType;
  version: string;
  createdAt: string;
  updatedAt: string;
  data: TData;
  metadata?: ArtifactMetadata;
  streamState?: StreamState;
};

/**
 * Utility for generating consistent timestamps.
 * Accepts optional overrides when we need to persist existing timestamps.
 */
export function buildTimestamps(
  overrides?: Partial<Pick<ArtifactEnvelope<string, UntypedJson>, "createdAt" | "updatedAt">>
) {
  const now = new Date().toISOString();
  return {
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

/**
 * Helper to create the base envelope with sane defaults.
 * Consumers can override any field in `overrides` while guaranteeing required fields exist.
 */
function generateArtifactId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createArtifactEnvelope<TType extends string, TData>(
  type: TType,
  data: TData,
  overrides: Partial<ArtifactEnvelope<TType, TData>> = {}
): ArtifactEnvelope<TType, TData> {
  const { createdAt, updatedAt } = buildTimestamps(overrides);

  return {
    id: overrides.id ?? generateArtifactId(),
    type,
    version: overrides.version ?? "v1",
    createdAt,
    updatedAt,
    data,
    metadata: overrides.metadata,
    streamState:
      overrides.streamState ??
      ({
        completed: false,
      } satisfies StreamState),
  };
}

/**
 * Normalises error payloads so API handlers can respond with the documented structure.
 */
export function toErrorPayload(error: UntypedJson, fallback: ErrorPayload): ErrorPayload {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const candidate = error as Partial<ErrorPayload>;
    return {
      code: candidate.code ?? fallback.code,
      message: candidate.message ?? fallback.message,
      status: candidate.status,
      details: candidate.details,
    };
  }

  return fallback;
}
