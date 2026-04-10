import { createHash } from "crypto";

import { shortTermMemory } from "@/modules/bedrock-agent/memory";
import { bedrockCoreMemory } from "@/modules/bedrock-agent/memory-core";
import { searchUserMemories, isMem0Configured } from "@/lib/memory/mem0-client";
import {
  computeWorkflowMetrics,
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
  summarizeWorkingMemoryState,
  type WorkingMemoryState,
} from "@/modules/chat/state/working-memory-store";

export type MemoryScopeKind = "turn" | "session" | "user" | "workspace";

export type MemoryScopeRef = {
  scope: MemoryScopeKind;
  refId: string;
  source: string;
  hash: string | null;
  summary?: string;
};

export type MemoryFact = {
  id: string;
  kind: "todo" | "note" | "memory" | "preference";
  source: string;
  scope: MemoryScopeKind | "external";
  summary: string;
};

export type MemoryWorkflowSnapshot = {
  activeTaskId: string | null;
  blockerGraph: Array<{ taskId: string; blockedBy: string[] }>;
  verificationReceipts: Array<{ taskId: string; completed: string[] }>;
  metrics: ReturnType<typeof computeWorkflowMetrics>;
};

export type MemorySnapshot = {
  summary: string;
  hash: string | null;
  refs: MemoryScopeRef[];
  facts: MemoryFact[];
  sources: string[];
  workingState: WorkingMemoryState;
  workflow: MemoryWorkflowSnapshot;
  shortTerm: string;
  longTerm: string;
  preferences: string;
  promotionRules: string[];
  workspaceId: string | null;
};

export type BuildMemorySnapshotParams = {
  latestUserMessage?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  skipDurableMemory?: boolean;
};

const DEFAULT_PROMOTION_RULES = [
  "Promote turn observations to session memory only after a successful tool result, explicit user confirmation, or completion of a workflow step.",
  "Promote session memory to user memory only for stable preferences, durable project facts, or reusable operating constraints.",
  "Promote user memory to workspace memory only for shared policies, collaboration rules, or organization-wide preferences.",
] as const;

const hashValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const truncate = (value: string, max = 240): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const dedupe = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

function buildWorkflowSnapshot(state: WorkingMemoryState): MemoryWorkflowSnapshot {
  const metrics = computeWorkflowMetrics(state);
  const activeTaskId =
    state.todos.find((todo) => todo.status === "in_progress")?.id ?? null;

  return {
    activeTaskId,
    blockerGraph: state.todos
      .filter((todo) => todo.blockedBy.length > 0)
      .map((todo) => ({
        taskId: todo.id,
        blockedBy: [...todo.blockedBy],
      })),
    verificationReceipts: state.todos
      .filter((todo) => todo.completedVerification.length > 0)
      .map((todo) => ({
        taskId: todo.id,
        completed: [...todo.completedVerification],
      })),
    metrics,
  };
}

function buildMemoryFacts(state: WorkingMemoryState): MemoryFact[] {
  const todoFacts = state.todos.slice(0, 6).map((todo) => ({
    id: `todo:${todo.id}`,
    kind: "todo" as const,
    source: "working-memory-store",
    scope: "session" as const,
    summary: truncate(`${todo.title} (${todo.status})`),
  }));

  const noteFacts = (Array.isArray(state.entries) ? state.entries : [])
    .slice(0, 6)
    .map((entry) => ({
      id: `entry:${entry.id}`,
      kind: "note" as const,
      source: "working-memory-store",
      scope: "session" as const,
      summary: truncate(entry.content),
    }));

  return [...todoFacts, ...noteFacts];
}

