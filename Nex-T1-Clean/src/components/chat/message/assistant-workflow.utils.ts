import type { AIAgentStream } from "@/lib/schema";
import type { Source } from "@/components/dashboard/chat-types";
import {
  isChatReasoningUIPart,
  type NativeQueueData,
  type NativeTaskData,
} from "@/modules/chat/ui-message-parts";

export type WorkflowTaskStatus = NativeTaskData["status"];

export type WorkflowTaskItem = NativeTaskData & {
  kind: "task" | "tool";
};

export type ChainOfThoughtStepView = {
  id: string;
  label: string;
  description?: string;
  status: "complete" | "active" | "pending";
  sourceBadges?: string[];
};

type ToolExecutionLike = {
  toolCallId?: string;
  toolName: string;
  status: "pending" | "executing" | "complete" | "error";
  input?: UntypedJson;
  error?: string;
};

const REASONING_SPLIT_PATTERN = /\n{2,}|\n(?=\s*(?:[-*•]|\d+[.)]))/g;
const MAX_REASONING_SEGMENTS = 6;
const MAX_TOOL_DESCRIPTION = 160;
const MAX_STEP_LABEL = 88;

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function splitReasoningBlock(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(REASONING_SPLIT_PATTERN)
    .map((segment) => segment.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function dedupeOverlappingSegments(segments: string[]): string[] {
  const deduped: string[] = [];

  for (const rawSegment of segments) {
    const segment = normalizeMultilineText(rawSegment);
    if (!segment) {
      continue;
    }

    const existingIndex = deduped.findIndex((existing) => {
      const normalizedExisting = normalizeWhitespace(existing);
      const normalizedSegment = normalizeWhitespace(segment);
      return (
        normalizedExisting === normalizedSegment ||
        normalizedExisting.includes(normalizedSegment) ||
        normalizedSegment.includes(normalizedExisting)
      );
    });

    if (existingIndex === -1) {
      deduped.push(segment);
      continue;
    }

    if (normalizeWhitespace(segment).length > normalizeWhitespace(deduped[existingIndex]).length) {
      deduped[existingIndex] = segment;
    }
  }

  return deduped.slice(-MAX_REASONING_SEGMENTS);
}

export function collectReasoningSegments(
  parts: Array<unknown> | undefined,
  thoughts: AIAgentStream[] | undefined,
): string[] {
  const reasoningCandidates: string[] = [];

  for (const part of parts ?? []) {
    if (isChatReasoningUIPart(part) && typeof part.text === "string") {
      reasoningCandidates.push(part.text);
    }
  }

  if (reasoningCandidates.length === 0) {
    for (const thought of thoughts ?? []) {
      if (typeof thought?.thought === "string") {
        reasoningCandidates.push(thought.thought);
      }
    }
  }

  const splitSegments = reasoningCandidates.flatMap(splitReasoningBlock);
  return dedupeOverlappingSegments(splitSegments);
}

export function summarizeReasoningSegments(
  segments: string[],
  fallback?: string,
): string {
  if (segments.length === 0) {
    return fallback?.trim() || "Working through the request.";
  }

  if (segments.length === 1) {
    return truncate(normalizeWhitespace(segments[0]), MAX_TOOL_DESCRIPTION);
  }

  return segments
    .slice(0, 2)
    .map((segment) => truncate(normalizeWhitespace(segment), 72))
    .join(" • ");
}

function humanizeToolName(value: string): string {
  return value
    .replace(/^data-/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bOpenai\b/g, "OpenAI")
    .replace(/\bE2b\b/g, "E2B")
    .replace(/\bApi\b/g, "API")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bId\b/g, "ID");
}

function describeToolInput(value: UntypedJson): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return truncate(normalizeWhitespace(value), MAX_TOOL_DESCRIPTION);
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, UntypedJson>;

  const directCandidate =
    typeof record.query === "string"
      ? `Query: ${record.query}`
      : typeof record.prompt === "string"
        ? `Prompt: ${record.prompt}`
        : typeof record.path === "string"
          ? `Path: ${record.path}`
          : typeof record.url === "string"
            ? `Target: ${record.url}`
            : typeof record.command === "string"
              ? `Command: ${record.command}`
              : typeof record.code === "string"
                ? "Streaming generated code to the workbench"
                : null;

  if (directCandidate) {
    return truncate(normalizeWhitespace(directCandidate), MAX_TOOL_DESCRIPTION);
  }

  const compact = Object.entries(record)
    .filter(([, fieldValue]) =>
      typeof fieldValue === "string" ||
      typeof fieldValue === "number" ||
      typeof fieldValue === "boolean",
    )
    .slice(0, 3)
    .map(([key, fieldValue]) => `${key}: ${String(fieldValue)}`)
    .join(" • ");

  return compact ? truncate(normalizeWhitespace(compact), MAX_TOOL_DESCRIPTION) : undefined;
}

