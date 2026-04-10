import { resolveModelKey } from "@/lib/ai/nex-models";
import { DEFAULT_MODEL, MODEL_MAP } from "@/modules/ai/config/models";

export const resolveModel = (value?: string): string => {
  if (value) {
    const mapped = MODEL_MAP[value];
    if (mapped) {
      return mapped;
    }

    if (value.includes("/")) {
      return value;
    }
  }
  return MODEL_MAP[value ?? ""] ?? DEFAULT_MODEL;
};

/**
 * Resolves a model alias/gateway ID to a NexModelKey for billing lookups.
 * Handles "nex-t1-pro", "openai/gpt-5.4", and legacy "nex-t1-max" -> "nex-t1-ultra".
 */
export const resolveModelKeyForBilling = (alias: string): string => {
  return resolveModelKey(alias) ?? alias;
};
