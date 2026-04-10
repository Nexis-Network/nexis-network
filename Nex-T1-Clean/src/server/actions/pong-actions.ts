"use server";

import { redis, isRedisConfigured } from "@/server/services/redis";

type ZEntry = { score: number; member: string };

class InMemoryZSet {
  private map = new Map<string, number>();

  async zadd(_key: string, entry: ZEntry) {
    this.map.set(entry.member, entry.score);
    return 1;
  }
  async zremrangebyscore(_key: string, min: number, max: number) {
    let removed = 0;
    for (const [member, score] of Array.from(this.map.entries())) {
      if (score >= min && score <= max) {
        this.map.delete(member);
        removed += 1;
      }
    }
    return removed;
  }
  async zcard(_key: string) {
    return this.map.size;
  }
}

const redisClient: { zadd: UntypedJson; zremrangebyscore: UntypedJson; zcard: UntypedJson } =
  isRedisConfigured && redis.zadd && redis.zremrangebyscore && redis.zcard
    ? (redis as { zadd: UntypedJson; zremrangebyscore: UntypedJson; zcard: UntypedJson })
    : new InMemoryZSet();

/** Player is considered inactive after 10 seconds without a heartbeat */
const PLAYER_TIMEOUT_MS = 10_000

/** Redis key for the sorted set storing player timestamps */
const PLAYERS_KEY = "pong:players"

/**
 * Updates a player's heartbeat and returns the current count of active players.
 *
 * @param playerId - Unique identifier for the player
 * @returns The total number of currently active players
 *
 * @remarks
 * This function performs three operations:
 * 1. Updates or adds the player's timestamp in Redis
 * 2. Removes players who haven't sent a heartbeat in 10 seconds
 * 3. Returns the count of remaining active players
 *
 * Uses Redis sorted sets with timestamps as scores for efficient
 * range-based cleanup of stale entries.
 */
export async function updatePlayerHeartbeat(playerId: string): Promise<number> {
  if (!playerId || typeof playerId !== "string") {
    throw new Error("Invalid playerId")
  }

  const now = Date.now()

  await redisClient.zadd(PLAYERS_KEY, { score: now, member: playerId })

  await redisClient.zremrangebyscore(PLAYERS_KEY, 0, now - PLAYER_TIMEOUT_MS)

  const count = await redisClient.zcard(PLAYERS_KEY)

  return count
}
