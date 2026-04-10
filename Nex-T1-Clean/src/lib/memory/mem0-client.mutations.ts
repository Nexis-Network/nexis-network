import "server-only";

import { logger } from "@/lib/logger";

import { callMem0Api } from "./mem0-client.api";
import {
  CUSTOM_INSTRUCTIONS,
  getMem0Config,
  isMem0Configured,
} from "./mem0-client.config";
import type { Mem0AddParams } from "./mem0-client.types";

export async function storeUserMemory(
  userId: string,
  content: string,
  category?: string,
  metadata?: Record<string, UntypedJson>,
): Promise<{ success: boolean; memoryId?: string }> {
  if (!isMem0Configured()) {
    return { success: false };
  }

  try {
    const result = await callMem0Api<{ id: string }>("/v2/memories/", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content }],
        userId,
        metadata: {
          category,
          timestamp: new Date().toISOString(),
          source: "auto_extracted",
          ...(metadata ?? {}),
        },
      } satisfies Mem0AddParams),
    });

    return { success: true, memoryId: result.id };
  } catch (error) {
    logger.error("[mem0] Store memory error:", error);
    return { success: false };
  }
}

export async function deleteMemory(memoryId: string): Promise<boolean> {
  if (!isMem0Configured()) {
    return false;
  }

  try {
    await callMem0Api(`/v2/memories/${memoryId}/`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    logger.error("[mem0] Delete memory error:", error);
    return false;
  }
}

export async function updateMemory(
  memoryId: string,
  content: string,
): Promise<boolean> {
  if (!isMem0Configured()) {
    return false;
  }

  try {
    await callMem0Api(`/v2/memories/${memoryId}/`, {
      method: "PUT",
      body: JSON.stringify({
        text: content,
      }),
    });
    return true;
  } catch (error) {
    logger.error("[mem0] Update memory error:", error);
    return false;
  }
}

export async function initializeMem0Project(): Promise<boolean> {
  const config = getMem0Config();
  if (!config) {
    logger.warn(
      "[mem0] Cannot initialize project instructions: configuration missing",
    );
    return false;
  }

  if (!config.projectId) {
    logger.warn(
      "[mem0] Cannot initialize project instructions: MEM0_PROJECT_ID missing",
    );
    return false;
  }

  try {
    await callMem0Api(`/v2/projects/${config.projectId}/instructions/`, {
      method: "PUT",
      body: JSON.stringify({ instructions: CUSTOM_INSTRUCTIONS }),
    });
    logger.debug(`[mem0] Project instructions updated for ${config.projectId}`);
    return true;
  } catch (error) {
    logger.error("[mem0] Failed to initialize project instructions:", error);
    return false;
  }
}
