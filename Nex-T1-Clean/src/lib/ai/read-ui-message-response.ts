import {
  parseJsonEventStream,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from "ai";
import type { ParseResult } from "@ai-sdk/provider-utils";

function toUIMessageChunkStream(
  stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
): ReadableStream<UIMessageChunk> {
  return parseJsonEventStream({
    stream,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream<ParseResult<UIMessageChunk>, UIMessageChunk>({
      transform(part, controller) {
        if (!part.success) {
          controller.error(part.error);
          return;
        }

        controller.enqueue(part.value);
      },
    }),
  );
}

export function readUIMessageResponse<UI_MESSAGE extends UIMessage>({
  response,
  message,
  onError,
  terminateOnError = true,
}: {
  response: Response;
  message?: UI_MESSAGE;
  onError?: (error: unknown) => void;
  terminateOnError?: boolean;
}) {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("The response body is empty.");
  }

  return readUIMessageStream<UI_MESSAGE>({
    message,
    onError,
    terminateOnError,
    stream: toUIMessageChunkStream(response.body),
  });
}
