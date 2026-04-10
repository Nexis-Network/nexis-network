import "server-only";

import { logger } from "@/lib/logger";

import { callMem0Api } from "./mem0-client.api";
import { getMem0ErrorStatus, isMem0Configured } from "./mem0-client.config";
import { getAllUserMemories } from "./mem0-client.search";
import { deleteMemory } from "./mem0-client.mutations";

export async function deleteAllUserMemories(userId: string): Promise<boolean> {
  if (!isMem0Configured()) {
    return false;
  }

  try {
    try {
      await callMem0Api(`/v2/memories/?user_id=${userId}`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      const status = getMem0ErrorStatus(error);
      if (status !== 404 && status !== 405) {
        throw error;
      }

      const memories = await getAllUserMemories(userId);
      if (memories.length === 0) {
        return true;
      }

      const concurrency = 6;
      let allDeleted = true;

      for (let index = 0; index < memories.length; index += concurrency) {
        const chunk = memories.slice(index, index + concurrency);
        const results = await Promise.all(
          chunk.map((memory) => deleteMemory(memory.id)),
        );

        if (results.some((result) => !result)) {
          allDeleted = false;
        }
      }

      return allDeleted;
    }
  } catch (error) {
    logger.error("[mem0] Delete all memories error:", error);
    return false;
  }
}
