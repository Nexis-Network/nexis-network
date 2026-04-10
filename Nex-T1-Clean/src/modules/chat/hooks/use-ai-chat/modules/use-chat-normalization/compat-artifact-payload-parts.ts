import type { AssistantPayload } from "@/components/dashboard/chat-types";
import { normalizeAIEventPayload } from "@/modules/chat/stream/aievent-contract";
import { isRightPanelOnlyArtifactType } from "@/modules/chat/artifact-surfaces";
import type { CompatMessageAccumulator } from "./compat-state";
import { isRecord } from "./guards";
import type { MessagePart } from "./types";

export function processGenericPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  const raw = part.data ?? part.output ?? part.result;
  if (!isRecord(raw)) {
    return true;
  }

  accumulator.payloads.push((normalizeAIEventPayload(raw) ?? raw) as AssistantPayload);
  return true;
}

export function processArtifactPayload(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  const artifactType = part.type.replace(/^data-artifact-/, "");
  if (isRightPanelOnlyArtifactType(artifactType)) {
    return true;
  }

  const raw = part.data ?? part.output ?? part.result;
  if (!isRecord(raw)) {
    return true;
  }

  const artifactPayload = "payload" in raw ? raw.payload : raw;
  if (artifactType === "table-editor" && artifactPayload) {
    accumulator.payloads.push({ type: "table-editor", data: artifactPayload });
    return true;
  }

  if (artifactType === "market-terminal" && artifactPayload) {
    accumulator.payloads.push({ type: "market-terminal", data: artifactPayload });
    return true;
  }

  if (
    artifactType === "image-artifact" &&
    isRecord(artifactPayload) &&
    typeof artifactPayload.url === "string"
  ) {
    accumulator.payloads.push({
      type: "image-artifact",
      url: artifactPayload.url,
      prompt:
        typeof artifactPayload.prompt === "string"
          ? artifactPayload.prompt
          : "Generated image",
      ...(typeof artifactPayload.revisedPrompt === "string"
        ? { revisedPrompt: artifactPayload.revisedPrompt }
        : {}),
    });
    return true;
  }

  if (artifactType === "file-analysis" && isRecord(artifactPayload)) {
    accumulator.payloads.push({
      type: "file-analysis",
      filename:
        typeof artifactPayload.filename === "string"
          ? artifactPayload.filename
          : "Attachment",
      fileType:
        typeof artifactPayload.fileType === "string"
          ? artifactPayload.fileType
          : "unknown",
      summary:
        typeof artifactPayload.summary === "string"
          ? artifactPayload.summary
          : "File analyzed.",
      ...(Array.isArray(artifactPayload.keyPoints)
        ? { keyPoints: artifactPayload.keyPoints as string[] }
        : {}),
      ...(typeof artifactPayload.fullText === "string"
        ? { fullText: artifactPayload.fullText }
        : {}),
    });
    return true;
  }

  if (isRecord(artifactPayload) && typeof artifactPayload.type === "string") {
    accumulator.payloads.push(artifactPayload as AssistantPayload);
    return true;
  }

  accumulator.payloads.push({
    type: artifactType,
    data: artifactPayload,
  } as AssistantPayload);
  return true;
}
