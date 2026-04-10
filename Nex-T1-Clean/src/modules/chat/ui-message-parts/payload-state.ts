import type { AIEvent } from "@/lib/schema";
import { isAIEventType } from "@/modules/chat/stream/aievent-contract";
import {
  isArtifactCardType,
  isIdeArtifactType,
  parseArtifactEnvelope,
} from "./artifacts";
import {
  applyIdeArtifactsToSession,
  applyEventsToSession,
  attachDerivedSessionData,
  resolveRenderableIdeSession,
} from "./native-session";
import type {
  ExtractedNativeMessageState,
  NativeArtifactCardData,
} from "./types";
import { asRecord, coerceString, createDefaultIdeSession } from "./utils";
import { mergeIdeSessionFromToolExecution } from "./tool-execution";
import type { ToolExecutionPayloadPart } from "./tool-execution-payload";
import {
  deriveQueue,
  deriveTaskFromEvent,
  deriveTestResults,
  deriveWorkflowCanvasFromArtifacts,
  deriveWorkflowCanvasFromEvents,
} from "./workflow";

type ExtractedNativePayloadState = Pick<
  ExtractedNativeMessageState,
  "artifactCards" | "ideArtifacts" | "ideSession" | "workflowCanvas"
>;

function isToolExecutionPayload(
  payload: unknown,
): payload is ToolExecutionPayloadPart {
  const record = asRecord(payload);
  return record.type === "tool-execution";
}

function extractAIEventFromPayload(payload: unknown): AIEvent | null {
  const record = asRecord(payload);
  if (typeof record.type !== "string" || !isAIEventType(record.type)) {
    return null;
  }

  return record as unknown as AIEvent;
}

function dedupeTasks(
  tasks: ExtractedNativeMessageState["tasks"],
): ExtractedNativeMessageState["tasks"] {
  return Array.from(new Map(tasks.map((task) => [task.id, task])).values());
}

function extractArtifactEnvelopeFromPayload(
  payload: unknown,
): NativeArtifactCardData | null {
  const record = asRecord(payload);
  const artifactType = coerceString(record.type);

  if (!artifactType) {
    return null;
  }

  if (!isIdeArtifactType(artifactType) && !isArtifactCardType(artifactType)) {
    return null;
  }

  return parseArtifactEnvelope(record, artifactType);
}

export function extractNativePayloadState(
  payloads: Array<unknown> | undefined,
): ExtractedNativePayloadState {
  const artifactCards: NativeArtifactCardData[] = [];
  const ideArtifacts: NativeArtifactCardData[] = [];
  const events: AIEvent[] = [];
  const toolExecutions: ToolExecutionPayloadPart[] = [];

  for (const payload of payloads ?? []) {
    const artifactEnvelope = extractArtifactEnvelopeFromPayload(payload);
    if (!artifactEnvelope) {
      if (isToolExecutionPayload(payload)) {
        toolExecutions.push(payload);
        continue;
      }

      const event = extractAIEventFromPayload(payload);
      if (event) {
        events.push(event);
      }
      continue;
    }

    if (isIdeArtifactType(artifactEnvelope.artifactType)) {
      ideArtifacts.push(artifactEnvelope);
    } else {
      artifactCards.push(artifactEnvelope);
    }
  }

  const ideSessionSource = createDefaultIdeSession();
  for (const toolExecution of toolExecutions) {
    mergeIdeSessionFromToolExecution(ideSessionSource, toolExecution);
  }
  applyIdeArtifactsToSession(ideSessionSource, ideArtifacts);
  applyEventsToSession(ideSessionSource, events);

  const dedupedTasks = dedupeTasks(
    events
      .map(deriveTaskFromEvent)
      .filter((task): task is NonNullable<typeof task> => task !== null),
  );
  attachDerivedSessionData(
    ideSessionSource,
    deriveQueue(dedupedTasks),
    deriveTestResults(events),
    [],
  );

  return {
    artifactCards,
    ideArtifacts,
    ideSession: resolveRenderableIdeSession(ideSessionSource, null),
    workflowCanvas:
      deriveWorkflowCanvasFromArtifacts([...ideArtifacts, ...artifactCards]) ??
      deriveWorkflowCanvasFromEvents(events),
  };
}