function toWorkflowStatus(status: ToolExecutionLike["status"]): WorkflowTaskStatus {
  switch (status) {
    case "executing":
      return "in_progress";
    case "complete":
      return "done";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

export function buildWorkflowItems(
  tasks: NativeTaskData[],
  toolExecutions: ToolExecutionLike[],
): WorkflowTaskItem[] {
  const items: WorkflowTaskItem[] = tasks.map((task) => ({
    ...task,
    kind: "task",
  }));
  const seenTitles = new Set(tasks.map((task) => normalizeWhitespace(task.title).toLowerCase()));

  for (const [index, toolExecution] of toolExecutions.entries()) {
    const title = humanizeToolName(toolExecution.toolName);
    const normalizedTitle = normalizeWhitespace(title).toLowerCase();

    if (
      seenTitles.has(normalizedTitle) &&
      toWorkflowStatus(toolExecution.status) === "done"
    ) {
      continue;
    }

    items.push({
      id: toolExecution.toolCallId ?? `tool-${toolExecution.toolName}-${index}`,
      title,
      description:
        toolExecution.status === "error"
          ? toolExecution.error
          : describeToolInput(toolExecution.input),
      status: toWorkflowStatus(toolExecution.status),
      kind: "tool",
    });
    seenTitles.add(normalizedTitle);
  }

  return items;
}

export function resolveWorkflowStatus(
  items: WorkflowTaskItem[],
): WorkflowTaskStatus {
  if (items.some((item) => item.status === "error")) {
    return "error";
  }
  if (items.some((item) => item.status === "in_progress")) {
    return "in_progress";
  }
  if (items.some((item) => item.status === "pending")) {
    return "pending";
  }
  return "done";
}

export function buildQueueData(
  explicitQueue: NativeQueueData | null,
  workflowItems: WorkflowTaskItem[],
): NativeQueueData | null {
  if (explicitQueue) {
    return explicitQueue;
  }

  if (workflowItems.length === 0) {
    return null;
  }

  return {
    pending: workflowItems.filter(
      (item) => item.status === "pending" || item.status === "in_progress",
    ),
    completed: workflowItems.filter((item) => item.status === "done"),
    failed: workflowItems.filter((item) => item.status === "error"),
  };
}

export function hasQueueItems(queue: NativeQueueData | null): boolean {
  if (!queue) {
    return false;
  }

  return (
    queue.pending.length > 0 ||
    queue.completed.length > 0 ||
    queue.failed.length > 0
  );
}

function toSourceBadge(source: Source): string | null {
  if (typeof source.url === "string" && source.url.length > 0) {
    try {
      return new URL(source.url).hostname.replace(/^www\./, "");
    } catch {
      return source.title || null;
    }
  }

  return source.title || null;
}

function toStepLabel(value: string): string {
  const normalized = normalizeWhitespace(value);
  const firstSentence =
    normalized.match(/^(.+?[.!?])(?:\s|$)/)?.[1]?.trim() ?? normalized;
  return truncate(firstSentence, MAX_STEP_LABEL);
}

export function buildChainOfThoughtSteps(args: {
  reasoningSegments: string[];
  workflowItems: WorkflowTaskItem[];
  sources: Source[];
  isStreaming: boolean;
}): ChainOfThoughtStepView[] {
  const sourceBadges = args.sources
    .map(toSourceBadge)
    .filter((badge): badge is string => Boolean(badge))
    .slice(0, 4);

  if (args.reasoningSegments.length > 0) {
    return args.reasoningSegments.map((segment, index) => {
      const label = toStepLabel(segment);
      const description =
        normalizeWhitespace(segment) !== normalizeWhitespace(label)
          ? segment
          : undefined;

      return {
        id: `reasoning-${index}`,
        label,
        description,
        status:
          args.isStreaming && index === args.reasoningSegments.length - 1
            ? "active"
            : "complete",
        sourceBadges:
          sourceBadges.length > 0 && index === args.reasoningSegments.length - 1
            ? sourceBadges
            : undefined,
      };
    });
  }

  return args.workflowItems.map((item, index) => ({
    id: item.id,
    label: item.title,
    description: item.description,
    status:
      item.status === "error"
        ? "active"
        : item.status === "in_progress"
          ? "active"
          : item.status === "pending"
            ? "pending"
            : "complete",
    sourceBadges: sourceBadges.length > 0 && index === 0 ? sourceBadges : undefined,
  }));
}
