import type { AIEvent } from "@/lib/schema";

import {
  extractArtifactEnvelopeFromPart,
  isArtifactCardType,
  isIdeArtifactType,
} from "./artifacts";
import {
  extractAIEventFromPart,
  isNativeCheckpointPart,
  isNativeIdeSessionPart,
  isNativeQueuePart,
  isNativeTaskPart,
  isNativeTestResultsPart,
  isNativeWorkflowCanvasPart,
} from "./guards";
import { extractToolExecutionPayloadFromPart, mergeIdeSessionFromToolExecution } from "./tool-execution";
import type {
  ExtractedNativeMessageState,
  NativeArtifactCardData,
  NativeCheckpointData,
  NativeIdeSessionData,
  NativeQueueData,
  NativeTaskData,
  NativeTestResultsData,
  NativeWorkflowCanvasData,
} from "./types";
import {
  asRecord,
} from "./utils";
import {
  deriveQueue,
  deriveTaskFromEvent,
  deriveTestResults,
  deriveWorkflowCanvasFromArtifacts,
  deriveWorkflowCanvasFromEvents,
} from "./workflow";
import {
  applyEventsToSession,
  applyIdeArtifactsToSession,
  attachDerivedSessionData,
  cloneIdeSession,
  normalizeNativeIdeSession,
  resolveRenderableIdeSession,
} from "./native-session";

export function extractNativeMessageState(
  parts: Array<unknown> | undefined,
): ExtractedNativeMessageState {
  const artifactCards: NativeArtifactCardData[] = [];
  const ideArtifacts: NativeArtifactCardData[] = [];
  const explicitTasks: NativeTaskData[] = [];
  const explicitCheckpoints: NativeCheckpointData[] = [];
  const events: AIEvent[] = [];
  let explicitQueue: NativeQueueData | null = null;
  let explicitTestResults: NativeTestResultsData | null = null;
  let ideSession: NativeIdeSessionData | null = null;
  let workflowCanvas: NativeWorkflowCanvasData | null = null;

  visitMessageParts(parts, (part) => {
    const toolExecutionPayload = extractToolExecutionPayloadFromPart(part);
    if (toolExecutionPayload) {
      const nextSession = cloneIdeSession(ideSession);
      mergeIdeSessionFromToolExecution(nextSession, toolExecutionPayload);
      ideSession = nextSession;
    }

    const event = extractAIEventFromPart(part);
    if (event) {
      events.push(event);
    }

    const artifactEnvelope = extractArtifactEnvelope(part);
    if (artifactEnvelope) {
      if (isIdeArtifactType(artifactEnvelope.artifactType)) {
        ideArtifacts.push(artifactEnvelope);
      } else if (isArtifactCardType(artifactEnvelope.artifactType)) {
        artifactCards.push(artifactEnvelope);
      }
    }

    if (isNativeTaskPart(part)) {
      explicitTasks.push(part.data);
    } else if (isNativeQueuePart(part)) {
      explicitQueue = part.data;
    } else if (isNativeCheckpointPart(part)) {
      explicitCheckpoints.push(part.data);
    } else if (isNativeTestResultsPart(part)) {
      explicitTestResults = part.data;
    } else if (isNativeIdeSessionPart(part)) {
      ideSession = normalizeNativeIdeSession(part.data);
    } else if (isNativeWorkflowCanvasPart(part)) {
      workflowCanvas = part.data;
    }
  });

  const dedupedTasks = dedupeTasks([
    ...explicitTasks,
    ...events.map(deriveTaskFromEvent).filter((task): task is NativeTaskData => task !== null),
  ]);
  const derivedQueue = explicitQueue ?? deriveQueue(dedupedTasks);
  const derivedWorkflowCanvas =
    workflowCanvas ??
    deriveWorkflowCanvasFromArtifacts([...ideArtifacts, ...artifactCards]) ??
    deriveWorkflowCanvasFromEvents(events);
  const derivedTestResults = explicitTestResults ?? deriveTestResults(events);
  const session = cloneIdeSession(ideSession);

  applyIdeArtifactsToSession(session, ideArtifacts);
  applyEventsToSession(session, events);
  attachDerivedSessionData(session, derivedQueue, derivedTestResults, explicitCheckpoints);

  return {
    artifactCards,
    ideArtifacts,
    ideSession: resolveRenderableIdeSession(session, ideSession),
    workflowCanvas: derivedWorkflowCanvas,
    tasks: dedupedTasks,
    queue: derivedQueue,
    checkpoints: explicitCheckpoints,
    testResults: derivedTestResults,
    latestEvent: events.length > 0 ? events[events.length - 1] : null,
  };
}

function extractArtifactEnvelope(
  part: unknown,
): NativeArtifactCardData | null {
  const record = asRecord(part);
  return typeof record.type === "string"
    ? extractArtifactEnvelopeFromPart(record)
    : null;
}

function dedupeTasks(tasks: NativeTaskData[]): NativeTaskData[] {
  return Array.from(new Map(tasks.map((task) => [task.id, task])).values());
}

function getNestedPartCollections(part: unknown): unknown[][] {
  const record = asRecord(part);
  if (!record || Object.keys(record).length === 0) {
    return [];
  }

  const nestedCollections: unknown[][] = [];
  if (Array.isArray(record.parts)) {
    nestedCollections.push(record.parts);
  }

  for (const key of ["data", "output", "result"] as const) {
    const value = record[key];
    if (typeof value === "object" && value && Array.isArray((value as { parts?: unknown[] }).parts)) {
      nestedCollections.push((value as { parts: unknown[] }).parts);
    }
  }

  return nestedCollections;
}

function visitMessageParts(
  parts: Array<unknown> | undefined,
  visitor: (part: unknown) => void,
): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const part of parts) {
    visitor(part);
    for (const nestedParts of getNestedPartCollections(part)) {
      visitMessageParts(nestedParts, visitor);
    }
  }
}
