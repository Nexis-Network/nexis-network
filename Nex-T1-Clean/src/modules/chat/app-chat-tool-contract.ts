import type { Tool, UIMessage } from "ai";
import { z } from "zod";

import { getRegisteredToolIds } from "@/modules/ai/chatbot/toolset";

const APP_CHAT_TOOL_CONTRACT_ERROR =
  "Tool is declared for validation only. Use buildUnifiedChatRuntime for execution.";

function createPlaceholderTool(toolId: string): Tool {
  return {
    description: `[contract:${toolId}] Declared /app chat tool.`,
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
    execute: async () => {
      throw new Error(APP_CHAT_TOOL_CONTRACT_ERROR);
    },
  } satisfies Tool;
}

function normalizeToolId(toolId: string): string {
  return toolId.trim();
}

export const appChatToolContract: Record<string, Tool> = Object.create(null);

export function registerAppChatToolContractIds(
  toolIds: Iterable<string>,
): string[] {
  const registered: string[] = [];

  for (const rawToolId of toolIds) {
    const toolId = normalizeToolId(rawToolId);
    if (!toolId || appChatToolContract[toolId]) {
      continue;
    }

    appChatToolContract[toolId] = createPlaceholderTool(toolId);
    registered.push(toolId);
  }

  return registered;
}

export function registerAppChatToolContractTools(
  tools: Record<string, Tool>,
): string[] {
  const registered: string[] = [];

  for (const [rawToolId, tool] of Object.entries(tools)) {
    const toolId = normalizeToolId(rawToolId);
    if (!toolId) {
      continue;
    }

    appChatToolContract[toolId] = tool;
    registered.push(toolId);
  }

  return registered;
}

function visitUnknownParts(
  parts: unknown,
  registerToolId: (toolId: string) => void,
) {
  if (!Array.isArray(parts)) {
    return;
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    const candidate = part as {
      type?: unknown;
      toolName?: unknown;
      result?: { parts?: unknown };
      output?: { parts?: unknown };
      data?: { parts?: unknown };
    };

    if (typeof candidate.type === "string" && candidate.type.startsWith("tool-")) {
      registerToolId(candidate.type.slice(5));
    }

    if (
      candidate.type === "dynamic-tool" &&
      typeof candidate.toolName === "string"
    ) {
      registerToolId(candidate.toolName);
    }

    visitUnknownParts(candidate.result?.parts, registerToolId);
    visitUnknownParts(candidate.output?.parts, registerToolId);
    visitUnknownParts(candidate.data?.parts, registerToolId);
  }
}

export function registerAppChatToolContractFromMessages(
  messages: unknown,
): string[] {
  const discovered = new Set<string>();

  if (!Array.isArray(messages)) {
    return [];
  }

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue;
    }

    const parts = (message as UIMessage | { parts?: unknown }).parts;
    visitUnknownParts(parts, (toolId) => {
      const normalized = normalizeToolId(toolId);
      if (normalized) {
        discovered.add(normalized);
      }
    });
  }

  return registerAppChatToolContractIds(discovered);
}

registerAppChatToolContractIds(getRegisteredToolIds());
