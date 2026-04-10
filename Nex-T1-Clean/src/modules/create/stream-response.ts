import "server-only";

import { normalizeV0Error } from "@/lib/v0/errors";

import { CreateServiceError } from "./errors";
import { serializeCreateMessages, serializeCreateProject } from "./query-service";
import type { CreateMessageRecord, CreateProjectRecord } from "./types";

function extractDelta(data: string): string {
  const trimmed = data.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as
      | string
      | { delta?: string; text?: string; content?: string; data?: string };

    if (typeof parsed === "string") {
      return parsed;
    }

    return parsed.delta ?? parsed.text ?? parsed.content ?? parsed.data ?? trimmed;
  } catch {
    return data;
  }
}

function buildEventLine(payload: UntypedJson): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export function createCreateStreamResponse(args: {
  initialEvent?: UntypedJson;
  rateLimitHeaders: Record<string, string>;
  syncAfter: () => Promise<{
    messages: CreateMessageRecord[];
    project: CreateProjectRecord;
  }>;
  upstream: ReadableStream<Uint8Array>;
}): Response {
  const upstreamReader = args.upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (args.initialEvent) {
        controller.enqueue(buildEventLine(args.initialEvent));
      }

      try {
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            const payload = line.slice(6);
            if (payload === "[DONE]") {
              continue;
            }

            const delta = extractDelta(payload);
            if (delta) {
              controller.enqueue(buildEventLine({ type: "assistant-delta", delta }));
            }
          }
        }

        const synced = await args.syncAfter();
        controller.enqueue(
          buildEventLine({
            type: "done",
            messages: serializeCreateMessages(synced.messages),
            project: serializeCreateProject(synced.project),
          }),
        );
      } catch (error) {
        const normalized = error instanceof CreateServiceError ? error : normalizeV0Error(error);
        controller.enqueue(
          buildEventLine({
            type: "error",
            code: normalized.code,
            message: normalized.message,
          }),
        );
      } finally {
        controller.close();
        upstreamReader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      ...args.rateLimitHeaders,
    },
  });
}
