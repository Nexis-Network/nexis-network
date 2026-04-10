"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import { ChatComposer } from "@/components/chat-composer";
import type { ChatComposerProps } from "@/components/chat-composer";

import type { ComposerModelOption } from "@/components/chat-composer/types";
import type { IntentInsightsResult } from "@/components/chat-composer/hooks/use-intent-insights";
import { TaskSchedulerDialog } from "@/components/sidebar/tasks/task-scheduler-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MODELS } from "@/components/chat-composer/constants";
import { ModelWarningDialog } from "@/components/chat-composer/model-warning-dialog";
import type { ModelId } from "tokenlens";
import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";
import { VirtualizedMessageList } from "@/components/chat/conversation/virtualized-message-list";
import { AssistantMessage, UserMessage } from "@/components/chat/message";
import { ConversationSessionProvider } from "@/components/chat/conversation-session-provider";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/dashboard/lazy-components";
import type { ConversationMessage } from "@/components/chat/types";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
  ContextIndicator,
} from "@/components/ai-elements/context";
import { useCreditsContext } from "@/components/providers/credits-provider";
import { toast } from "sonner";
import { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";
import { SettingsPopover } from "@/components/ai-elements/settings-popover";

const CosmicBorder = dynamic(
  withChunkRetry(() =>
    import("@/components/animated-borders/cosmic-border").then((mod) => ({
      default: mod.CosmicBorder,
    })),
  ),
  { ssr: false },
);

type PendingModelWarning = {
  value: string;
  warning: NonNullable<ComposerModelOption["warning"]>;
};

function Ai02Inner({
  onIntentInsightsChange: upstreamIntentInsightsChange,
  hideIntentInsightsPanel: _ignoredHideInsights,
  ...composerProps
}: ChatComposerProps) {
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [pendingModelWarning, setPendingModelWarning] = useState<PendingModelWarning | null>(null);
  const [hasSubmittedFirstMessage, setHasSubmittedFirstMessage] = useState(false);
  const [hasSentMaxMessage, setHasSentMaxMessage] = useState(false);
  const lastModelRef = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const { hidePromptShortcuts: upstreamHidePromptShortcuts, ...restComposerProps } = composerProps;

  // Initialize controller for autonomous functionality (Langflow, MCP, Tools)
  const controller = useChatController();
  
  // Always use controller for a consistent streaming path
  const effectiveOnSubmit = controller.handleComposerSubmit;
  const effectiveSelectedModel = controller.selectedModel;
  const effectiveOnModelChange = controller.handleModelChange;
  const effectiveIsBusy = controller.isBusy; // Ai02 didn't have isBusy prop, mapping to controller

  // Conversation state (streamed)
  const messages = controller.messages;
  const autoScrollTrigger = controller.autoScrollTrigger;
  const isAutoScrollActive = controller.isAutoScrollActive;
  const inputValue = controller.inputValue;
  const setInputValue = controller.setInputValue;
  const chatStatus = controller.chatStatus;

  const composerInputValue = inputValue ?? restComposerProps.inputValue ?? "";
  const activeModelValue = effectiveSelectedModel?.value ?? MODELS[0]?.value ?? "nex-t0";
  const shouldShowMaxIntroBorder = effectiveSelectedModel?.value === "nex-t1-max" && !hasSentMaxMessage;
  const presetsDisabled = !effectiveOnModelChange;
  const shouldHidePromptShortcuts = upstreamHidePromptShortcuts || hasSubmittedFirstMessage;
  const { credits, limit, plan, reset } = useCreditsContext();
  const isMaxSelected = effectiveSelectedModel?.value === "nex-t1-max";
  const isMaxCreditBlocked = isMaxSelected && credits !== null && credits <= 0;
  const resetDate = reset ? new Date(reset) : null;
  const resetLabel = resetDate && !Number.isNaN(resetDate.valueOf()) ? resetDate.toUTCString() : null;

  // Handle Auth Requirement for Autonomous Chat
  const { authDialogOpen, setAuthDialogOpen, handleAuthNavigation } = controller;
  useEffect(() => {
    if (authDialogOpen) {
      toast.error("Sign in required", {
        description: "You need to be logged in to use the AI assistant.",
        action: {
          label: "Sign In",
          onClick: () => handleAuthNavigation("sign-in"),
        },
      });
      // Reset the dialog state in controller to prevents loops/stale state if we handle it via toast
      setAuthDialogOpen(false);
    }
  }, [authDialogOpen, setAuthDialogOpen, handleAuthNavigation]);

  const handleScheduled = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-tasks"] }).catch(() => { });
  }, [queryClient]);

  const handleIntentInsightsChange = useCallback(
    (next: IntentInsightsResult) => {
      upstreamIntentInsightsChange?.(next);
    },
    [upstreamIntentInsightsChange],
  );

  const handleSubmit = useCallback<ChatComposerProps["onSubmit"]>(
    (message) => {
      const hasText = typeof message.text === "string" && message.text.trim().length > 0;
      const hasFiles = Array.isArray(message.files) && message.files.length > 0;

      if (isMaxCreditBlocked && (hasText || hasFiles)) {
        toast.error("Nex-T1 MAX credits required", {
          description: limit
            ? `You have 0/${limit} credits remaining. Credits reset ${resetLabel ?? "at midnight UTC"}.`
            : "No credits remaining for Nex-T1 MAX.",
        });
        return;
      }

      if (!hasSubmittedFirstMessage && (hasText || hasFiles)) {
        setHasSubmittedFirstMessage(true);
      }

      if (!hasSentMaxMessage && effectiveSelectedModel?.value === "nex-t1-max" && (hasText || hasFiles)) {
        setHasSentMaxMessage(true);
      }
      effectiveOnSubmit(message);
    },
    [hasSentMaxMessage, hasSubmittedFirstMessage, effectiveOnSubmit, effectiveSelectedModel?.value, isMaxCreditBlocked, limit, resetLabel],
  );

  const handlePresetSelect = useCallback(
    (value: string) => {
      if (!effectiveOnModelChange) {
        return;
      }
      const model = MODELS.find((item) => item.value === value);
      if (model && "warning" in model && model.warning) {
        setPendingModelWarning({ value, warning: model.warning });
        return;
      }
      effectiveOnModelChange(value);
    },
    [effectiveOnModelChange],
  );

  const handleModelWarningConfirm = useCallback(() => {
    if (!pendingModelWarning || !effectiveOnModelChange) {
      return;
    }
    effectiveOnModelChange(pendingModelWarning.value);
    setPendingModelWarning(null);
  }, [effectiveOnModelChange, pendingModelWarning]);

  const handleModelWarningCancel = useCallback(() => {
    setPendingModelWarning(null);
  }, []);

  useEffect(() => {
    const current = effectiveSelectedModel?.value;
    if (current !== lastModelRef.current) {
      if (current === "nex-t1-max") {
        setHasSentMaxMessage(false);
      }
      lastModelRef.current = current;
    }
  }, [effectiveSelectedModel?.value]);

  const contextUsage = useMemo(() => {
    // Base usage from the last server response
    const lastUsage = controller.usage;
    
    // Model token limits
    const tokenLimits: Record<string, number> = {
      "nex-t0": 128_000,
      "nex-t1": 256_000,
      "nex-t1-max": 512_000,
      "nex-coder": 192_000,
      degen: 96_000,
    };
    const maxTokens = tokenLimits[effectiveSelectedModel?.value ?? "nex-t1"] ?? 256_000;

    // Estimate checks for current input draft
    const estimatedDraftTokens = Math.min(
      maxTokens,
      Math.max(0, Math.ceil(composerInputValue.length / 4)),
    );

    // If we have real usage from the server, use it as baseline
    if (lastUsage) {
      const currentTotal = lastUsage.totalTokens + estimatedDraftTokens;
      
      return {
        usedTokens: currentTotal,
        maxTokens,
        usage: {
          inputTokens: lastUsage.promptTokens + estimatedDraftTokens,
          outputTokens: lastUsage.completionTokens,
          reasoningTokens: 0, // AI SDK doesn't expose this separately yet
          cachedInputTokens: 0,
          totalTokens: currentTotal,
          // AI SDK v6 requires these fields with specific structure
          inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
          outputTokenDetails: { reasoningTokens: undefined, textTokens: undefined, audioTokens: undefined },
        },
        modelId: effectiveSelectedModel?.value as ModelId | undefined,
      };
    }

    // Fallback: Estimation only (start of conversation)
    const engagedUsage = hasSubmittedFirstMessage
      ? Math.min(maxTokens, estimatedDraftTokens + maxTokens * 0.08)
      : estimatedDraftTokens;

    const totalTokens = Math.max(engagedUsage, estimatedDraftTokens);

    return {
      usedTokens: engagedUsage,
      maxTokens,
      usage: {
        inputTokens: estimatedDraftTokens,
        outputTokens: Math.max(0, Math.round(engagedUsage * 0.35)),
        reasoningTokens: Math.max(0, Math.round(engagedUsage * 0.15)),
        cachedInputTokens: 0,
        totalTokens,
        // AI SDK v6 requires these fields with specific structure
        inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
        outputTokenDetails: { reasoningTokens: undefined, textTokens: undefined, audioTokens: undefined },
      },
      modelId: effectiveSelectedModel?.value as ModelId | undefined,
    };
  }, [composerInputValue, hasSubmittedFirstMessage, effectiveSelectedModel?.value, controller.usage]);

  const contextUsageRatio = contextUsage.maxTokens > 0
    ? Math.min(1, contextUsage.usedTokens / contextUsage.maxTokens)
    : 0;

  const renderMessage = useCallback(
    (message: ConversationMessage, index?: number) => {
      const isLatestAssistant =
        message.role === "assistant" &&
        typeof index === "number" &&
        index === messages.length - 1 &&
        (chatStatus === "streaming" || chatStatus === "submitted");
      const augmentedMessage = isLatestAssistant
        ? { ...message, status: "pending" as const }
        : message;

      if (message.role === "assistant") {
        return (
          <AssistantMessage
            message={augmentedMessage}
            onFollowUpDecision={(suggestionId, decision) =>
              controller.handleFollowUpDecision(message.id, suggestionId, decision)
            }
            onFollowUpQuestion={controller.handleFollowUpQuestion}
            onRegenerate={() => controller.handleRegenerate(message.id)}
            onEdit={() => controller.handleEditMessage(message.id)}
            onDelete={() => controller.handleDeleteMessage(message.id)}
            onShare={() => controller.handleShareMessage(message.id)}
          />
        );
      }
      return <UserMessage message={augmentedMessage} />;
    },
    [controller, messages.length, chatStatus],
  );

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { 
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        when: "beforeChildren" as const,
        staggerChildren: 0.1,
      },
    },
  };

  const slideUpVariants = {
    hidden: { 
      opacity: 0, 
      y: 40,
      filter: "blur(8px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const scaleUpVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const modelCardVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      scale: 0.98,
    },
    visible: (i: number) => ({ 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 350,
        damping: 28,
        delay: i * 0.05,
      },
    }),
  };

  return (
    <motion.div
      className="relative flex flex-col gap-3 border border-[#E8E8E3]/5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="bg-linear-to-r/increasing animate-hue-rotate absolute inset-x-6 bottom-0 top-12 -translate-y-3 from-pink-400 to-purple-400"></div>
      <motion.div className="flex justify-end" variants={slideUpVariants}>
        <Button variant="outline" size="sm" onClick={() => setSchedulerOpen(true)}>
          Schedule Task
        </Button>
      </motion.div>
      {isMaxSelected ? (
        <motion.div 
          className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground"
          variants={slideUpVariants}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/60 text-primary">
              Nex-T1 MAX
            </Badge>
            <span className="font-medium text-foreground">
              {credits !== null && limit !== null ? `${Math.max(credits, 0)}/${limit} credits` : "Checking credits..."}
            </span>
            {plan ? <span className="uppercase tracking-wide text-[11px] text-foreground/80">{plan}</span> : null}
            {resetLabel ? <span className="text-[11px]">Resets {resetLabel}</span> : null}
          </div>
          {isMaxCreditBlocked ? (
            <span className="text-[11px] text-destructive">
              No credits remaining for Nex-T1 MAX. Please wait for reset or upgrade.
            </span>
          ) : null}
        </motion.div>
      ) : null}
      <motion.div 
        className="flex gap-4 items-end"
        variants={scaleUpVariants}
      >
        <div className="pb-4">
           {/* Settings Trigger */}
           <SettingsPopover />
        </div>

        <div className="flex-1 rounded-3xl border border-border/60 bg-background/70 p-4 shadow-[0_15px_45px_rgba(5,5,5,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Agent presets</span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{presetsDisabled ? "Read only" : "Tap to switch models"}</span>
            <Context {...contextUsage}>
              <ContextTrigger>
                <button
                  type="button"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-150",
                    contextUsageRatio > 0.8
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                      : "hover:bg-background/60 hover:text-foreground",
                  )}
                  aria-label="Model context usage"
                >
                  <ContextIndicator />
                </button>
              </ContextTrigger>
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody className="space-y-2 text-xs">
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {MODELS.map((model, index) => {
            const isActive = model.value === activeModelValue;
            return (
              <motion.button
                key={model.value}
                type="button"
                disabled={presetsDisabled}
                onClick={() => handlePresetSelect(model.value)}
                className={cn(
                  "text-left rounded-2xl border px-4 py-3 transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "border-primary/70 bg-primary/5 shadow-[0_15px_35px_rgba(37,99,235,0.25)]"
                    : "border-border/60 bg-background/80 hover:border-border hover:bg-background",
                  presetsDisabled && "cursor-not-allowed opacity-60 hover:border-border/60 hover:bg-background/80",
                )}
                variants={modelCardVariants}
                custom={index}
                whileHover={{ scale: presetsDisabled ? 1 : 1.02, transition: { duration: 0.15 } }}
                whileTap={{ scale: presetsDisabled ? 1 : 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{model.name}</span>
                  {model.max ? (
                    <Badge className="h-5 rounded-full bg-primary/15 px-2 text-[10px] font-semibold uppercase text-primary">
                      MAX
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{model.description}</p>
              </motion.button>
            );
          })}
        </div>
        </div>
      </motion.div>
      <motion.div
        className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-[0_15px_45px_rgba(5,5,5,0.12)]"
        variants={scaleUpVariants}
      >
        <Conversation className="h-[360px] w-full">
          <ConversationContent className="h-full">
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="No messages yet"
                description="Ask Nex-T1 anything to see responses, reasoning, and artifacts."
                className="h-full items-center justify-center text-center"
              />
            ) : (
              <VirtualizedMessageList
                key={autoScrollTrigger}
                messages={messages}
                renderMessage={renderMessage}
                className="h-full w-full pr-1"
                autoScroll={isAutoScrollActive}
              />
            )}
          </ConversationContent>
        </Conversation>
      </motion.div>
      <motion.div variants={slideUpVariants}>
        <CosmicBorder active={shouldShowMaxIntroBorder}>
          <ChatComposer
            {...restComposerProps}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            status={chatStatus}
            selectedModel={effectiveSelectedModel}
            onModelChange={effectiveOnModelChange}
            hideIntentInsightsPanel
            hidePromptShortcuts={shouldHidePromptShortcuts}
            onIntentInsightsChange={handleIntentInsightsChange}
            contextUsage={contextUsage}
            isBusy={effectiveIsBusy}
            className="bg-[radial-gradient(85.77%_49.97%_at_51%_5.12%,rgba(210,210,230,0.11)_0,rgba(222,226,255,0.08)_45.83%,rgba(241,242,255,0.02)_100%),rgba(0,0,0,0.44)] backdrop-blur-[2px] border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.06),inset_0_-1px_1px_rgba(0,0,0,0.02)] before:absolute before:inset-x-0 before:top-0 before:h-px before:w-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gradient-to-b after:from-blue-500 after:to-transparent after:content-['']"
          />
        </CosmicBorder>
      </motion.div>

      <ModelWarningDialog
        open={Boolean(pendingModelWarning)}
        warning={pendingModelWarning?.warning ?? null}
        onCancel={handleModelWarningCancel}
        onConfirm={handleModelWarningConfirm}
      />

      <TaskSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen} onScheduled={handleScheduled} />
    </motion.div>
  );
}

export default function Ai02(props: ChatComposerProps) {
  return (
    <ConversationSessionProvider>
      <Ai02Inner {...props} />
    </ConversationSessionProvider>
  );
}
