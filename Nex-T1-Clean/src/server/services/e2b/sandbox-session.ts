import { redis } from "@/server/services/redis";

const DEFAULT_SANDBOX_TTL_SECONDS = 1800;
const MAX_SANDBOX_TTL_SECONDS = 86400;

const ownerKey = (sandboxId: string) => `sandbox:owner:${sandboxId}`;
const userSandboxesKey = (userId: string) => `sandbox:user:${userId}:ids`;
const userLatestSandboxKey = (userId: string) => `sandbox:user:${userId}:latest`;

function parseSandboxTtlSeconds(): number {
  const raw = process.env.E2B_SANDBOX_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_SANDBOX_TTL_SECONDS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SANDBOX_TTL_SECONDS;
  }

  return Math.min(parsed, MAX_SANDBOX_TTL_SECONDS);
}

export function getSandboxTtlSeconds(): number {
  return parseSandboxTtlSeconds();
}

export function buildSandboxPreviewUrl(
  sandbox: { sandboxId: string; sandboxDomain?: string },
  port = 3000,
): string {
  const host =
    typeof sandbox.sandboxDomain === "string" && sandbox.sandboxDomain.length > 0
      ? sandbox.sandboxDomain
      : "e2b.dev";

  return `https://${port}-${sandbox.sandboxId}.${host}`;
}

export async function registerSandboxOwnership(
  userId: string,
  sandboxId: string,
  ttlSeconds = getSandboxTtlSeconds(),
): Promise<void> {
  await redis.set(ownerKey(sandboxId), userId, { ex: ttlSeconds });

  const sandboxesKey = userSandboxesKey(userId);
  await redis.sadd(sandboxesKey, sandboxId);
  if (redis.expire) {
    await redis.expire(sandboxesKey, ttlSeconds);
  }

  await redis.set(userLatestSandboxKey(userId), sandboxId, { ex: ttlSeconds });
}

export async function getLatestSandboxForUser(
  userId: string,
): Promise<string | null> {
  return redis.get<string>(userLatestSandboxKey(userId));
}

export async function isSandboxOwnedByUser(
  userId: string,
  sandboxId: string,
): Promise<boolean> {
  const owner = await redis.get<string>(ownerKey(sandboxId));
  if (owner) {
    return owner === userId;
  }

  const sandboxes = await redis.smembers(userSandboxesKey(userId));
  if (!sandboxes.includes(sandboxId)) {
    return false;
  }

  // Restore the direct owner lookup key when set membership confirms ownership.
  await redis.set(ownerKey(sandboxId), userId, { ex: getSandboxTtlSeconds() });
  return true;
}
