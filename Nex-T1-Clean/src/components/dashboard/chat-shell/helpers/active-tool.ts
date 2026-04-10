import type {
  AssistantPayload,
  ConversationMessage,
} from "@/components/dashboard/chat-types";
import type { AIEvent } from "@/lib/schema";
import type { ToolUIPart } from "ai";
import { isAIEventType } from "@/modules/chat/stream/aievent-contract";
import {
  extractNativeMessageState,
  extractNativePayloadState,
  getChatToolPartCallId,
  getChatToolPartInput,
  getChatToolPartName,
  getChatToolPartOutput,
  getChatToolPartState,
  isChatToolUIPart,
  type NativeIdeSessionData,
  type NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";

type ToolExecutionPayload = Extract<
  NonNullable<ConversationMessage["payloads"]>[number],
  { type: "tool-execution" }
>;

const WORKBENCH_ARTIFACT_TYPES = new Set<string>([
  "code",
  "preview",
  "web",
  "canvas",
  "html",
  "pdf-viewer",
  "smart-contract-viewer",
  "transaction-flow",
  "polymarket-widget",
  "polymarket-markets",
  "polymarket-market-detail",
  "polymarket-orderbook",
  "polymarket-price-chart",
  "polymarket-price-data",
  "polymarket-positions",
  "polymarket-trades",
  "polymarket-trade-preview",
  "polymarket-order-status",
  "polymarket-bridge-status",
  "polymarket-deposit-info",
  "polymarket-supported-assets",
  "polymarket-balance",
  "polymarket-blocked",
  "polymarket-error",
]);

const TERMINAL_APPROVAL_STATES = new Set<string>([
  "approved",
  "auto_approved",
  "rejected",
  "denied",
  "expired",
  "cancelled",
  "completed",
  "error",
  "failed",
  "ready",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDedicatedWorkflowCanvas = (
  workflowCanvas: NativeWorkflowCanvasData | null | undefined,
): workflowCanvas is NativeWorkflowCanvasData & { kind: "transaction" | "bridge" } =>
  Boolean(
    workflowCanvas &&
      (workflowCanvas.kind === "transaction" || workflowCanvas.kind === "bridge"),
  );

export type ActiveToolInvocation = {
  toolCallId: string;
  toolName: string;
  state: "call" | "partial-call" | "result";
  args?: UntypedJson;
  result?: UntypedJson;
};

const hasErrorResult = (result: UntypedJson | undefined): boolean => {
  if (!isRecord(result)) return false;
  return (
    typeof result.error === "string" ||
    typeof result.errorText === "string" ||
    result.isError === true
  );
};

export function isActiveToolInvocation(
  tool: ActiveToolInvocation | null | undefined,
): boolean {
  if (!tool) return false;

  if (tool.state === "call" || tool.state === "partial-call") {
    return true;
  }

  // Keep tool results with errors visible/active for user follow-up.
  return hasErrorResult(tool.result);
}

export function isActiveAIEvent(event: AIEvent | null | undefined): boolean {
  if (!event) return false;

  switch (event.type) {
    case "reasoning_update":
      return !event.isComplete;
    case "artifact_update":
      return event.status === "pending" || event.status === "running";
    case "approval_required":
      return true;
    case "approval_update": {
      const state =
        typeof event.state === "string" ? event.state.toLowerCase() : "";
      return !state || !TERMINAL_APPROVAL_STATES.has(state);
    }
    case "sandbox_start":
    case "sandbox_stream":
      return true;
    case "terminal_stream":
      return !event.isComplete;
    case "workflow_update":
      return event.status === "pending" || event.status === "running";
    case "task_update":
      return event.status === "pending" || event.status === "in_progress";
    case "confirmation_request":
      return true;
    case "agent_handoff":
      return true;
    case "transcription_output":
      return !event.isFinal;
    default:
      return false;
  }
}

const normalizeToolState = (
  value: unknown,
): ActiveToolInvocation["state"] => {
  if (value === "partial-call") return "partial-call";
  if (value === "result") return "result";
  return "call";
};

function getNestedPartCollections(part: unknown): Array<unknown[]> {
  if (!isRecord(part)) {
    return [];
  }

  const nestedCollections: Array<unknown[]> = [];

  if (Array.isArray(part.parts)) {
    nestedCollections.push(part.parts);
  }

  for (const key of ["data", "output", "result"] as const) {
    const value = part[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Array.isArray((value as { parts?: unknown[] }).parts)
    ) {
      nestedCollections.push((value as { parts: unknown[] }).parts);
    }
  }

  return nestedCollections;
}

function resolveToolStateFromPart(part: unknown): ActiveToolInvocation["state"] {
  const partType =
    isRecord(part) && typeof part.type === "string" ? part.type : "";
  const partState = isChatToolUIPart(part) ? getChatToolPartState(part) : null;

  if (
    partType === "tool-result" ||
    partType === "data-tool-result" ||
    partState === "result" ||
    partState === "output-available" ||
    partState === "complete" ||
    partState === "completed" ||
    partState === "done" ||
    partState === "output-error" ||
    partState === "error"
  ) {
    return "result";
  }

  if (
    partState === "partial-call" ||
    partState === "input-streaming" ||
    partState === "streaming"
  ) {
    return "partial-call";
  }

  if (
    isChatToolUIPart(part) &&
    getChatToolPartOutput(part) !== null &&
    getChatToolPartOutput(part) !== undefined
  ) {
    return "result";
  }

  return "call";
}

function collectToolInvocationsFromParts(
  parts: ConversationMessage["parts"] | undefined,
  collected: ActiveToolInvocation[],
): void {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const part of parts) {
    if (isChatToolUIPart(part)) {
      const toolName = getChatToolPartName(part);
      const toolCallId =
        getChatToolPartCallId(part) ?? `part-tool-${collected.length}`;
      const args = getChatToolPartInput(part);
      const result = getChatToolPartOutput(part);

      collected.push({
        toolCallId,
        toolName,
        state: resolveToolStateFromPart(part),
        ...(args !== null && args !== undefined
          ? { args: args as UntypedJson }
          : {}),
        ...(result !== null && result !== undefined
          ? { result: result as UntypedJson }
          : {}),
      });
    }

    for (const nestedParts of getNestedPartCollections(part)) {
      collectToolInvocationsFromParts(
        nestedParts as ConversationMessage["parts"],
        collected,
      );
    }
  }
}

export function resolveActiveToolFromMessage(
  message: ConversationMessage | undefined,
): ActiveToolInvocation | null {
  if (!message || message.role !== "assistant") {
    return null;
  }

  const directToolInvocations = Array.isArray(message.toolInvocations)
    ? message.toolInvocations
    : [];
  if (directToolInvocations.length > 0) {
    const latest = directToolInvocations[directToolInvocations.length - 1] as
      | Record<string, unknown>
      | undefined;
    if (!latest) return null;
    const toolCallId =
      typeof latest.toolCallId === "string" && latest.toolCallId.length > 0
        ? latest.toolCallId
        : `tool-${directToolInvocations.length}`;
    const toolName =
      typeof latest.toolName === "string" && latest.toolName.length > 0
        ? latest.toolName
        : "tool";
    const state = normalizeToolState(latest.state);
    return {
      toolCallId,
      toolName,
      state,
      ...(latest.args !== undefined ? { args: latest.args as UntypedJson } : {}),
      ...(latest.result !== undefined
        ? { result: latest.result as UntypedJson }
        : {}),
    };
  }

  const partToolInvocations: ActiveToolInvocation[] = [];
  collectToolInvocationsFromParts(message.parts, partToolInvocations);
  if (partToolInvocations.length > 0) {
    return partToolInvocations[partToolInvocations.length - 1] ?? null;
  }

  const payloads = Array.isArray(message.payloads) ? message.payloads : [];

  const payloadToolInvocations = payloads
        .filter(
          (payload): payload is ToolExecutionPayload =>
            payload?.type === "tool-execution",
        )
        .map((payload, index): ActiveToolInvocation => ({
          toolCallId:
            typeof payload.toolCallId === "string" && payload.toolCallId.length > 0
              ? payload.toolCallId
              : `payload-tool-${index}`,
          toolName: payload.toolName,
          state:
            payload.status === "pending" || payload.status === "executing"
              ? "call"
              : "result",
          ...(payload.input !== undefined ? { args: payload.input } : {}),
          ...((payload.status === "error"
            ? { error: payload.error ?? "Tool execution failed" }
            : payload.output) !== undefined
            ? {
                result:
                  payload.status === "error"
                    ? { error: payload.error ?? "Tool execution failed" }
                    : payload.output,
                  }
            : {}),
        }))
    ;

  const latestWorkbenchArtifact = (() => {
    for (let index = payloads.length - 1; index >= 0; index -= 1) {
      const payload = payloads[index] as unknown;
      if (!isRecord(payload) || typeof payload.type !== "string") continue;
      if (!WORKBENCH_ARTIFACT_TYPES.has(payload.type)) continue;

      const artifactPayload =
        isRecord(payload.payload)
          ? payload.payload
          : isRecord(payload.data)
            ? payload.data
            : payload;

      return {
        toolCallId: `artifact-${message.id}-${index}`,
        toolName: "emit_artifact",
        state: "result" as const,
        result: {
          artifactType: payload.type,
          payload: artifactPayload as UntypedJson,
        },
      } satisfies ActiveToolInvocation;
    }

    return null;
  })();

  if (payloadToolInvocations.length === 0) {
    return latestWorkbenchArtifact;
  }

  const latestToolInvocation = payloadToolInvocations[payloadToolInvocations.length - 1];
  if (
    latestWorkbenchArtifact &&
    latestToolInvocation.toolName === "emit_artifact" &&
    latestToolInvocation.state !== "result"
  ) {
    return latestWorkbenchArtifact;
  }

  return latestToolInvocation;
}

export function resolveActiveToolFromMessages(
  messages: ConversationMessage[] | undefined,
): ActiveToolInvocation | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  let latestTerminalTool: ActiveToolInvocation | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "assistant") continue;
    const tool = resolveActiveToolFromMessage(message);
    if (!tool) continue;
    if (isActiveToolInvocation(tool)) {
      return tool;
    }
    if (!latestTerminalTool) {
      latestTerminalTool = tool;
    }
  }

  return latestTerminalTool;
}

