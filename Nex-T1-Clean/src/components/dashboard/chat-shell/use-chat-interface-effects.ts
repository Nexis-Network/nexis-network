"use client";

import { useEffect } from "react";
import type { ChatStatus } from "ai";

import { MARKET_TERMINAL_SUBMIT_EVENT } from "@/components/artifacts/features/market/market-terminal-helpers";
import type { ChatInterfaceProps } from "./chat-interface.types";
import { useChatController } from "./hooks/use-chat-controller";

type ChatControllerState = ReturnType<typeof useChatController>;

type UseChatInterfaceEffectsArgs = {
  chatStatus: ChatStatus;
  handleComposerSubmit: ChatControllerState["handleComposerSubmit"];
  onChatStatusChange?: ChatInterfaceProps["onChatStatusChange"];
};

export function useChatInterfaceEffects({
  chatStatus,
  handleComposerSubmit,
  onChatStatusChange,
}: UseChatInterfaceEffectsArgs) {
  useEffect(() => {
    onChatStatusChange?.(chatStatus);
  }, [chatStatus, onChatStatusChange]);

  useEffect(() => {
    const handleMarketTerminalSubmit = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || typeof detail !== "object") {
        return;
      }

      void handleComposerSubmit(detail);
    };

    window.addEventListener(
      MARKET_TERMINAL_SUBMIT_EVENT,
      handleMarketTerminalSubmit,
    );

    return () => {
      window.removeEventListener(
        MARKET_TERMINAL_SUBMIT_EVENT,
        handleMarketTerminalSubmit,
      );
    };
  }, [handleComposerSubmit]);
}
