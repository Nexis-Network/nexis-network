import "server-only";

import { resolveChatRateLimit } from "@/lib/constants/billing-limits";
import {
  checkRateLimit,
  createSlidingWindowLimiter,
  type RateLimiter,
} from "@/server/security/rate-limit";

import { CreateServiceError } from "./errors";
import type { ResolvedCreateActor } from "./types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const limiterCache = new Map<string, RateLimiter>();

function getLimiter(prefix: string, maxRequests: number, windowMs: number): RateLimiter {
  const key = `${prefix}:${maxRequests}:${windowMs}`;
  const existing = limiterCache.get(key);
  if (existing) {
    return existing;
  }

  const created = createSlidingWindowLimiter(maxRequests, windowMs, prefix);
  limiterCache.set(key, created);
  return created;
}

function getActorIdentifier(actor: ResolvedCreateActor): string {
  if (actor.kind === "user") {
    return actor.userId;
  }

  if (actor.kind === "guest") {
    return actor.guestSessionId;
  }

  return actor.ip;
}

async function enforceLimit(args: {
  actor: ResolvedCreateActor;
  limit: number;
  prefix: string;
  windowMs: number;
  message: string;
}): Promise<Record<string, string>> {
  const result = await checkRateLimit(
    getActorIdentifier(args.actor),
    getLimiter(args.prefix, args.limit, args.windowMs),
  );

  if (!result.success) {
    throw new CreateServiceError({
      code: "RATE_LIMITED",
      message: args.message,
      status: 429,
      details: result.headers,
    });
  }

  return result.headers;
}

export async function enforceCreateProjectQuota(
  actor: ResolvedCreateActor,
): Promise<Record<string, string>> {
  if (actor.kind === "anonymous") {
    return enforceLimit({
      actor,
      limit: 1,
      prefix: "create-anonymous-project",
      windowMs: ONE_DAY_MS,
      message: "Anonymous users can only start one project every 24 hours.",
    });
  }

  if (actor.kind === "user") {
    const tierLimit = resolveChatRateLimit(actor.plan);
    return enforceLimit({
      actor,
      limit: tierLimit.maxRequests,
      prefix: `create-user-project:${actor.plan}`,
      windowMs: tierLimit.windowMs,
      message: "Project creation is temporarily rate limited for your plan.",
    });
  }

  return {};
}

export async function enforceFollowUpQuota(
  actor: Exclude<ResolvedCreateActor, { kind: "anonymous" }>,
): Promise<Record<string, string>> {
  if (actor.kind === "guest") {
    return enforceLimit({
      actor,
      limit: 5,
      prefix: "create-guest-followup",
      windowMs: ONE_DAY_MS,
      message: "Guest sessions can send up to five follow-up prompts every 24 hours.",
    });
  }

  const tierLimit = resolveChatRateLimit(actor.plan);
  return enforceLimit({
    actor,
    limit: tierLimit.maxRequests,
    prefix: `create-user-message:${actor.plan}`,
    windowMs: tierLimit.windowMs,
    message: "Create builder prompts are temporarily rate limited for your plan.",
  });
}
