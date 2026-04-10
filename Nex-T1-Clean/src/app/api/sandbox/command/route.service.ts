import { Sandbox } from "@e2b/code-interpreter";

import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/logger";

type RunSandboxCommandArgs = {
  command: string;
  e2bApiKey: string;
  sandboxId: string;
  stream: boolean;
};

function createSandboxEventStream(command: string, sandbox: Sandbox): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      const sendEvent = (event: string, data: Record<string, UntypedJson>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`),
        );
      };

      void (async () => {
        try {
          sendEvent("start", { command });
          const result = await sandbox.commands.run(command, {
            background: false,
            timeoutMs: 300_000,
            onStdout: (chunk: string) => {
              if (chunk) {
                sendEvent("stdout", { chunk });
              }
            },
            onStderr: (chunk: string) => {
              if (chunk) {
                sendEvent("stderr", { chunk });
              }
            },
          });
          sendEvent("complete", { result });
        } catch (error: UntypedJson) {
          const message = getErrorMessage(error, "Command execution failed");
          logger.error("[sandbox/command:stream] Error:", message);
          sendEvent("error", { message });
        } finally {
          controller.close();
        }
      })();
    },
  });
}

export async function runSandboxCommand({
  command,
  e2bApiKey,
  sandboxId,
  stream,
}: RunSandboxCommandArgs): Promise<Response | { result: UntypedJson }> {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: e2bApiKey });

  if (!stream) {
    const result = await sandbox.commands.run(command, {
      background: command.includes("dev") || command.includes("start"),
    });

    return { result };
  }

  return new Response(createSandboxEventStream(command, sandbox), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
