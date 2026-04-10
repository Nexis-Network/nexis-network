import { createContainer, startContainer, stopContainer, attestContainer } from "@/server/services/tee/phala-cloud";
import { redis } from "@/server/services/redis";
import { randomUUID } from "crypto";

export type LifecycleInput = {
  orgId: string;
  agentId: string;
  versionId: string;
  image: string;
  env?: Record<string, string>;
};

const LOCK_PREFIX = "tee:lock:";

async function acquireLock(key: string, ttlMs = 30_000): Promise<string | null> {
  const owner = randomUUID();
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  const ok = await redis.trySetNx(key, owner, ttlSeconds);
  return ok ? owner : null;
}

async function releaseLock(key: string, owner: string) {
  try {
    await redis.tryReleaseLock(key, owner);
  } catch {}
}

export async function createAndStartContainer(input: LifecycleInput) {
  const lockKey = `${LOCK_PREFIX}${input.agentId}:${input.versionId}`;
  const owner = await acquireLock(lockKey);
  if (!owner) throw new Error("Deployment lock busy");
  try {
    const handle = await createContainer({ image: input.image, env: input.env });
    await startContainer(handle.id);
    return handle;
  } finally {
    await releaseLock(lockKey, owner);
  }
}

export async function stopAndDestroyContainer(containerId: string) {
  await stopContainer(containerId);
}

export async function verifyContainerAttestation(containerId: string, policy: { provider: string; version: string; measurements: string[] }) {
  return attestContainer(containerId, policy);
}
