import "server-only";

import { logger } from "@/lib/logger";

import { createV0HttpError, V0ClientError } from "./errors";
import type { V0Chat, V0MessagesResponse, V0Project, V0Version } from "./types";

const DEFAULT_BASE_URL = "https://api.v0.dev/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

type JsonBody = Record<string, unknown>;
type CreateChatBaseInput = {
  message: string;
  projectId: string;
  system?: string;
  metadata?: Record<string, unknown>;
};
type CreateChatSyncInput = CreateChatBaseInput & {
  responseMode?: "sync";
};
type CreateChatStreamInput = CreateChatBaseInput & {
  responseMode: "experimental_stream";
};
type SendMessageBaseInput = {
  chatId: string;
  message: string;
  system?: string;
};
type SendMessageSyncInput = SendMessageBaseInput & {
  responseMode?: "sync";
};
type SendMessageStreamInput = SendMessageBaseInput & {
  responseMode: "experimental_stream";
};

function getConfig() {
  const apiKey = process.env.V0_API_KEY?.trim();
  if (!apiKey) {
    throw new V0ClientError({
      code: "CONFIGURATION_ERROR",
      message: "The v0 API key is not configured.",
      status: 503,
    });
  }

  return {
    apiKey,
    baseUrl: process.env.V0_API_URL?.trim() || DEFAULT_BASE_URL,
    timeoutMs: Number.parseInt(process.env.V0_API_TIMEOUT_MS ?? "", 10) || DEFAULT_TIMEOUT_MS,
    maxRetries: Number.parseInt(process.env.V0_API_MAX_RETRIES ?? "", 10) || DEFAULT_MAX_RETRIES,
  };
}

async function request<T>(path: string, init: RequestInit, retry = 0): Promise<T> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "nex-t1-create/1.0",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const error = createV0HttpError(response.status);
      if (error.retryable && retry < config.maxRetries) {
        return request<T>(path, init, retry + 1);
      }

      const rawBody = await response.text().catch(() => "");
      logger.warn("v0_request_failed", {
        path,
        retry,
        status: response.status,
        body: rawBody.slice(0, 500),
      });
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof V0ClientError) {
      throw error;
    }

    if (retry < config.maxRetries) {
      return request<T>(path, init, retry + 1);
    }

    logger.error("v0_request_threw", {
      path,
      retry,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new V0ClientError({
      code: "UPSTREAM_ERROR",
      message: "v0 is temporarily unavailable.",
      retryable: true,
      status: 503,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestStream(path: string, body: JsonBody): Promise<ReadableStream<Uint8Array>> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "User-Agent": "nex-t1-create/1.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw createV0HttpError(response.status);
    }

    return response.body;
  } catch (error) {
    logger.error("v0_stream_request_failed", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof V0ClientError
      ? error
      : new V0ClientError({
          code: "UPSTREAM_ERROR",
          message: "v0 streaming is temporarily unavailable.",
          retryable: true,
          status: 503,
        });
  } finally {
    clearTimeout(timeout);
  }
}

async function createChat(
  input: CreateChatStreamInput,
): Promise<ReadableStream<Uint8Array>>;
async function createChat(input: CreateChatSyncInput): Promise<V0Chat>;
async function createChat(
  input: CreateChatSyncInput | CreateChatStreamInput,
) {
  const body = {
    message: input.message,
    projectId: input.projectId,
    system: input.system,
    responseMode: input.responseMode ?? "sync",
    chatPrivacy: "team",
    metadata: input.metadata,
  };

  return input.responseMode === "experimental_stream"
    ? requestStream("/chats", body)
    : request<V0Chat>("/chats", {
        method: "POST",
        body: JSON.stringify(body),
      });
}

async function sendMessage(
  input: SendMessageStreamInput,
): Promise<ReadableStream<Uint8Array>>;
async function sendMessage(input: SendMessageSyncInput): Promise<V0Chat>;
async function sendMessage(
  input: SendMessageSyncInput | SendMessageStreamInput,
) {
  const path = `/chats/${input.chatId}/messages`;
  const body = {
    message: input.message,
    system: input.system,
    responseMode: input.responseMode ?? "sync",
  };

  return input.responseMode === "experimental_stream"
    ? requestStream(path, body)
    : request<V0Chat>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
}

export const v0Client = {
  createProject(input: { name: string; description?: string; instructions?: string }) {
    return request<V0Project>("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        instructions: input.instructions,
        privacy: "team",
      }),
    });
  },
  getProjectById(projectId: string) {
    return request<V0Project>(`/projects/${projectId}`, { method: "GET" });
  },
  createChat,
  sendMessage,
  getChatById(chatId: string) {
    return request<V0Chat>(`/chats/${chatId}`, { method: "GET" });
  },
  findMessages(chatId: string) {
    return request<V0MessagesResponse>(`/chats/${chatId}/messages`, { method: "GET" });
  },
  findVersions(chatId: string) {
    return request<{ data: V0Version[] }>(`/chats/${chatId}/versions`, { method: "GET" });
  },
  getVersion(chatId: string, versionId: string) {
    return request<V0Version>(`/chats/${chatId}/versions/${versionId}`, { method: "GET" });
  },
};
