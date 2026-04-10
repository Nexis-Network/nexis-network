import type { AIEvent } from "@/lib/schema";

import {
  humanizeWorkflowStepName,
  normalizeTaskStatus,
  normalizeWorkflowStatus,
} from "./utils";
import {
  buildWorkflowCanvasFromNodes,
} from "./workflow-artifacts";
import {
  matchesWeakTransactionWorkflowPattern,
  matchesWorkflowPattern,
} from "./workflow-patterns";
import type {
  NativeQueueData,
  NativeTaskData,
  NativeTestResultsData,
  NativeWorkflowCanvasData,
} from "./types";

export function deriveTaskFromEvent(event: AIEvent): NativeTaskData | null {
  if (event.type === "task_update") {
    return {
      id: event.taskId,
      title: event.title,
      description: event.description,
      status: normalizeTaskStatus(event.status),
    };
  }

  if (event.type !== "workflow_update") {
    return null;
  }

  return {
    id: `${event.workflowId}:${event.stepName}`,
    title: humanizeWorkflowStepName(event.stepName),
    description:
      typeof event.progress === "number" ? `${event.progress}% complete` : undefined,
    status: normalizeTaskStatus(event.status),
  };
}

export function deriveWorkflowCanvasFromEvents(
  events: AIEvent[],
): NativeWorkflowCanvasData | null {
  const workflowEvents = events.filter(
    (event): event is Extract<AIEvent, { type: "workflow_update" }> =>
      event.type === "workflow_update",
  );

  if (workflowEvents.length < 2) {
    return null;
  }

  const groupedEvents = groupWorkflowEvents(workflowEvents);
  for (let index = groupedEvents.order.length - 1; index >= 0; index -= 1) {
    const workflowId = groupedEvents.order[index];
    const workflowEntries = workflowId ? groupedEvents.map.get(workflowId) ?? [] : [];
    const canvas = buildWorkflowCanvasFromEventGroup(workflowId ?? "", workflowEntries);
    if (canvas) {
      return canvas;
    }
  }

  return null;
}

export function deriveQueue(tasks: NativeTaskData[]): NativeQueueData | null {
  if (tasks.length === 0) return null;

  return {
    pending: tasks.filter(
      (task) => task.status === "pending" || task.status === "in_progress",
    ),
    completed: tasks.filter((task) => task.status === "done"),
    failed: tasks.filter((task) => task.status === "error"),
  };
}

export function deriveTestResults(
  events: AIEvent[],
): NativeTestResultsData | null {
  const testEvents = events.filter((event) => event.type === "test_result");
  if (testEvents.length === 0) return null;

  return {
    items: testEvents.map((event) => ({
      id: event.testId,
      name: event.name,
      status: event.status,
      summary:
        typeof event.metadata === "object" && event.metadata
          ? (event.metadata as { summary?: string }).summary
          : undefined,
    })),
  };
}

function groupWorkflowEvents(
  workflowEvents: Array<Extract<AIEvent, { type: "workflow_update" }>>,
): {
  map: Map<string, Array<Extract<AIEvent, { type: "workflow_update" }>>>;
  order: string[];
} {
  const map = new Map<string, Array<Extract<AIEvent, { type: "workflow_update" }>>>();
  const order: string[] = [];

  for (const event of workflowEvents) {
    const existing = map.get(event.workflowId);
    if (existing) {
      existing.push(event);
      continue;
    }

    map.set(event.workflowId, [event]);
    order.push(event.workflowId);
  }

  return { map, order };
}

function buildWorkflowCanvasFromEventGroup(
  workflowId: string,
  events: Array<Extract<AIEvent, { type: "workflow_update" }>>,
): NativeWorkflowCanvasData | null {
  if (events.length < 2) {
    return null;
  }

  const signals = countWorkflowSignals(workflowId, events);
  if (!signals.isBridgeWorkflow && !signals.isTransactionWorkflow) {
    return null;
  }

  const latest = events[events.length - 1];
  const kind = signals.isBridgeWorkflow ? "bridge" : "transaction";
  const nodes = events.map((event, eventIndex) => ({
    id: `${event.workflowId}:${event.stepName}:${eventIndex}`,
    label: event.stepName,
    status: normalizeWorkflowStatus(event.status),
    details:
      typeof event.progress === "number"
        ? `Progress ${event.progress}%`
        : undefined,
    x: 80 + eventIndex * 220,
    y: 80 + (eventIndex % 2) * 120,
  }));

  return buildWorkflowCanvasFromNodes({
    artifactId: `workflow-${latest.workflowId}`,
    title: kind === "bridge" ? "Bridge Workflow" : "Transaction Workflow",
    kind,
    status: latest.status,
    nodes,
  });
}

function countWorkflowSignals(
  workflowId: string,
  events: Array<Extract<AIEvent, { type: "workflow_update" }>>,
): {
  isBridgeWorkflow: boolean;
  isTransactionWorkflow: boolean;
} {
  const strongSignalCount = events.filter((event) =>
    matchesWorkflowPattern(`${event.workflowId} ${event.stepName}`),
  ).length;
  const weakSignalCount = events.filter((event) =>
    matchesWeakTransactionWorkflowPattern(event.stepName),
  ).length;
  const bridgeSignalCount = events.filter((event) =>
    /\bbridge\b/i.test(`${event.workflowId} ${event.stepName}`),
  ).length;
  const workflowIdHasStrongSignal = matchesWorkflowPattern(workflowId);

  return {
    isBridgeWorkflow:
      bridgeSignalCount >= 2 ||
      (bridgeSignalCount >= 1 && /\bbridge\b/i.test(workflowId)),
    isTransactionWorkflow:
      strongSignalCount >= 2 ||
      (strongSignalCount >= 1 && weakSignalCount >= 1) ||
      (workflowIdHasStrongSignal && strongSignalCount >= 1),
  };
}
