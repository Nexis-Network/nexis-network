import { nanoid } from "nanoid";
import { redis, isRedisConfigured } from "@/server/services/redis";

import { logger } from "@/lib/logger";

const ARTIFACT_PREFIX = "chat:tool-artifact";
const ARTIFACT_TTL_SECONDS = Number(
  process.env.NEX_TOOL_ARTIFACT_TTL ?? 86_400,
);

export async function persistToolArtifact(
  toolName: string,
  payload: UntypedJson,
) {
  if (!payload || !isRedisConfigured) {
    return undefined;
  }

  const record = {
    id: nanoid(),
    toolName,
    createdAt: new Date().toISOString(),
    payload,
  };
  const key = `${ARTIFACT_PREFIX}:${record.id}`;

  try {
    await redis.setex(key, ARTIFACT_TTL_SECONDS, JSON.stringify(record));
    return record.id;
  } catch (error) {
    logger.error("[tool-artifact] failed to persist", error);
    return undefined;
  }
}
