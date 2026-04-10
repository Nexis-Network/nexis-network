import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamOnFinishCallback,
} from "ai";
import { nanoid } from "nanoid";

import type { Source } from "@/lib/schema";

type CreateUIMessageStreamResponseOptions = Parameters<
  typeof createUIMessageStreamResponse
>[0];

type ImmediateStreamResponseOptions = {
  message: string;
  originalMessages?: UIMessage[];
  sources?: Source[];
  onFinish?: UIMessageStreamOnFinishCallback<UIMessage>;
  consumeSseStream?: CreateUIMessageStreamResponseOptions["consumeSseStream"];
  headers?: HeadersInit;
  status?: number;
  statusText?: string;
};

export function createImmediateStreamResponse({
  message,
  originalMessages,
  sources = [],
  onFinish,
  consumeSseStream,
  headers,
  status,
  statusText,
}: ImmediateStreamResponseOptions): Response {
  const stream = createUIMessageStream({
    originalMessages,
    onFinish,
    generateId: () => nanoid(),
    execute({ writer }) {
      const textPartId = nanoid();

      const emit = (chunk: UIMessageChunk) => writer.write(chunk);

      emit({ type: "text-start", id: textPartId });
      emit({ type: "text-delta", id: textPartId, delta: message });
      emit({ type: "text-end", id: textPartId });

      for (const source of sources) {
        const sourceId =
          source.id ?? `${source.url ?? ""}-${source.title ?? "source"}`;
        const isDocument = Boolean(source.filename || source.mediaType);

        if (isDocument) {
          emit({
            type: "source-document",
            sourceId,
            mediaType: source.mediaType ?? "application/octet-stream",
            title: source.title ?? source.filename ?? "Document",
            filename: source.filename,
          });
          continue;
        }

        emit({
          type: "source-url",
          sourceId,
          url: source.url ?? "",
          title: source.title ?? source.url ?? "Source",
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    consumeSseStream,
    headers,
    status,
    statusText,
  });
}
