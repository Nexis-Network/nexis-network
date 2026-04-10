import { deriveStructuredFallbackText } from "@/modules/chat/ui-fallback-text";
import { extractNativeMessageState } from "@/modules/chat/ui-message-parts";

type MessageLike = {
  role?: string | null;
  content?: string | null;
  parts?: Array<unknown> | null;
};

type MessagePart = {
  type?: unknown;
  text?: unknown;
};

function getParts(parts: MessageLike["parts"]): MessagePart[] {
  return Array.isArray(parts) ? (parts as MessagePart[]) : [];
}

function isProgressPlaceholderContent(content: string): boolean {
  return /^(Task in progress:|Working on |Thinking through the request\.|Preparing response and tool context\.|Loading context, prompts, and tools\.|Running .+\.$|Streaming sandbox output\.|Using .+\.$|Completed tool call: .+\.$|Approval state updated\.|Response ready\.)/.test(
    content,
  );
}

function hasVisibleTextPart(parts: MessagePart[]): boolean {
  return parts.some((part) => {
    if (
      part.type !== "text" &&
      part.type !== "text-delta" &&
      part.type !== "error"
    ) {
      return false;
    }

    return typeof part.text === "string" && part.text.trim().length > 0;
  });
}

function hasProgressSignals(parts: MessagePart[]): boolean {
  const nativeState = extractNativeMessageState(parts);
  const latestEventType = nativeState.latestEvent?.type;
  const hasReasoningPart = parts.some(
    (part) => part.type === "reasoning" || part.type === "data-reasoning",
  );
  const taskCount = Array.isArray(nativeState.tasks) ? nativeState.tasks.length : 0;
  const queueCount = Array.isArray(nativeState.queue) ? nativeState.queue.length : 0;

  return (
    hasReasoningPart ||
    taskCount > 0 ||
    queueCount > 0 ||
    latestEventType === "reasoning_update" ||
    latestEventType === "task_update" ||
    latestEventType === "workflow_update"
  );
}

function hasRenderableStructuredSurface(parts: MessagePart[]): boolean {
  const nativeState = extractNativeMessageState(parts);

  return Boolean(
    nativeState.ideSession ||
      nativeState.workflowCanvas ||
      (Array.isArray(nativeState.ideArtifacts) &&
        nativeState.ideArtifacts.length > 0) ||
      (Array.isArray(nativeState.artifactCards) &&
        nativeState.artifactCards.length > 0) ||
      nativeState.testResults?.items?.length,
  );
}

export function isTransientProgressAssistantMessage(
  message: MessageLike,
): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  const parts = getParts(message.parts);
  if (parts.length === 0) {
    return false;
  }

  if (hasVisibleTextPart(parts) || hasRenderableStructuredSurface(parts)) {
    return false;
  }

  if (!hasProgressSignals(parts)) {
    return false;
  }

  const fallbackText = deriveStructuredFallbackText({
    role: "assistant",
    content: "",
    parts,
  });
  const content =
    typeof message.content === "string" ? message.content.trim() : "";

  return (
    !content ||
    content === fallbackText ||
    isProgressPlaceholderContent(content)
  );
}

export function collapseTransientProgressAssistantMessages<T extends MessageLike>(
  messages: T[],
): T[] {
  return messages.filter((message, index) => {
    if (!isTransientProgressAssistantMessage(message)) {
      return true;
    }

    for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
      if (messages[cursor]?.role === "assistant") {
        return false;
      }
    }

    return true;
  });
}
