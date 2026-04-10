const RAW_MODEL_LIMITS: Record<string, number> = {
  // Current UI model keys
  "nex-t1-free": 1_050_000,
  "nex-t1-pro": 1_050_000,
  "nex-t1-ultra": 1_050_000,
  "nex-build": 1_050_000,
  "nex-code": 1_050_000,
  "nex-degen": 1_050_000,

  // Legacy keys
  "nex-t0": 1_050_000,
  "nex-t1": 1_050_000,
  "nex-coder": 1_050_000,
  degen: 1_050_000,
  "gpt-5.3-chat": 1_050_000,
  "gpt-5.4": 1_050_000,
  "openai/gpt-5-mini": 128_000,

  // AI Gateway model IDs (source: https://ai-gateway.vercel.sh/v1/models)
  "openai/gpt-5.3-chat": 1_050_000,
  "openai/gpt-5.4": 1_050_000,
};

export const DEFAULT_CONTEXT_LIMIT = 256_000;

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const getModelContextLimit = (modelId?: string | null): number => {
  const normalized = normalizeKey(modelId);
  if (!normalized) {
    return DEFAULT_CONTEXT_LIMIT;
  }
  if (normalized in RAW_MODEL_LIMITS) {
    return RAW_MODEL_LIMITS[normalized];
  }
  if (normalized.includes("/")) {
    const [, suffix] = normalized.split(/\//);
    if (suffix && suffix in RAW_MODEL_LIMITS) {
      return RAW_MODEL_LIMITS[suffix];
    }
  }
  return DEFAULT_CONTEXT_LIMIT;
};
