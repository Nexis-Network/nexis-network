import type { AssistantPayload } from "@/components/dashboard/chat-types";
import { isRightPanelOnlyArtifactType } from "@/modules/chat/artifact-surfaces";
import {
  extractNativeMessageState,
  type NativeArtifactCardData,
  type NativeTaskData,
  type NativeTestResultItem,
} from "@/modules/chat/ui-message-parts";

type DeriveCompatPayloadOptions = {
  includeRightPanelArtifacts?: boolean;
};

export function deriveCompatPayloadFromArtifactData(
  artifactType: string,
  artifactPayload: UntypedJson,
  options: DeriveCompatPayloadOptions = {},
): AssistantPayload | null {
  if (
    !options.includeRightPanelArtifacts &&
    isRightPanelOnlyArtifactType(artifactType)
  ) {
    return null;
  }

  if (artifactType === "table-editor" && artifactPayload) {
    return {
      type: "table-editor",
      data: artifactPayload,
    };
  }

  if (artifactType === "market-terminal" && artifactPayload) {
    return {
      type: "market-terminal",
      data: artifactPayload,
    };
  }

  if (
    artifactType === "image-artifact" &&
    artifactPayload &&
    typeof artifactPayload === "object" &&
    typeof (artifactPayload as { url?: UntypedJson }).url === "string"
  ) {
    const image = artifactPayload as {
      url: string;
      prompt?: string;
      revisedPrompt?: string;
    };

    return {
      type: "image-artifact",
      url: image.url,
      prompt: image.prompt ?? "Generated image",
      ...(typeof image.revisedPrompt === "string"
        ? { revisedPrompt: image.revisedPrompt }
        : {}),
    };
  }

  if (
    artifactType === "file-analysis" &&
    artifactPayload &&
    typeof artifactPayload === "object"
  ) {
    const file = artifactPayload as {
      filename?: string;
      fileType?: string;
      summary?: string;
      keyPoints?: string[];
      fullText?: string;
    };

    return {
      type: "file-analysis",
      filename: file.filename ?? "Attachment",
      fileType: file.fileType ?? "unknown",
      summary: file.summary ?? "File analyzed.",
      ...(Array.isArray(file.keyPoints) ? { keyPoints: file.keyPoints } : {}),
      ...(typeof file.fullText === "string" ? { fullText: file.fullText } : {}),
    };
  }

  if (
    artifactPayload &&
    typeof artifactPayload === "object" &&
    typeof (artifactPayload as { type?: UntypedJson }).type === "string"
  ) {
    return artifactPayload as AssistantPayload;
  }

  return {
    type: artifactType,
    data: artifactPayload,
  } as AssistantPayload;
}

function mapNativeArtifactCardToCompatPayload(
  artifactCard: NativeArtifactCardData,
  options: DeriveCompatPayloadOptions,
): AssistantPayload | null {
  return deriveCompatPayloadFromArtifactData(
    artifactCard.artifactType,
    artifactCard.data as UntypedJson,
    options,
  );
}

function mapNativeTaskToCompatPayload(task: NativeTaskData): AssistantPayload {
  return {
    type: "task_update",
    taskId: task.id,
    title: task.title,
    status: task.status,
    ...(task.description ? { description: task.description } : {}),
  };
}

function mapNativeTestResultToCompatPayload(
  item: NativeTestResultItem,
): AssistantPayload {
  return {
    type: "test_result",
    testId: item.id,
    name: item.name,
    status: item.status,
    ...(item.summary
      ? {
          metadata: {
            summary: item.summary,
          },
        }
      : {}),
  };
}

export function deriveCompatPayloadsFromParts(
  parts: Array<unknown> | undefined,
  options: DeriveCompatPayloadOptions = {},
): AssistantPayload[] {
  const nativeState = extractNativeMessageState(parts);

  return [
    ...nativeState.ideArtifacts
      .map((artifactCard) =>
        mapNativeArtifactCardToCompatPayload(artifactCard, options),
      )
      .filter((payload): payload is AssistantPayload => Boolean(payload)),
    ...nativeState.artifactCards
      .map((artifactCard) =>
        mapNativeArtifactCardToCompatPayload(artifactCard, options),
      )
      .filter((payload): payload is AssistantPayload => Boolean(payload)),
    ...nativeState.tasks.map(mapNativeTaskToCompatPayload),
    ...(nativeState.testResults?.items.map(mapNativeTestResultToCompatPayload) ?? []),
  ];
}
