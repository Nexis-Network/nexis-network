import type { ChatStatus } from "ai";

import type { ConversationMessage } from "@/components/dashboard/chat-types";
import {
  extractNativeMessageState,
  type NativeTaskData,
} from "@/modules/chat/ui-message-parts";

export type ComposerTaskTone = "working" | "issue" | "complete" | "error";

export type ComposerTaskItem = NativeTaskData & {
  detailText: string;
  isCurrent: boolean;
  statusLabel: "Queued" | "In progress" | "Completed" | "Error";
};

export type ComposerTaskState = {
  currentTaskId: string | null;
  previewText: string;
  tasks: ComposerTaskItem[];
  tone: ComposerTaskTone;
};

const TASK_SIGNAL_EVENT_TYPES = new Set(["task_update", "workflow_update"]);

const TASK_STATUS_LABELS: Record<NativeTaskData["status"], ComposerTaskItem["statusLabel"]> =
  {
    pending: "Queued",
    in_progress: "In progress",
    done: "Completed",
    error: "Error",
  };

const TASK_STATUS_PRIORITY: Record<NativeTaskData["status"], number> = {
  in_progress: 0,
  pending: 1,
  error: 2,
  done: 3,
};

const INTERNAL_BOOTSTRAP_TASK_KEYS = new Set([
  "context_build",
  "prompt_build",
  "tool_setup",
]);

function hasTaskSignals(message: ConversationMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  const nativeState = extractNativeMessageState(message.parts);
  const latestEvent = nativeState.latestEvent;

  return (
    nativeState.tasks.length > 0 ||
    nativeState.queue !== null ||
    (latestEvent !== null && TASK_SIGNAL_EVENT_TYPES.has(latestEvent.type))
  );
}

function truncateWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return value.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function normalizeTaskKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isProgressOnlyDescription(value: string | undefined): boolean {
  return typeof value === "string" && /^\d{1,3}%\s+complete$/i.test(value.trim());
}

function isInternalBootstrapTask(task: NativeTaskData): boolean {
  const normalizedId = normalizeTaskKey(task.id);
  const normalizedTitle = normalizeTaskKey(task.title);

  return (
    INTERNAL_BOOTSTRAP_TASK_KEYS.has(normalizedId) ||
    INTERNAL_BOOTSTRAP_TASK_KEYS.has(normalizedTitle)
  );
}

function describeTask(task: NativeTaskData): string {
  if (isInternalBootstrapTask(task)) {
    switch (task.status) {
      case "in_progress":
        return "Preparing the response.";
      case "pending":
        return "Response preparation is queued.";
      case "done":
        return "Response preparation is complete.";
      case "error":
        return "Response preparation hit an issue.";
    }
  }

  if (typeof task.description === "string" && task.description.trim().length > 0) {
    return task.description.trim();
  }

  switch (task.status) {
    case "in_progress":
      return `Currently working on ${task.title}.`;
    case "pending":
      return `${task.title} is queued next.`;
    case "done":
      return `${task.title} is complete.`;
    case "error":
      return `Issue detected while handling ${task.title}.`;
  }
}

function formatPreviewText(task: NativeTaskData | null): string {
  if (!task) {
    return "Preparing response";
  }

  if (isInternalBootstrapTask(task)) {
    return "Preparing response";
  }

  const meaningfulDescription = isProgressOnlyDescription(task.description)
    ? ""
    : task.description;
  const previewSource = [task.title, meaningfulDescription].filter(Boolean).join(" ");

  return truncateWords(previewSource || task.title || "Preparing response", 6);
}

function createComposerTaskItem(task: NativeTaskData): ComposerTaskItem {
  return {
    ...task,
    title: isInternalBootstrapTask(task) ? "Preparing response" : task.title,
    detailText: describeTask(task),
    isCurrent: false,
    statusLabel: TASK_STATUS_LABELS[task.status],
  };
}

function pickCurrentTask(tasks: NativeTaskData[]): NativeTaskData | null {
  return (
    tasks.find((task) => task.status === "in_progress") ??
    tasks.find((task) => task.status === "pending") ??
    tasks.find((task) => task.status === "error") ??
    tasks.at(-1) ??
    null
  );
}

function resolveTone(args: {
  chatStatus: ChatStatus;
  messageStatus: ConversationMessage["status"];
  tasks: NativeTaskData[];
}): ComposerTaskTone {
  const hasActiveTask = args.tasks.some(
    (task) => task.status === "pending" || task.status === "in_progress",
  );
  const hasErrorTask = args.tasks.some((task) => task.status === "error");
  const allTasksCompleted =
    args.tasks.length > 0 && args.tasks.every((task) => task.status === "done");

  if (args.chatStatus === "error" || args.messageStatus === "error") {
    return "error";
  }

  if (hasErrorTask && hasActiveTask) {
    return "issue";
  }

  if (hasErrorTask) {
    return "error";
  }

  if (allTasksCompleted) {
    return "complete";
  }

  return "working";
}

export function deriveComposerTaskState(args: {
  chatStatus: ChatStatus;
  messages: ConversationMessage[];
}): ComposerTaskState | null {
  const taskMessage = [...args.messages]
    .reverse()
    .find((message) => hasTaskSignals(message));

  if (!taskMessage) {
    return null;
  }

  const nativeState = extractNativeMessageState(taskMessage.parts);
  if (nativeState.tasks.length === 0) {
    return null;
  }

  const hasActiveOrErroredTask = nativeState.tasks.some(
    (task) =>
      task.status === "pending" ||
      task.status === "in_progress" ||
      task.status === "error",
  );
  if (args.chatStatus === "ready" && !hasActiveOrErroredTask) {
    return null;
  }

  const orderedTasks = [...nativeState.tasks].sort((left, right) => {
    return TASK_STATUS_PRIORITY[left.status] - TASK_STATUS_PRIORITY[right.status];
  });
  const visibleTasks = orderedTasks.filter((task) => !isInternalBootstrapTask(task));
  const visibleActiveTask = pickCurrentTask(
    visibleTasks.filter(
      (task) =>
        task.status === "pending" ||
        task.status === "in_progress" ||
        task.status === "error",
    ),
  );
  const currentTask = visibleActiveTask ?? pickCurrentTask(orderedTasks);
  const currentTaskId = currentTask?.id ?? null;
  const tasksForDisplay =
    visibleTasks.length > 0 && visibleActiveTask
      ? visibleTasks
      : visibleTasks.length > 0 &&
          !orderedTasks.some(
            (task) =>
              isInternalBootstrapTask(task) &&
              (task.status === "pending" ||
                task.status === "in_progress" ||
                task.status === "error"),
          )
        ? visibleTasks
        : currentTask
          ? [currentTask]
          : [];

  return {
    currentTaskId,
    previewText: formatPreviewText(currentTask),
    tasks: tasksForDisplay.map((task) => ({
      ...createComposerTaskItem(task),
      isCurrent: task.id === currentTaskId,
    })),
    tone: resolveTone({
      chatStatus: args.chatStatus,
      messageStatus: taskMessage.status,
      tasks: orderedTasks,
    }),
  };
}