export function isAIEventPayload(payload: AssistantPayload): payload is AIEvent {
  if (!isRecord(payload)) return false;
  const type = payload.type;
  return typeof type === "string" && isAIEventType(type);
}

export function resolveActiveEventFromMessage(
  message: ConversationMessage | undefined,
): AIEvent | null {
  if (!message || message.role !== "assistant") return null;
  const nativeState = extractNativeMessageState(message.parts);
  if (nativeState.latestEvent) {
    return nativeState.latestEvent;
  }
  const payloads = Array.isArray(message.payloads) ? message.payloads : [];
  const aiEvents = payloads.filter(isAIEventPayload);
  return aiEvents.length > 0 ? aiEvents[aiEvents.length - 1] : null;
}

export function resolveActiveEventFromMessages(
  messages: ConversationMessage[] | undefined,
): AIEvent | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  let latestTerminalEvent: AIEvent | null = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "assistant") continue;
    const event = resolveActiveEventFromMessage(message);
    if (!event) continue;
    if (isActiveAIEvent(event)) {
      return event;
    }
    if (!latestTerminalEvent) {
      latestTerminalEvent = event;
    }
  }

  return latestTerminalEvent;
}

export function toPanelToolPart(
  tool: ActiveToolInvocation | null,
): ToolUIPart | null {
  if (!tool) return null;

  let state: "input-streaming" | "input-available" | "output-available" =
    "input-available";
  if (tool.state === "partial-call") state = "input-streaming";
  if (tool.state === "result") state = "output-available";

  return {
    toolCallId: tool.toolCallId,
    toolName: tool.toolName,
    input: tool.args,
    output: tool.result,
    state,
  } as unknown as ToolUIPart;
}

