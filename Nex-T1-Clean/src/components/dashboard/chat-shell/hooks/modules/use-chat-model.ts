"use client";

import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  type ChatModel,
} from "@/components/dashboard/chat-config";
import {
  NEX_MODELS,
  resolveModelKey,
  type NexModelTier,
} from "@/lib/ai/nex-models";
import { DEFAULT_SYSTEM_PROMPT_PROFILE_ID } from "@/modules/chat/system-prompt-profiles";
import { useCallback, useEffect, useMemo, useState } from "react";

export type UseChatModelArgs = {
  plan?: string | null;
  onSelectedModelChange?: (model: ChatModel) => void;
  onRestrictedModelSelect?: (model: ChatModel) => void;
};

const CHAT_MODEL_STORAGE_KEY = "nex.chat.selected-model";

function isNonProductionTestMode(): boolean {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return false;
  }

  return (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true;
}

function normalizePlan(plan?: string | null): NexModelTier | null {
  const normalized = (plan ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === "pro" ||
    normalized === "trader" ||
    normalized === "ultra" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }

  return "free";
}

function isModelAllowedForPlan(
  model: ChatModel,
  plan?: string | null,
): boolean {
  if (isNonProductionTestMode()) {
    return true;
  }

  const normalizedPlan = normalizePlan(plan);
  if (!normalizedPlan) {
    return true;
  }

  const key = resolveModelKey(model.value);
  if (!key) {
    return true;
  }

  return NEX_MODELS[key].tiers.includes(normalizedPlan);
}

function getFallbackModel(plan?: string | null): ChatModel {
  return (
    CHAT_MODELS.find((model) => isModelAllowedForPlan(model, plan)) ??
    DEFAULT_CHAT_MODEL
  );
}

function persistSelectedModel(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, value);
}

function resolveInitialModel(plan?: string | null): ChatModel {
  const fallback = getFallbackModel(plan);
  if (typeof window === "undefined") {
    return fallback;
  }

  const persistedValue = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
  if (!persistedValue) {
    return fallback;
  }

  const found = CHAT_MODELS.find((model) => model.value === persistedValue);
  if (!found) {
    persistSelectedModel(fallback.value);
    return fallback;
  }

  if (isModelAllowedForPlan(found, plan)) {
    return found;
  }

  persistSelectedModel(fallback.value);
  return fallback;
}

export function useChatModel({
  plan,
  onSelectedModelChange,
  onRestrictedModelSelect,
}: UseChatModelArgs = {}) {
  const [selectedModel, setSelectedModel] = useState<ChatModel>(() =>
    resolveInitialModel(plan),
  );
  const [promptProfileId, setPromptProfileId] = useState(
    selectedModel.defaultPromptProfileId ?? DEFAULT_SYSTEM_PROMPT_PROFILE_ID,
  );
  const modelsByValue = useMemo(
    () => new Map(CHAT_MODELS.map((model) => [model.value, model])),
    [],
  );

  useEffect(() => {
    if (isModelAllowedForPlan(selectedModel, plan)) {
      return;
    }

    const fallback = getFallbackModel(plan);
    if (fallback.value === selectedModel.value) {
      return;
    }

    setSelectedModel(fallback);
    setPromptProfileId(
      fallback.defaultPromptProfileId ?? DEFAULT_SYSTEM_PROMPT_PROFILE_ID,
    );
    onSelectedModelChange?.(fallback);
    persistSelectedModel(fallback.value);
  }, [onSelectedModelChange, plan, selectedModel]);

  const handleModelChange = useCallback(
    (value: string) => {
      const found = modelsByValue.get(value);
      if (!found || found.value === selectedModel.value) {
        return;
      }

      if (!isModelAllowedForPlan(found, plan)) {
        onRestrictedModelSelect?.(found);
        return;
      }

      setSelectedModel(found);
      onSelectedModelChange?.(found);
      setPromptProfileId(
        found.defaultPromptProfileId ?? DEFAULT_SYSTEM_PROMPT_PROFILE_ID,
      );
      persistSelectedModel(found.value);
    },
    [
      modelsByValue,
      onRestrictedModelSelect,
      onSelectedModelChange,
      plan,
      selectedModel.value,
    ],
  );

  return {
    selectedModel,
    promptProfileId,
    handleModelChange,
  };
}
