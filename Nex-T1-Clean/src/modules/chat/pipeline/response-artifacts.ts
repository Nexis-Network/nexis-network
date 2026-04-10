import type { StructuredChatPayload } from "@/modules/chat/types";
import type { PipelineContext } from "@/modules/chat/pipeline/context-builder";
import type {
  ContextEnvelope,
  ContextEnvelopeArtifactRef,
} from "@/modules/chat/context-envelope";
import {
  upsertArtifactLedgerRecord,
  type ArtifactLedgerRecord,
} from "@/modules/chat/state/artifact-ledger";

export function getResponseContextEnvelope(
  context: Partial<PipelineContext>,
): ContextEnvelope {
  const existing = context.contextEnvelope;
  if (existing) {
    return existing;
  }

  const workingState = context.memorySnapshot?.workingState ?? {
    todos: [],
    entries: [],
    updatedAt: new Date(0).toISOString(),
  };

  return {
    version: "2026-03-05",
    turnId: context.request?.sessionId ?? "turn-fallback",
    sessionId: context.request?.sessionId ?? null,
    userId: context.auth?.userId ?? null,
    route: context.request?.tierRoute ?? "chat",
    traceId: context.traceContext?.traceId ?? null,
    prompt: {
      profileId: context.request?.systemPromptProfileId ?? null,
      label: "production",
      versions: {},
      versionHash: null,
      systemHash: null,
    },
    memory: {
      summary: context.workingMemorySummary ?? "Working memory: no active todos.",
      hash: null,
      scopes: [],
      facts: [],
      sources: [],
      workingState,
      activeTaskId: null,
      blockerGraph: [],
      verificationReceipts: [],
      promotionRules: [],
    },
    retrieval: { facts: [] },
    artifacts: { refs: context.artifactRefs ?? [] },
    budget: {
      contextLimit: null,
      maxTokens: null,
      toolMaxInvocations: null,
      toolMaxConcurrent: null,
    },
    cache: {
      policyVersion: "server-cache-policy-v2",
      readKey: null,
      writeKey: null,
      canRead: false,
      canWrite: false,
      reasons: [],
      memoryHash: null,
      marketContextHash: null,
      sessionSnapshotHash: null,
    },
  };
}

export function upsertAggregatedArtifactRef(
  aggregated: StructuredChatPayload,
  artifactRef: ContextEnvelopeArtifactRef,
) {
  const existing = Array.isArray(aggregated.artifactRefs)
    ? aggregated.artifactRefs
    : [];
  aggregated.artifactRefs = [
    artifactRef,
    ...existing.filter((entry) => entry.artifactId !== artifactRef.artifactId),
  ].slice(0, 16);
}

export function buildArtifactRef(
  record: ArtifactLedgerRecord,
): ContextEnvelopeArtifactRef {
  return {
    artifactId: record.artifactId,
    artifactType: record.artifactType,
    title: record.title ?? null,
    previewUrl: record.previewUrl ?? null,
    provenance: record.provenance,
    snapshotVersion: record.snapshotVersion,
    relatedToolCalls: record.relatedToolCalls.map((tool) => tool.name),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function persistArtifactLedgerEntry(args: {
  aggregated: StructuredChatPayload;
  artifactId: string;
  artifactType: string;
  context: PipelineContext;
  localEmit: (type: string, data: UntypedJson) => void;
  previewUrl?: string | null;
  provenance: string;
  title: string;
}): Promise<ContextEnvelopeArtifactRef | null> {
  const now = new Date().toISOString();
  const record: ArtifactLedgerRecord = {
    artifactId: args.artifactId,
    artifactType: args.artifactType,
    title: args.title,
    sessionId: args.context.request.sessionId ?? null,
    userId: args.context.auth.userId ?? null,
    previewUrl: args.previewUrl ?? null,
    snapshotVersion: 1,
    provenance: args.provenance,
    relatedToolCalls: (args.aggregated.toolCalls ?? [])
      .map((tool) => ({ id: tool.id, name: tool.name }))
      .slice(0, 16),
    createdAt: now,
    updatedAt: now,
  };

  const persisted = await upsertArtifactLedgerRecord(record);
  if (!persisted) {
    return null;
  }

  const artifactRef = buildArtifactRef(persisted);
  upsertAggregatedArtifactRef(args.aggregated, artifactRef);
  args.localEmit("artifact_update", {
    artifactId: artifactRef.artifactId,
    artifactType: artifactRef.artifactType,
    status: "completed",
    progress: 100,
  });
  return artifactRef;
}
