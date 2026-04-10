/**
 * Agent State Storage
 * Redis-backed storage for stateful multi-step agent execution
 */

import { redis, isRedisConfigured } from "@/server/services/redis";
import { z } from "zod";


import { logger } from '@/lib/logger';
// ============================================================================
// Schemas
// ============================================================================

export const StepResultSchema = z.object({
  toolId: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  status: z.enum(["pending", "running", "success", "failed"]),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  error: z.string().optional(),
});

export const AgentStateSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  artifacts: z.record(z.string(), z.unknown()),
  stepResults: z.array(StepResultSchema),
  currentStep: z.number(),
  maxSteps: z.number(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AgentState = z.infer<typeof AgentStateSchema>;
export type StepResult = z.infer<typeof StepResultSchema>;

// ============================================================================
// Constants
// ============================================================================

const STATE_TTL = 3600; // 1 hour
const STEP_TTL = 3600; // 1 hour
const ARTIFACT_TTL = 3600; // 1 hour

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Save complete agent state to Redis
 */
export async function saveAgentState(sessionId: string, state: AgentState): Promise<void> {
  if (!isRedisConfigured) {
    logger.warn("[State Storage] Redis not configured, state not persisted");
    return;
  }

  const key = `agent:state:${sessionId}`;

  try {
    await redis.set(key, state, { ex: STATE_TTL });
    logger.debug(`[State Storage] Saved state for session: ${sessionId}`);
  } catch (error) {
    logger.error("[State Storage] Save state error:", error);
  }
}

/**
 * Get agent state from Redis
 */
export async function getAgentState(sessionId: string): Promise<AgentState | null> {
  if (!isRedisConfigured) {
    return null;
  }

  const key = `agent:state:${sessionId}`;

  try {
    const state = await redis.get<AgentState>(key);
    if (state) {
      logger.debug(`[State Storage] Retrieved state for session: ${sessionId}`);
    }
    return state;
  } catch (error) {
    logger.error("[State Storage] Get state error:", error);
    return null;
  }
}

/**
 * Save individual step result
 */
export async function saveStepResult(
  sessionId: string,
  stepIndex: number,
  toolId: string,
  result: UntypedJson,
): Promise<void> {
  if (!isRedisConfigured) {
    return;
  }

  const key = `agent:step:${sessionId}:${stepIndex}`;

  const stepResult: StepResult = {
    toolId,
    input: {},
    output: result,
    status: "success",
    startedAt: Date.now(),
    completedAt: Date.now(),
  };

  try {
    await redis.set(key, stepResult, { ex: STEP_TTL });
    logger.debug(`[State Storage] Saved step ${stepIndex} for session: ${sessionId}`);
  } catch (error) {
    logger.error("[State Storage] Save step error:", error);
  }
}

/**
 * Get step result from Redis
 */
export async function getStepResult(sessionId: string, stepIndex: number): Promise<StepResult | null> {
  if (!isRedisConfigured) {
    return null;
  }

  const key = `agent:step:${sessionId}:${stepIndex}`;

  try {
    return await redis.get<StepResult>(key);
  } catch (error) {
    logger.error("[State Storage] Get step error:", error);
    return null;
  }
}

/**
 * Update artifacts (shared data between steps)
 */
export async function updateArtifacts(sessionId: string, artifacts: Record<string, UntypedJson>): Promise<void> {
  if (!isRedisConfigured) {
    return;
  }

  const key = `agent:artifacts:${sessionId}`;

  try {
    const current = (await redis.get<Record<string, UntypedJson>>(key)) || {};
    const updated = { ...current, ...artifacts };
    await redis.set(key, updated, { ex: ARTIFACT_TTL });
    logger.debug(`[State Storage] Updated artifacts for session: ${sessionId}`);
  } catch (error) {
    logger.error("[State Storage] Update artifacts error:", error);
  }
}

/**
 * Get artifacts
 */
export async function getArtifacts(sessionId: string): Promise<Record<string, UntypedJson>> {
  if (!isRedisConfigured) {
    return {};
  }

  const key = `agent:artifacts:${sessionId}`;

  try {
    return (await redis.get<Record<string, UntypedJson>>(key)) || {};
  } catch (error) {
    logger.error("[State Storage] Get artifacts error:", error);
    return {};
  }
}

/**
 * Clear all state for a session
 */
export async function clearAgentState(sessionId: string): Promise<void> {
  if (!isRedisConfigured) {
    return;
  }

  try {
    await redis.del(
      `agent:state:${sessionId}`,
      `agent:artifacts:${sessionId}`,
      // Note: Can't easily delete all step keys without scan
      // They will expire naturally after 1 hour
    );
    logger.debug(`[State Storage] Cleared state for session: ${sessionId}`);
  } catch (error) {
    logger.error("[State Storage] Clear state error:", error);
  }
}

/**
 * Initialize new session state
 */
export async function initializeSessionState(sessionId: string, userId: string, maxSteps: number = 20): Promise<AgentState> {
  const state: AgentState = {
    sessionId,
    userId,
    artifacts: {},
    stepResults: [],
    currentStep: 0,
    maxSteps,
    metadata: {},
  };

  await saveAgentState(sessionId, state);
  return state;
}

