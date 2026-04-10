import type { ChatStatus } from "ai";
import { toast } from "sonner";

import type { ChatModel } from "@/components/dashboard/chat-config";
import type { PromptInputMessage } from "@/components/chat-composer/types";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { extractCoinGeckoMentionIds } from "@/components/chat-composer/token-mentions";
import { fetchCoinMentionContext } from "@/components/chat-composer/use-token-mention-search";
import { trackAgentEvent } from "@/modules/analytics/events";
import {
  OPEN_ARTIFACT_PANEL_EVENT,
} from "@/lib/ai/artifact-runtime";
import { resolveCreditCost } from "@/lib/constants/billing-limits";

import { logger } from "@/lib/logger";

const RENDERABLE_ARTIFACT_REQUEST_PATTERNS = [
  /\b(build|create|make|generate|design|prototype)\b[\s\S]{0,80}\b(html|jsx|tsx|react|component|artifact|web\s+page|landing\s+page|ui|interface|preview|prototype)\b/i,
  /\b(html|jsx|tsx|react)\b[\s\S]{0,40}\b(artifact|component|page|preview|prototype)\b/i,
  /\brender\b[\s\S]{0,40}\b(artifact|preview|panel|canvas)\b/i,
] as const;

function shouldSuppressMarketChrome(text: string): boolean {
  return RENDERABLE_ARTIFACT_REQUEST_PATTERNS.some((pattern) =>
    pattern.test(text),
  );
}

export function shouldRequestArtifactPrefetch(
  intent: Pick<MarketIntentAnalysis, "mode" | "shouldShowMarketOverview">,
): boolean {
  return intent.mode === "financial" || intent.shouldShowMarketOverview;
}

type SubmitComposerMessageParams = {
  chatStatus: ChatStatus;
  isLoggedIn: boolean;
  creditsLoading: boolean;
  remainingCredits: number | null;
  message: PromptInputMessage;
  selectedModel: ChatModel;
  walletContext: UntypedJson;
  processMarketRequest: (text: string) => Promise<{
    marketContext?: string | null;
    intent: MarketIntentAnalysis;
  }>;
  sendMessage: (args: {
    text: string;
    files: PromptInputMessage["files"];
    body: Record<string, UntypedJson>;
  }) => Promise<unknown>;
  setAuthDialogOpen: (open: boolean) => void;
  onMarketIntent?: (analysis: MarketIntentAnalysis) => void;
};

export async function submitComposerMessage({
  chatStatus,
  isLoggedIn,
  creditsLoading,
  remainingCredits,
  message,
  selectedModel,
  walletContext,
  processMarketRequest,
  sendMessage,
  setAuthDialogOpen,
  onMarketIntent,
}: SubmitComposerMessageParams): Promise<boolean | void> {
  if (chatStatus === "streaming" || chatStatus === "submitted") {
    return;
  }

  if (!isLoggedIn) {
    setAuthDialogOpen(true);
    return false;
  }

  const text = message.text?.trim() ?? "";
  const files = message.files ?? [];
  const explicitMarketContext =
    typeof message.marketContext === "string" &&
    message.marketContext.trim().length > 0
      ? message.marketContext.trim()
      : null;
  if (!text && files.length === 0) return;

  const requiredCredits = resolveCreditCost(selectedModel.value);

  if (
    !creditsLoading &&
    remainingCredits !== null &&
    remainingCredits < requiredCredits
  ) {
    toast.error("You do not have enough credits for this request.", {
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "/pricing";
        },
      },
    });
    return false;
  }

  try {
    const mentionedCoinIds = extractCoinGeckoMentionIds(text);
    const [marketData, coinMentionContext] = await Promise.all([
        processMarketRequest(text),
        mentionedCoinIds.length > 0
          ? fetchCoinMentionContext(mentionedCoinIds)
              .catch((error) => {
                logger.warn("Failed to load CoinGecko mention context", error);
                return null;
              })
          : Promise.resolve(null),
      ]);
    const suppressMarketChrome = shouldSuppressMarketChrome(text);

    if (
      !suppressMarketChrome &&
      onMarketIntent &&
      (marketData.intent.shouldShowMarketOverview ||
        shouldRequestArtifactPrefetch(marketData.intent))
    ) {
      onMarketIntent(marketData.intent);
    }

    const resolvedMarketContext =
      [explicitMarketContext, marketData.marketContext, coinMentionContext?.context]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .join("\n\n") || null;

    if (
      !suppressMarketChrome &&
      shouldRequestArtifactPrefetch(marketData.intent) &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent(OPEN_ARTIFACT_PANEL_EVENT));
    }

    await sendMessage({
      text,
      files,
      body: {
        ...(resolvedMarketContext
          ? {
              marketContext: resolvedMarketContext,
            }
          : {}),
        walletContext,
        ...(message.executionPreferences
          ? {
              executionPreferences: message.executionPreferences,
            }
          : {}),
      },
    });

    trackAgentEvent("chat_submit", {
      modelKey: selectedModel.value,
      modelId: selectedModel.model,
    });
    return true;
  } catch (error) {
    logger.error("Chat submission failed", error);
    toast.error("Failed to send message");
    return false;
  }
}
