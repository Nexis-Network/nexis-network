import type {
  CreateNormalizedMessage,
  CreateProject,
  CreateTemplateId,
  CreateWorkspace,
} from "./types";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    details?: UntypedJson;
    message?: string;
  };
  success: boolean;
};

type CreateMutationPayload = {
  messages: CreateNormalizedMessage[];
  project: CreateProject;
};

async function readApiEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (response.ok && payload?.success && payload.data !== undefined) {
    return payload.data;
  }

  throw new Error(
    payload?.error?.message ||
      `Create builder request failed with status ${response.status}.`,
  );
}

export async function fetchCreateWorkspace(): Promise<CreateWorkspace> {
  const response = await fetch("/api/create/projects", { cache: "no-store" });
  return readApiEnvelope<CreateWorkspace>(response);
}

export async function fetchCreateMessages(
  projectId: string,
): Promise<CreateNormalizedMessage[]> {
  const response = await fetch(`/api/create/projects/${projectId}/messages`, {
    cache: "no-store",
  });
  const payload = await readApiEnvelope<{ messages: CreateNormalizedMessage[] }>(
    response,
  );
  return payload.messages;
}

export async function createProjectRequest(input: {
  prompt: string;
  stream: boolean;
  templateId: CreateTemplateId;
}): Promise<CreateMutationPayload> {
  const response = await fetch("/api/create/projects", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readApiEnvelope<CreateMutationPayload>(response);
}

export async function sendCreateMessageRequest(input: {
  projectId: string;
  prompt: string;
  stream: boolean;
}): Promise<CreateMutationPayload> {
  const response = await fetch(`/api/create/projects/${input.projectId}/messages`, {
    body: JSON.stringify({
      prompt: input.prompt,
      stream: input.stream,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readApiEnvelope<CreateMutationPayload>(response);
}

export async function claimCreateProjectRequest(
  projectId: string,
): Promise<CreateProject> {
  const response = await fetch(`/api/create/projects/${projectId}/claim`, {
    method: "POST",
  });
  const payload = await readApiEnvelope<{ project: CreateProject }>(response);
  return payload.project;
}
