import { logger } from '@/lib/logger';

/**
 * Bedrock Agent configuration pulled from environment variables.
 * Centralizing here keeps the memory + agent runtime setup in one place
 * and makes it easy to spot missing configuration.
 */

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const stringFromEnv = (value: string | undefined, fallback = "") =>
  value?.trim() || fallback;

// If a full ARN is provided for the memory, extract the region (arn:partition:service:region:account:resource)
const regionFromMemoryArn = (memoryIdOrArn: string | undefined): string | null => {
  if (!memoryIdOrArn) return null;
  const parts = memoryIdOrArn.split(":");
  if (parts.length >= 4 && memoryIdOrArn.startsWith("arn:") && parts[3]) {
    return parts[3];
  }
  return null;
};

export const bedrockConfig = {
  region: (() => {
    const explicit = stringFromEnv(process.env.BEDROCK_REGION, process.env.AWS_REGION || "");
    if (explicit) return explicit;
    const derived = regionFromMemoryArn(process.env.BEDROCK_MEMORY_ID);
    return derived || "us-east-1";
  })(),
  credentials: {
    accessKeyId: stringFromEnv(process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey: stringFromEnv(process.env.AWS_SECRET_ACCESS_KEY),
  },
  memory: {
    id: stringFromEnv(process.env.BEDROCK_MEMORY_ID),
    strategies: {
      summary: stringFromEnv(process.env.BEDROCK_MEMORY_STRATEGY_SUMMARY_ID, "summary_builtin_r3hy3"),
      semantic: stringFromEnv(process.env.BEDROCK_MEMORY_STRATEGY_SEMANTIC_ID, "semantic_builtin_r3hy3"),
      preference: stringFromEnv(process.env.BEDROCK_MEMORY_STRATEGY_PREFERENCE_ID, "preference_builtin_r3hy3"),
    },
    shortTerm: {
      prefix: stringFromEnv(process.env.BEDROCK_SHORT_TERM_PREFIX, "bedrock:short-term:"),
      ttlSeconds: numberFromEnv(process.env.BEDROCK_SHORT_TERM_TTL_SECONDS, 60 * 60), // 1 hour default
    },
    longTerm: {
      prefix: stringFromEnv(process.env.BEDROCK_LONG_TERM_PREFIX, "bedrock:long-term:"),
      ttlSeconds: numberFromEnv(process.env.BEDROCK_LONG_TERM_TTL_SECONDS, 60 * 60 * 24 * 30), // 30 days
    },
  },
  agent: {
    id: stringFromEnv(process.env.BEDROCK_AGENT_ID),
    aliasId: stringFromEnv(process.env.BEDROCK_AGENT_ALIAS_ID),
  },
};

export const isBedrockConfigured = () =>
  Boolean(
    bedrockConfig.memory.id ||
      bedrockConfig.agent.id ||
      bedrockConfig.agent.aliasId ||
      stringFromEnv(process.env.BEDROCK_KNOWLEDGE_BASE_ID),
  );

export const warnMissing = (label: string, value: string | undefined | null) => {
  if (!value || value.length === 0) {
    logger.warn(`[Bedrock] Missing required configuration: ${label}. Set it in your .env to enable this feature.`);
    return true;
  }
  return false;
};
