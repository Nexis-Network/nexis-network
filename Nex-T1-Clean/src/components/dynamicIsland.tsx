"use client";

import type { ChatStatus } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Wrench, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const COMPLETION_LATCH_MS = 2_600;
const MAX_DETAIL_LENGTH = 52;

type IslandTone = "neutral" | "progress" | "success" | "warning" | "info";

export type DynamicIslandMarketOverview = {
  query: string;
  assets?: string[];
  visible: boolean;
};

type DynamicIslandStatus = {
  key: string;
  title: string;
  detail: string | null;
  tone: IslandTone;
  icon: LucideIcon;
  animateIcon?: boolean;
};

type DynamicIslandStatusInput = {
  chatStatus: ChatStatus;
  hasUserMessage: boolean;
  activeToolName: string | null;
  showCompletion: boolean;
  marketOverview?: DynamicIslandMarketOverview | null;
};

type DynamicIslandProps = {
  chatStatus: ChatStatus;
  hasUserMessage: boolean;
  activeTool: UntypedJson | null;
  marketOverview?: DynamicIslandMarketOverview | null;
  className?: string;
};

const DOT_TONE_CLASSNAMES: Record<IslandTone, string> = {
  neutral: "bg-white/20 text-white",
  progress: "bg-sky-300/20 text-sky-100",
  success: "bg-emerald-300/25 text-emerald-100",
  warning: "bg-rose-300/25 text-rose-100",
  info: "bg-indigo-300/25 text-indigo-100",
};

const TITLE_TONE_CLASSNAMES: Record<IslandTone, string> = {
  neutral: "text-zinc-100",
  progress: "text-sky-100",
  success: "text-emerald-100",
  warning: "text-rose-100",
  info: "text-indigo-100",
};

const DETAIL_TONE_CLASSNAMES: Record<IslandTone, string> = {
  neutral: "text-zinc-300/90",
  progress: "text-sky-200/85",
  success: "text-emerald-200/85",
  warning: "text-rose-200/90",
  info: "text-indigo-200/85",
};

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function prettifyToolName(toolName: string): string {
  return toolName
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActiveToolName(activeTool: UntypedJson | null): string | null {
  if (!activeTool || typeof activeTool !== "object" || Array.isArray(activeTool)) {
    return null;
  }

  const payload = activeTool as Record<string, unknown>;
  const candidate = payload.toolName ?? payload.name;

  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveDynamicIslandStatus({
  chatStatus,
  hasUserMessage,
  activeToolName,
  showCompletion,
  marketOverview,
}: DynamicIslandStatusInput): DynamicIslandStatus {
  if (chatStatus === "error") {
    return {
      key: "system-error",
      title: "System notice",
      detail: "The previous run ended early. Retry when ready.",
      tone: "warning",
      icon: AlertTriangle,
    };
  }

  if (showCompletion && hasUserMessage && chatStatus === "ready") {
    return {
      key: "agent-complete",
      title: "Agent run complete",
      detail: "Insights delivered. Ready for your next request.",
      tone: "success",
      icon: CheckCircle2,
    };
  }

  if (chatStatus === "submitted") {
    return {
      key: "agent-queued",
      title: "Agent queued",
      detail: "Preparing context and selecting tools.",
      tone: "progress",
      icon: LoaderCircle,
      animateIcon: true,
    };
  }

  if (chatStatus === "streaming" && activeToolName) {
    return {
      key: "tool-progress",
      title: "Tool in progress",
      detail: truncate(prettifyToolName(activeToolName), MAX_DETAIL_LENGTH),
      tone: "info",
      icon: Wrench,
    };
  }

  if (chatStatus === "streaming" && marketOverview?.visible) {
    const detailSource = marketOverview.query || marketOverview.assets?.join(", ") || "market data";
    return {
      key: "research-progress",
      title: "Researching market",
      detail: truncate(detailSource, MAX_DETAIL_LENGTH),
      tone: "progress",
      icon: LoaderCircle,
      animateIcon: true,
    };
  }

  if (chatStatus === "streaming") {
    return {
      key: "agent-thinking",
      title: "Agent is analyzing",
      detail: "Synthesizing data into a response.",
      tone: "progress",
      icon: LoaderCircle,
      animateIcon: true,
    };
  }

  if (!hasUserMessage) {
    return {
      key: "welcome",
      title: "Welcome!",
      detail: "Ask anything to start a new agent run.",
      tone: "neutral",
      icon: Zap,
    };
  }

  return {
    key: "ready",
    title: "Standing by",
    detail: "Nex-T1 is ready for your next instruction.",
    tone: "info",
    icon: Zap,
  };
}

export function DynamicIsland({
  chatStatus,
  hasUserMessage,
  activeTool,
  marketOverview,
  className,
}: DynamicIslandProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const previousStatusRef = useRef<ChatStatus>(chatStatus);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (
      hasUserMessage &&
      chatStatus === "ready" &&
      (previousStatus === "submitted" || previousStatus === "streaming")
    ) {
      setShowCompletion(true);
      previousStatusRef.current = chatStatus;

      const completionTimeout = window.setTimeout(() => {
        setShowCompletion(false);
      }, COMPLETION_LATCH_MS);

      return () => window.clearTimeout(completionTimeout);
    }

    if (chatStatus === "submitted" || chatStatus === "streaming" || chatStatus === "error") {
      setShowCompletion(false);
    }

    previousStatusRef.current = chatStatus;
  }, [chatStatus, hasUserMessage]);

  const activeToolName = useMemo(() => getActiveToolName(activeTool), [activeTool]);

  const status = useMemo(
    () =>
      resolveDynamicIslandStatus({
        chatStatus,
        hasUserMessage,
        activeToolName,
        showCompletion,
        marketOverview,
      }),
    [activeToolName, chatStatus, hasUserMessage, marketOverview, showCompletion],
  );

  const Icon = status.icon;
  const isWelcomeState = status.key === "welcome";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[calc(2.85rem-1px)] z-40 px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[420px]">
        <motion.div
          layout
          aria-live="polite"
          aria-atomic="true"
          className="origin-top scale-[0.75] mx-auto flex min-h-12 w-fit max-w-full items-center gap-3 rounded-b-2xl rounded-t-none border border-border/40 border-t-0 bg-sidebar/50 px-6 py-2 text-zinc-100 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
        >
          {isWelcomeState ? (
            <span
              className="relative inline-flex size-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex size-4 animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-white" />
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                DOT_TONE_CLASSNAMES[status.tone],
                status.animateIcon && "animate-pulse",
              )}
              aria-hidden="true"
            >
              <Icon className={cn("size-4", status.animateIcon && "animate-spin")} />
            </span>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-w-0"
            >
              <p
                className={cn(
                  "truncate text-sm font-semibold leading-none",
                  TITLE_TONE_CLASSNAMES[status.tone],
                )}
              >
                {status.title}
              </p>
              {status.detail ? (
                <p
                  className={cn(
                    "mt-1 truncate text-xs leading-none",
                    DETAIL_TONE_CLASSNAMES[status.tone],
                  )}
                >
                  {status.detail}
                </p>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export { DynamicIsland as Island };