export async function buildMemorySnapshot({
  latestUserMessage,
  sessionId,
  userId,
  workspaceId,
  skipDurableMemory = false,
}: BuildMemorySnapshotParams): Promise<MemorySnapshot> {
  const scope = resolveWorkingMemoryScope({
    sessionId,
    userId,
  });

  const workingState = await readWorkingMemoryState(scope);
  const workflow = buildWorkflowSnapshot(workingState);
  const summary =
    workingState.todos.length > 0 || (workingState.entries?.length ?? 0) > 0
      ? summarizeWorkingMemoryState(workingState)
      : "Working memory: no active todos.";

  const sources = new Set<string>(["working-memory-store"]);
  const facts = buildMemoryFacts(workingState);
  const refs: MemoryScopeRef[] = [
    {
      scope: "session",
      refId: scope,
      source: "working-memory-store",
      hash: hashValue(JSON.stringify(workingState)),
      summary: truncate(summary),
    },
  ];

  if (latestUserMessage && latestUserMessage.trim().length > 0) {
    refs.unshift({
      scope: "turn",
      refId: hashValue(latestUserMessage).slice(0, 16),
      source: "request",
      hash: hashValue(latestUserMessage),
      summary: truncate(latestUserMessage),
    });
  }

  let shortTerm = "";
  let longTerm = "";
  let preferences = "";

  if (userId && !skipDurableMemory) {
    const [shortTermRes, coreMemoryRes, mem0Res] = await Promise.all([
      shortTermMemory.get(`user:${userId}:context`).catch(() => null),
      latestUserMessage
        ? bedrockCoreMemory.retrieveRelevantMemory(userId, latestUserMessage).catch(() => null)
        : Promise.resolve(null),
      isMem0Configured() && latestUserMessage
        ? searchUserMemories(userId, latestUserMessage, 3).catch(() => [])
        : Promise.resolve([]),
    ]);

    if (typeof shortTermRes === "string" && shortTermRes.trim().length > 0) {
      shortTerm = truncate(shortTermRes, 320);
      sources.add("bedrock-short-term");
      facts.push({
        id: "short-term",
        kind: "memory",
        source: "bedrock-short-term",
        scope: "user",
        summary: shortTerm,
      });
    }

    if (typeof coreMemoryRes === "string" && coreMemoryRes.trim().length > 0) {
      longTerm = truncate(coreMemoryRes, 360);
      sources.add("bedrock-core-memory");
      facts.push({
        id: "core-memory",
        kind: "memory",
        source: "bedrock-core-memory",
        scope: "user",
        summary: longTerm,
      });
    }

    const mem0Entries = Array.isArray(mem0Res) ? mem0Res : [];
    const preferenceEntries = mem0Entries
      .filter((entry) => {
        const metadata = entry?.metadata as Record<string, UntypedJson> | undefined;
        return metadata?.source === "preference_extractor";
      })
      .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
      .filter(Boolean);

    if (preferenceEntries.length > 0) {
      preferences = truncate(dedupe(preferenceEntries).join(" | "), 360);
      sources.add("mem0");
      facts.push(
        ...preferenceEntries.slice(0, 3).map((entry, index) => ({
          id: `preference:${index}`,
          kind: "preference" as const,
          source: "mem0",
          scope: "user" as const,
          summary: truncate(entry, 200),
        })),
      );
    }

    const mem0MemoryEntries = mem0Entries
      .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
      .filter(Boolean);

    if (!longTerm && mem0MemoryEntries.length > 0) {
      longTerm = truncate(dedupe(mem0MemoryEntries).join(" | "), 360);
      sources.add("mem0");
    }

    refs.push({
      scope: "user",
      refId: userId,
      source: "memory-contract",
      hash: hashValue(
        JSON.stringify({
          shortTerm,
          longTerm,
          preferences,
        }),
      ),
      summary: truncate([shortTerm, longTerm, preferences].filter(Boolean).join(" | "), 220),
    });
  }

  if (workspaceId) {
    refs.push({
      scope: "workspace",
      refId: workspaceId,
      source: "memory-contract",
      hash: hashValue(workspaceId),
      summary: "Workspace-scoped memory reference",
    });
  }

  return {
    summary,
    hash: hashValue(
      JSON.stringify({
        scope,
        workingState,
        shortTerm,
        longTerm,
        preferences,
        workspaceId: workspaceId ?? null,
      }),
    ),
    refs,
    facts,
    sources: [...sources],
    workingState,
    workflow,
    shortTerm,
    longTerm,
    preferences,
    promotionRules: [...DEFAULT_PROMOTION_RULES],
    workspaceId: workspaceId ?? null,
  };
}
