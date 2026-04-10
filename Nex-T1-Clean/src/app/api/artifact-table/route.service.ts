import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

import { TableEditorArtifact } from "@/lib/table-editor/ai/artifacts/table-editor";
import {
  createTableEditorContext,
  type TableEditorContextController,
} from "@/lib/table-editor/ai/context";
import { createTableEditorTools } from "@/lib/table-editor/ai/tools/table-editor";
import type { TableEditorData } from "@/lib/table-editor/ai/types";
import { logger } from "@/lib/logger";

import { artifactTableSystemPrompt } from "./route.prompt";

type CreateArtifactTableStreamResponseArgs = {
  messages: UIMessage[];
  userId: string;
};

export function createArtifactTableStreamResponse({
  messages,
  userId,
}: CreateArtifactTableStreamResponseArgs): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const tableEditorContext = createTableEditorContext({
        writer,
        userId,
        fullName: "Table Editor User",
      });
      const { addDataTool, tableEditorTool } =
        createTableEditorTools(tableEditorContext);

      hydrateContextFromMessages(messages, tableEditorContext);

      const result = streamText({
        model: "openai/gpt-4.1",
        system: artifactTableSystemPrompt,
        messages: await convertToModelMessages(messages),
        tools: {
          tableEditor: tableEditorTool,
          addData: addDataTool,
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function hydrateContextFromMessages(
  messages: UIMessage[],
  tableEditorContext: TableEditorContextController,
): void {
  const latestArtifact = extractLatestTableArtifact(messages);
  if (!latestArtifact || typeof latestArtifact !== "object") {
    return;
  }

  try {
    const artifact = latestArtifact as {
      id?: string;
      version?: number;
      payload?: UntypedJson;
    };
    const payload = TableEditorArtifact.validate(
      artifact.payload ?? {},
    ) as TableEditorData;

    tableEditorContext.setCurrentArtifactData({
      artifactId: artifact.id,
      artifactVersion: artifact.version ?? payload.versions?.length ?? 0,
      title: payload.title,
      csvContent: payload.csvContent,
      summary: payload.summary,
      operations: payload.operations ?? [],
      versions: payload.versions ?? [],
      stage: payload.stage ?? "complete",
      progress: payload.progress ?? 1,
    });
  } catch (error) {
    logger.warn("Failed to hydrate artifact context", error);
  }
}

function extractLatestTableArtifact(messages: UIMessage[]): UntypedJson | null {
  const artifactsById = new Map<string, UntypedJson>();
  const artifactType = `data-artifact-${TableEditorArtifact.id}`;

  const visitParts = (parts: UntypedJson): void => {
    if (!Array.isArray(parts)) {
      return;
    }

    for (const part of parts) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const typedPart = part as {
        type?: string;
        data?: UntypedJson;
        result?: { parts?: UntypedJson[] };
      };

      if (typedPart.type === artifactType && typedPart.data) {
        const data = typedPart.data as { id?: string; version?: number };
        if (data.id) {
          const current = artifactsById.get(data.id) as
            | { version?: number }
            | undefined;

          if (!current || (data.version ?? 0) > (current.version ?? 0)) {
            artifactsById.set(data.id, typedPart.data);
          }
        }
      }

      if (typedPart.type?.startsWith("tool-") && typedPart.result?.parts) {
        visitParts(typedPart.result.parts);
      }
    }
  };

  for (const message of messages) {
    visitParts((message as { parts?: UntypedJson[] }).parts);
  }

  const artifacts = Array.from(artifactsById.values()).sort((left, right) => {
    const leftData = left as { createdAt?: number };
    const rightData = right as { createdAt?: number };
    return (rightData.createdAt ?? 0) - (leftData.createdAt ?? 0);
  });

  return artifacts[0] ?? null;
}
