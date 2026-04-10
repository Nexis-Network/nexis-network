"use client";

import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import type { FileUIPart } from "ai";

import { useIntentInsights } from "@/components/chat-composer/hooks/use-intent-insights";
import { attachmentsToFileUIParts } from "@/components/chat-composer/utils/attachments";
import type {
  ChatComposerProps,
  PromptIntentMetadata,
} from "@/components/chat-composer/types";
import { logger } from "@/lib/logger";
import type { AgentStrategy } from "@/components/dashboard/chat-config";
import type { AutomationState } from "@/modules/chat/automation-preferences";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";

type UseComposerSubmitStateArgs = Pick<
  ChatComposerProps,
  "inputValue" | "isBusy" | "onIntentInsightsChange" | "onSubmit"
> & {
  attachments: NonNullable<ChatComposerProps["draftState"]>["attachments"];
  automationStateRef: React.RefObject<AutomationState>;
  clearAttachments: () => void;
  commandOpen: boolean;
  executionPreferences: ChatExecutionPreferences;
  selectedStrategy?: AgentStrategy;
  tokenSearchOpen: boolean;
};

export function useComposerSubmitState({
  attachments,
  automationStateRef,
  clearAttachments,
  commandOpen,
  executionPreferences,
  inputValue,
  isBusy = false,
  onIntentInsightsChange,
  onSubmit,
  selectedStrategy,
  tokenSearchOpen,
}: UseComposerSubmitStateArgs) {
  const deferredInputValue = useDeferredValue(inputValue ?? "");
  const intentInsights = useIntentInsights(
    deferredInputValue,
    selectedStrategy ?? "auto",
  );

  const intentInsightsSnapshot = useMemo(
    () => ({
      analysis: intentInsights.analysis,
      isRouting: intentInsights.isRouting,
      normalizedText: intentInsights.normalizedText,
      recommendedTools: intentInsights.recommendedTools,
      tierDecision: intentInsights.tierDecision,
    }),
    [
      intentInsights.analysis,
      intentInsights.isRouting,
      intentInsights.normalizedText,
      intentInsights.recommendedTools,
      intentInsights.tierDecision,
    ],
  );

  useEffect(() => {
    onIntentInsightsChange?.(intentInsightsSnapshot);
  }, [intentInsightsSnapshot, onIntentInsightsChange]);

  const buildIntentMetadata = useCallback(
    (text: string): PromptIntentMetadata | undefined => {
      if (!text.trim() || !intentInsights.normalizedText) {
        return undefined;
      }

      return {
        normalizedText: intentInsights.normalizedText,
        analysis: intentInsights.analysis,
        routingDecision: intentInsights.tierDecision ?? undefined,
        recommendedTools: intentInsights.recommendedTools.map(
          (tool) => tool.id,
        ),
        derivedAt: Date.now(),
      };
    },
    [
      intentInsights.analysis,
      intentInsights.normalizedText,
      intentInsights.recommendedTools,
      intentInsights.tierDecision,
    ],
  );

  const handleSend = useCallback(async () => {
    if (commandOpen || tokenSearchOpen) {
      return;
    }

    const text = inputValue ?? "";
    if (!text.trim() && attachments.length === 0) {
      return;
    }
    if (isBusy) {
      return;
    }

    let files: FileUIPart[] | undefined;
    try {
      files = await attachmentsToFileUIParts(attachments);
    } catch (error) {
      logger.error("Failed to process attachments", error);
      return;
    }

    onSubmit({
      text,
      files,
      automation: automationStateRef.current,
      intentMetadata: buildIntentMetadata(text),
      executionPreferences,
    });
    clearAttachments();
  }, [
    attachments,
    automationStateRef,
    buildIntentMetadata,
    clearAttachments,
    commandOpen,
    executionPreferences,
    inputValue,
    isBusy,
    onSubmit,
    tokenSearchOpen,
  ]);

  return {
    handleSend,
    intentInsights,
  };
}
