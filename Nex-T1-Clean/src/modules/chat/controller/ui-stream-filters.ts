import type { UIMessageChunk } from "ai";

function isReasoningChunk(chunk: UIMessageChunk): boolean {
  return (
    chunk.type === "reasoning-start" ||
    chunk.type === "reasoning-delta" ||
    chunk.type === "reasoning-end"
  );
}

export function stripReasoningUIMessageChunks<
  CHUNK extends UIMessageChunk,
>(stream: ReadableStream<CHUNK>): ReadableStream<CHUNK> {
  return stream.pipeThrough(
    new TransformStream<CHUNK, CHUNK>({
      transform(chunk, controller) {
        if (isReasoningChunk(chunk)) {
          return;
        }

        controller.enqueue(chunk);
      },
    }),
  );
}
