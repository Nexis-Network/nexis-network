"use client";

import { DEGEN_MODEL_WARNING, type ModelWarning } from "@/modules/chat/model-warnings";
import { NEX_MODEL_LIST } from "@/lib/ai/nex-models";

export type AgentStrategy = "auto" | "companion" | "multi";

export type ChatModel = {
  /** UX alias / select value (must be unique) */
  value: string;
  /** AI Gateway model id for analytics/runtime resolution */
  model: string;
  name: string;
  description: string;
  strategy: AgentStrategy;
  warning?: ModelWarning;
  max?: boolean;
  defaultPromptProfileId?: string;
  badges?: string[];
  tiers?: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  maxTokens?: number;
};

export const CHAT_MODELS: ChatModel[] = NEX_MODEL_LIST.map((cfg) => ({
  value: cfg.key,
  model: cfg.model,
  name: cfg.label,
  description: cfg.description,
  strategy: cfg.kind === "builder" ? "multi" : cfg.kind === "reasoning" ? "auto" : "companion",
  defaultPromptProfileId: cfg.kind === "builder" ? "builder" : "balanced",
  badges: cfg.badges,
  tiers: cfg.tiers,
  warning: cfg.kind === "degen" ? DEGEN_MODEL_WARNING : undefined,
  max: cfg.badges?.includes("MAX"),
  contextWindow: cfg.contextWindow,
  maxOutputTokens: cfg.maxOutputTokens,
  maxTokens: cfg.maxTokens,
}));

export const DEFAULT_CHAT_MODEL = CHAT_MODELS[0];
export const DEFAULT_PYTH_LOOKBACK_DAYS = 7;
export const DEFAULT_PYTH_RESOLUTION_MINUTES = 15;
