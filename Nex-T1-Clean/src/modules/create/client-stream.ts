import type { CreateNormalizedMessage, CreateProject, CreateTemplateId } from "./types";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
  success: boolean;
};

export type CreateStreamEvent =
  | {
      type: "assistant-delta";
      delta: string;
    }
  | {
      type: "done";
      messages: CreateNormalizedMessage[];
      project: CreateProject;
    }
  | {
      type: "error";
      code?: string;
      message: string;
    }
  | {
      type: "project";
      projectId: string;
    };

async function assertEventStream(response: Response): Promise<ReadableStream<Uint8Array>> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<UntypedJson> | null;
    throw new Error(
      payload?.error?.message ||
        `Create builder request failed with status ${response.status}.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    throw new Error("Expected a streaming response from the create builder.");
  }

  return response.body;
}

export async function readCreateStream(
  response: Response,
  onEvent: (event: CreateStreamEvent) => void,
): Promise<void> {
  const body = await assertEventStream(response);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
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

      const raw = line.slice(6).trim();
      if (raw) {
        onEvent(JSON.parse(raw) as CreateStreamEvent);
      }
    }
  }
}

export async function createProjectStreamRequest(input: {
  prompt: string;
  templateId: CreateTemplateId;
}): Promise<Response> {
  return fetch("/api/create/projects", {
    body: JSON.stringify({
      prompt: input.prompt,
      stream: true,
      templateId: input.templateId,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function sendCreateMessageStreamRequest(input: {
  projectId: string;
  prompt: string;
}): Promise<Response> {
  return fetch(`/api/create/projects/${input.projectId}/messages`, {
    body: JSON.stringify({
      prompt: input.prompt,
      stream: true,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
