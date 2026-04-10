"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type ConversationWidthTier = "phone" | "compact" | "regular" | "wide";

type ConversationLayoutStyle = CSSProperties & {
  "--assistant-content-inline-padding": string;
  "--assistant-message-max-width": string;
  "--conversation-inline-padding": string;
  "--conversation-row-gap": string;
  "--conversation-row-padding": string;
  "--user-chat-width": string;
  "--user-chat-width-mobile": string;
};

const PHONE_WIDTH = 640;
const COMPACT_WIDTH = 880;
const REGULAR_WIDTH = 1200;
const DEFAULT_WIDTH = REGULAR_WIDTH;

export function resolveConversationWidthTier(
  width: number,
): ConversationWidthTier {
  if (width < PHONE_WIDTH) {
    return "phone";
  }

  if (width < COMPACT_WIDTH) {
    return "compact";
  }

  if (width < REGULAR_WIDTH) {
    return "regular";
  }

  return "wide";
}

export function resolveConversationLayoutStyle(
  width: number,
): ConversationLayoutStyle {
  const tier = resolveConversationWidthTier(width);

  switch (tier) {
    case "phone":
      return {
        "--assistant-content-inline-padding": "0.75rem",
        "--assistant-message-max-width": "100%",
        "--conversation-inline-padding": "1rem",
        "--conversation-row-gap": "0.625rem",
        "--conversation-row-padding": "0.875rem",
        "--user-chat-width": "90%",
        "--user-chat-width-mobile": "92%",
      };
    case "compact":
      return {
        "--assistant-content-inline-padding": "1rem",
        "--assistant-message-max-width": "100%",
        "--conversation-inline-padding": "1.5rem",
        "--conversation-row-gap": "0.75rem",
        "--conversation-row-padding": "0.9375rem",
        "--user-chat-width": "82%",
        "--user-chat-width-mobile": "88%",
      };
    case "regular":
      return {
        "--assistant-content-inline-padding": "1.25rem",
        "--assistant-message-max-width": "46rem",
        "--conversation-inline-padding": "2rem",
        "--conversation-row-gap": "0.75rem",
        "--conversation-row-padding": "1rem",
        "--user-chat-width": "76%",
        "--user-chat-width-mobile": "85%",
      };
    case "wide":
    default:
      return {
        "--assistant-content-inline-padding": "1.5rem",
        "--assistant-message-max-width": "48rem",
        "--conversation-inline-padding": "2.5rem",
        "--conversation-row-gap": "0.875rem",
        "--conversation-row-padding": "1.125rem",
        "--user-chat-width": "72%",
        "--user-chat-width-mobile": "85%",
      };
  }
}

type UseResponsiveConversationLayoutResult = {
  contentRef: (node: HTMLDivElement | null) => void;
  layoutStyle: ConversationLayoutStyle;
};

export function useResponsiveConversationLayout(): UseResponsiveConversationLayoutResult {
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    if (!contentNode) {
      return;
    }

    const updateWidth = (nextWidth: number) => {
      setWidth(Math.max(0, Math.round(nextWidth)));
    };

    updateWidth(contentNode.clientWidth);

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateWidth(entry.contentRect.width);
    });

    observer.observe(contentNode);
    return () => observer.disconnect();
  }, [contentNode]);

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    setContentNode(node);
  }, []);

  const layoutStyle = useMemo(
    () => resolveConversationLayoutStyle(width),
    [width],
  );

  return {
    contentRef,
    layoutStyle,
  };
}
