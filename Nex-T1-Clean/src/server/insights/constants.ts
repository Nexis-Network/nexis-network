export const PORTFOLIO_INSIGHT_TTL_HOURS = 24;
export const DEFAULT_ASSET_INSIGHT_TTL_HOURS = 4;
export const MIN_ASSET_INSIGHT_TTL_HOURS = 1;
export const MAX_ASSET_INSIGHT_TTL_HOURS = 6;
export const FALLBACK_NEWS_TTL_HOURS = 6;
export const INSIGHT_SENTENCE_MAX_LENGTH = 160;

export const AI_INSIGHT_SCOPE = Object.freeze({
  PORTFOLIO: "portfolio",
  ASSET: "asset",
});

export const AI_INSIGHT_CATEGORY = Object.freeze({
  PORTFOLIO: "portfolio",
  ASSET: "asset",
  FALLBACK_NEWS: "fallback_news",
});

export const AI_INSIGHT_GENERATION_SOURCE = Object.freeze({
  PRIMARY_MODEL: "primary-model",
  FALLBACK_MODEL: "fallback-model",
  DETERMINISTIC_FALLBACK: "deterministic-fallback",
  FALLBACK_NEWS: "fallback-news",
});

export type AiInsightScope = (typeof AI_INSIGHT_SCOPE)[keyof typeof AI_INSIGHT_SCOPE];
export type AiInsightCategory = (typeof AI_INSIGHT_CATEGORY)[keyof typeof AI_INSIGHT_CATEGORY];
