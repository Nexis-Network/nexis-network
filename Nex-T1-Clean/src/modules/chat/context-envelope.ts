import { createHash } from "crypto";

import type { MemoryFact, MemoryScopeRef, MemorySnapshot } from "@/modules/chat/state/memory-contract";
import type { WorkingMemoryState } from "@/modules/chat/state/working-memory-store";

export type ContextEnvelopeFact = {
  id: string;
  kind: string;
  source: string;
  summary: string;
  ref?: string | null;
};

export type ContextEnvelopeArtifactRef = {
  artifactId: string;
  artifactType: string;
  title?: string | null;
  previewUrl?: string | null;
  provenance: string;
  snapshotVersion: number;
  relatedToolCalls: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ContextEnvelopeCacheState = {
  policyVersion: string;
  readKey: string | null;
  writeKey: string | null;
  canRead: boolean;
  canWrite: boolean;
  reasons: string[];
  memoryHash: string | null;
  marketContextHash: string | null;
  sessionSnapshotHash: string | null;
};

export type ContextEnvelope = {
  version: string;
  turnId: string;
  sessionId: string | null;
  userId: string | null;
  route: string;
  traceId: string | null;
  prompt: {
    profileId: string | null;
    label: string;
    versions: Record<string, number>;
    versionHash: string | null;
    systemHash: string | null;
  };
  memory: {
    summary: string;
    hash: string | null;
    scopes: MemoryScopeRef[];
    facts: ContextEnvelopeFact[];
    sources: string[];
    workingState: WorkingMemoryState;
    activeTaskId: string | null;
    blockerGraph: Array<{ taskId: string; blockedBy: string[] }>;
    verificationReceipts: Array<{ taskId: string; completed: string[] }>;
    promotionRules: string[];
  };
  retrieval: {
    facts: ContextEnvelopeFact[];
  };
  artifacts: {
    refs: ContextEnvelopeArtifactRef[];
  };
  budget: {
    contextLimit: number | null;
    maxTokens: number | null;
    toolMaxInvocations: number | null;
    toolMaxConcurrent: number | null;
  };
  cache: ContextEnvelopeCacheState;
};

export type CreateContextEnvelopeParams = {
  turnId: string;
  sessionId?: string | null;
  userId?: string | null;
  route?: string | null;
  profileId?: string | null;
  promptLabel?: string;
  memorySnapshot: MemorySnapshot;
  artifactRefs?: ContextEnvelopeArtifactRef[];
  marketContextHash?: string | null;
  sessionSnapshotHash?: string | null;
};

const CONTEXT_ENVELOPE_VERSION = "2026-03-05";

export function hashContextValue(value: unknown): string | null {
  if (value == null) return null;

  const serialized =
    typeof value === "string" ? value : JSON.stringify(value);
  if (!serialized || serialized === "{}" || serialized === "[]") {
    return null;
  }

  return createHash("sha256").update(serialized).digest("hex");
}

function toContextFacts(facts: MemoryFact[]): ContextEnvelopeFact[] {
  return facts.map((fact) => ({
    id: fact.id,
    kind: fact.kind,
    source: fact.source,
    summary: fact.summary,
    ref: fact.scope,
  }));
}

export function createContextEnvelope(
  params: CreateContextEnvelopeParams,
): ContextEnvelope {
  const retrievalFacts = params.memorySnapshot.facts
    .filter((fact) => fact.kind === "memory" || fact.kind === "preference" || fact.kind === "note");

  return {
    version: CONTEXT_ENVELOPE_VERSION,
    turnId: params.turnId,
    sessionId: params.sessionId ?? null,
    userId: params.userId ?? null,
    route: params.route ?? "chat",
    traceId: null,
    prompt: {
      profileId: params.profileId ?? null,
      label: params.promptLabel ?? "production",
      versions: {},
      versionHash: null,
      systemHash: null,
    },
    memory: {
      summary: params.memorySnapshot.summary,
      hash: params.memorySnapshot.hash,
      scopes: params.memorySnapshot.refs,
      facts: toContextFacts(params.memorySnapshot.facts),
      sources: params.memorySnapshot.sources,
      workingState: params.memorySnapshot.workingState,
      activeTaskId: params.memorySnapshot.workflow.activeTaskId,
      blockerGraph: params.memorySnapshot.workflow.blockerGraph,
      verificationReceipts: params.memorySnapshot.workflow.verificationReceipts,
      promotionRules: [...params.memorySnapshot.promotionRules],
    },
    retrieval: {
      facts: toContextFacts(retrievalFacts),
    },
    artifacts: {
      refs: params.artifactRefs ?? [],
    },
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
      memoryHash: params.memorySnapshot.hash,
      marketContextHash: params.marketContextHash ?? null,
      sessionSnapshotHash: params.sessionSnapshotHash ?? null,
    },
  };
}

export function buildContextEnvelopePromptSummary(
  envelope: ContextEnvelope,
): string {
  const lines: string[] = [
    `turn=${envelope.turnId}`,
    `route=${envelope.route}`,
    `prompt_label=${envelope.prompt.label}`,
  ];

  if (envelope.memory.activeTaskId) {
    lines.push(`active_task=${envelope.memory.activeTaskId}`);
  }

  if (envelope.memory.facts.length > 0) {
    lines.push(
      `memory=${envelope.memory.facts
        .slice(0, 4)
        .map((fact) => fact.summary)
        .join(" | ")}`,
    );
  }

  if (envelope.retrieval.facts.length > 0) {
    lines.push(
      `facts=${envelope.retrieval.facts
        .slice(0, 4)
        .map((fact) => fact.summary)
        .join(" | ")}`,
    );
  }

  if (envelope.artifacts.refs.length > 0) {
    lines.push(
      `artifacts=${envelope.artifacts.refs
        .slice(0, 4)
        .map((artifact) => `${artifact.artifactType}:${artifact.artifactId}`)
        .join(" | ")}`,
    );
  }

  lines.push(
    `budget=context:${envelope.budget.contextLimit ?? "?"}, tools:${envelope.budget.toolMaxInvocations ?? "?"}/${envelope.budget.toolMaxConcurrent ?? "?"}`,
  );

  if (envelope.cache.reasons.length > 0) {
    lines.push(`cache=${envelope.cache.reasons.join(",")}`);
  }

  return `<context_envelope>\n${lines.join("\n")}\n</context_envelope>`;
}
