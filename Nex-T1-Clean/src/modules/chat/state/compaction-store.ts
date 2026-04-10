import { redis } from "@/server/services/redis";

import { logger } from "@/lib/logger";

export type StructuredCompactionState = {
  version: number;
  sessionId: string;
  decisionLog: string[];
  verifiedFacts: string[];
  unresolvedQuestions: string[];
  toolOutcomes: string[];
  artifactRefs: string[];
  blockerGraph: string[];
  updatedAt: string;
};

export type StructuredCompactionDelta = Omit<
  StructuredCompactionState,
  "version" | "sessionId" | "updatedAt"
>;

const COMPACTION_VERSION = 1;
const COMPACTION_TTL_SECONDS = 60 * 60 * 24 * 7;
const COMPACTION_KEY_PREFIX = "chat:compaction:";
const MAX_ITEMS_PER_BUCKET = 12;

const truncate = (value: string, max = 180): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const dedupe = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_ITEMS_PER_BUCKET);

function buildCompactionKey(sessionId: string): string {
  return `${COMPACTION_KEY_PREFIX}${sessionId}`;
}

export function summarizeStructuredCompactionState(
  state: StructuredCompactionState | null,
): string {
  if (!state) return "";

  const sections = [
    state.decisionLog.length > 0
      ? `Decisions: ${state.decisionLog.join(" | ")}`
      : "",
    state.verifiedFacts.length > 0
      ? `Verified facts: ${state.verifiedFacts.join(" | ")}`
      : "",
    state.unresolvedQuestions.length > 0
      ? `Open questions: ${state.unresolvedQuestions.join(" | ")}`
      : "",
    state.toolOutcomes.length > 0
      ? `Tool outcomes: ${state.toolOutcomes.join(" | ")}`
      : "",
    state.artifactRefs.length > 0
      ? `Artifacts: ${state.artifactRefs.join(" | ")}`
      : "",
    state.blockerGraph.length > 0
      ? `Blockers: ${state.blockerGraph.join(" | ")}`
      : "",
  ].filter(Boolean);

  return sections.join("\n").slice(0, 1800);
}

export async function readStructuredCompactionState(
  sessionId?: string | null,
): Promise<StructuredCompactionState | null> {
  if (!sessionId) return null;

  try {
    const raw = await redis.get<string>(buildCompactionKey(sessionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StructuredCompactionState;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      version: typeof parsed.version === "number" ? parsed.version : COMPACTION_VERSION,
      sessionId,
      decisionLog: Array.isArray(parsed.decisionLog) ? dedupe(parsed.decisionLog) : [],
      verifiedFacts: Array.isArray(parsed.verifiedFacts) ? dedupe(parsed.verifiedFacts) : [],
      unresolvedQuestions: Array.isArray(parsed.unresolvedQuestions)
        ? dedupe(parsed.unresolvedQuestions)
        : [],
      toolOutcomes: Array.isArray(parsed.toolOutcomes) ? dedupe(parsed.toolOutcomes) : [],
      artifactRefs: Array.isArray(parsed.artifactRefs) ? dedupe(parsed.artifactRefs) : [],
      blockerGraph: Array.isArray(parsed.blockerGraph) ? dedupe(parsed.blockerGraph) : [],
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    logger.warn("[compaction-store] failed to read state", { sessionId, error });
    return null;
  }
}

export function mergeStructuredCompactionState(
  previous: StructuredCompactionState | null,
  delta: StructuredCompactionDelta,
  sessionId: string,
): StructuredCompactionState {
  return {
    version: COMPACTION_VERSION,
    sessionId,
    decisionLog: dedupe([...(previous?.decisionLog ?? []), ...delta.decisionLog]),
    verifiedFacts: dedupe([...(previous?.verifiedFacts ?? []), ...delta.verifiedFacts]),
    unresolvedQuestions: dedupe([
      ...(previous?.unresolvedQuestions ?? []),
      ...delta.unresolvedQuestions,
    ]),
    toolOutcomes: dedupe([...(previous?.toolOutcomes ?? []), ...delta.toolOutcomes]),
    artifactRefs: dedupe([...(previous?.artifactRefs ?? []), ...delta.artifactRefs]),
    blockerGraph: dedupe([...(previous?.blockerGraph ?? []), ...delta.blockerGraph]),
    updatedAt: new Date().toISOString(),
  };
}

export async function writeStructuredCompactionState(
  state: StructuredCompactionState,
): Promise<void> {
  try {
    await redis.set(buildCompactionKey(state.sessionId), JSON.stringify(state), {
      ex: COMPACTION_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn("[compaction-store] failed to write state", {
      sessionId: state.sessionId,
      error,
    });
  }
}

export function buildStructuredCompactionDeltaFromMessages(
  messages: Array<{ role: string; content: UntypedJson }>,
): StructuredCompactionDelta {
  const decisionLog: string[] = [];
  const verifiedFacts: string[] = [];
  const unresolvedQuestions: string[] = [];

  for (const message of messages) {
    const content =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" ")
          : JSON.stringify(message.content ?? "");
    const text = content.trim();
    if (!text) continue;

    if (message.role === "assistant") {
      const firstSentence = truncate(text.split(/[.!?]\s/, 1)[0] ?? text);
      if (/^i (will|can|recommend|found|determined)/i.test(text)) {
        decisionLog.push(firstSentence);
      }
      if (/verified|confirmed|based on/i.test(text)) {
        verifiedFacts.push(firstSentence);
      }
    }

    if (message.role === "user" && /\?$/.test(text)) {
      unresolvedQuestions.push(truncate(text, 160));
    }
  }

  return {
    decisionLog: dedupe(decisionLog),
    verifiedFacts: dedupe(verifiedFacts),
    unresolvedQuestions: dedupe(unresolvedQuestions),
    toolOutcomes: [],
    artifactRefs: [],
    blockerGraph: [],
  };
}
