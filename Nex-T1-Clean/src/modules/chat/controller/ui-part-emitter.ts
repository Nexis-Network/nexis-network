import type { UIMessageStreamWriter } from "ai";

import {
  isAIEventType,
  normalizeAIEventPayload,
} from "@/modules/chat/stream/aievent-contract";
import { extractNativeMessageState } from "@/modules/chat/ui-message-parts";

type NativePart = Record<string, UntypedJson> & {
  type: string;
};

function toSignature(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDedicatedWorkflowCanvas(
  workflowCanvas: UntypedJson,
): workflowCanvas is Record<string, UntypedJson> & { kind: "transaction" | "bridge" } {
  if (!isRecord(workflowCanvas)) {
    return false;
  }

  return (
    workflowCanvas.kind === "transaction" ||
    workflowCanvas.kind === "bridge"
  );
}

/** The writer accepts UIMessageChunk, but custom `data-*` parts can't be
 *  proven statically to match the DataUIMessageChunk generic. This type
 *  extracts the writer's actual parameter so we cast to it exactly once. */
type WriterChunk = Parameters<UIMessageStreamWriter["write"]>[0];

export class ChatUIMessagePartEmitter {
  private readonly nativeSourceParts: NativePart[] = [];
  private lastIdeSessionSignature: string | null = null;
  private lastWorkflowCanvasSignature: string | null = null;
  private lastQueueSignature: string | null = null;
  private lastTestResultsSignature: string | null = null;
  private readonly taskSignatures = new Map<string, string>();
  private readonly artifactCardSignatures = new Map<string, string>();

  constructor(
    private readonly writer: UIMessageStreamWriter,
  ) {}

  /** Single cast point for writing data-* chunks to the SDK stream writer. */
  private writeChunk(chunk: NativePart) {
    this.writer.write(chunk as WriterChunk);
  }

  emitEvent(type: string, data: UntypedJson) {
    if (type === "payloads") {
      const payloads = Array.isArray(data)
        ? data
        : isRecord(data) && Array.isArray(data.payloads)
          ? data.payloads
          : [];

      for (const payload of payloads) {
        if (isRecord(payload)) {
          this.emitPayload(payload);
        }
      }
      return;
    }

    if (!isAIEventType(type)) {
      return;
    }

    const payload = isRecord(data)
      ? { type, ...data }
      : { type, value: data };

    this.emitPayload(payload);
  }

  emitPayload(payload: Record<string, UntypedJson>) {
    const part = this.toPart(payload);
    if (!part) {
      return;
    }

    this.writePart(part);
  }

  private toPart(
    payload: Record<string, UntypedJson>,
  ): NativePart | null {
    const payloadType =
      typeof payload.type === "string" ? payload.type : null;

    if (payloadType?.startsWith("data-")) {
      return payload as NativePart;
    }

    const normalizedEvent = normalizeAIEventPayload(payload);
    if (normalizedEvent) {
      return {
        type: "data-aievent",
        data: normalizedEvent as UntypedJson,
      };
    }

    return {
      type: "data-payload",
      data: payload,
    };
  }

  private writePart(part: NativePart) {
    this.writeChunk(part);
    this.emitCanonicalStateForPart(part);
  }

  private emitCanonicalStateForPart(part: NativePart) {
    if (part.type === "data-ide-session" && isRecord(part.data)) {
      this.lastIdeSessionSignature = toSignature(part.data);
    }

    if (part.type === "data-workflow-canvas" && isRecord(part.data)) {
      this.lastWorkflowCanvasSignature = toSignature(part.data);
    }

    this.nativeSourceParts.push(part);

    const state = extractNativeMessageState(this.nativeSourceParts);

    if (state.ideSession) {
      const signature = toSignature(state.ideSession);
      if (signature !== this.lastIdeSessionSignature) {
        this.lastIdeSessionSignature = signature;
        this.writeChunk({
          type: "data-ide-session",
          data: state.ideSession,
        });
      }
    }

    if (isDedicatedWorkflowCanvas(state.workflowCanvas)) {
      const signature = toSignature(state.workflowCanvas);
      if (signature !== this.lastWorkflowCanvasSignature) {
        this.lastWorkflowCanvasSignature = signature;
        this.writeChunk({
          type: "data-workflow-canvas",
          data: state.workflowCanvas,
        });
      }
    }

    if (state.queue) {
      const signature = toSignature(state.queue);
      if (signature !== this.lastQueueSignature) {
        this.lastQueueSignature = signature;
        this.writeChunk({
          type: "data-queue",
          data: state.queue,
        });
      }
    }

    if (state.testResults) {
      const signature = toSignature(state.testResults);
      if (signature !== this.lastTestResultsSignature) {
        this.lastTestResultsSignature = signature;
        this.writeChunk({
          type: "data-test-results",
          data: state.testResults,
        });
      }
    }

    for (const task of state.tasks) {
      const signature = toSignature(task);
      if (this.taskSignatures.get(task.id) === signature) {
        continue;
      }

      this.taskSignatures.set(task.id, signature);
      this.writeChunk({
        type: "data-task",
        data: task,
      });
    }

    for (const artifactCard of state.artifactCards) {
      const key = `${artifactCard.artifactType}:${artifactCard.artifactId}`;
      const signature = toSignature(artifactCard);
      if (this.artifactCardSignatures.get(key) === signature) {
        continue;
      }

      this.artifactCardSignatures.set(key, signature);
      this.writeChunk({
        type: "data-artifact-card",
        data: artifactCard,
      });
    }
  }
}