export function toPanelToolPartFromEvent(event: AIEvent): ToolUIPart | null {
  switch (event.type) {
    case "sandbox_start":
      return {
        toolCallId: `sandbox-${event.sandboxId}`,
        toolName: "sandbox",
        input: { code: event.template },
        state: "input-streaming",
      } as unknown as ToolUIPart;
    case "sandbox_stream":
      return {
        toolCallId: `sandbox-${event.sandboxId}`,
        toolName: "sandbox",
        input: { code: event.data },
        state: "input-streaming",
      } as unknown as ToolUIPart;
    case "terminal_stream":
      return {
        toolCallId: `terminal-${event.command}`,
        toolName: "terminal",
        input: { command: event.command },
        output: { logs: event.output },
        state: event.isComplete ? "output-available" : "input-streaming",
      } as unknown as ToolUIPart;
    default:
      return null;
  }
}

export function resolveActiveIdeSessionFromMessage(
  message: ConversationMessage | undefined,
): NativeIdeSessionData | null {
  if (!message || message.role !== "assistant") {
    return null;
  }

  const nativeState = extractNativeMessageState(message.parts);
  if (nativeState.ideSession) {
    return nativeState.ideSession;
  }

  return extractNativePayloadState(message.payloads).ideSession;
}

export function resolveActiveIdeSessionFromMessages(
  messages: ConversationMessage[] | undefined,
): NativeIdeSessionData | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const session = resolveActiveIdeSessionFromMessage(messages[index]);
    if (session) {
      return session;
    }
  }

  return null;
}

export function resolveActiveWorkflowCanvasFromMessage(
  message: ConversationMessage | undefined,
): NativeWorkflowCanvasData | null {
  if (!message || message.role !== "assistant") {
    return null;
  }

  const nativeState = extractNativeMessageState(message.parts);
  const workflowCanvas =
    nativeState.workflowCanvas ??
    extractNativePayloadState(message.payloads).workflowCanvas;
  return isDedicatedWorkflowCanvas(workflowCanvas) ? workflowCanvas : null;
}

export function resolveActiveWorkflowCanvasFromMessages(
  messages: ConversationMessage[] | undefined,
): NativeWorkflowCanvasData | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const workflowCanvas = resolveActiveWorkflowCanvasFromMessage(messages[index]);
    if (workflowCanvas) {
      return workflowCanvas;
    }
  }

  return null;
}
