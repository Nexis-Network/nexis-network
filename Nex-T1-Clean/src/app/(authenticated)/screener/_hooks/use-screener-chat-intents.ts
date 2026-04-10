"use client";

import { useEffect, useEffectEvent, startTransition } from "react";
import type { useChatController } from "@/components/dashboard/chat-shell/hooks/use-chat-controller";

type ScreenerIntentApi = {
  selectedChain: string;
  setSelectedChain: (value: string) => void;
  setNarrativeFilter: (value: string | null) => void;
  setSafetyFilter: (value: boolean) => void;
};

type ChatMessages = ReturnType<typeof useChatController>["messages"];

export function useScreenerChatIntents(args: ScreenerIntentApi & { messages: ChatMessages }) {
  const applyIntent = useEffectEvent((message: string) => {
    const lower = message.toLowerCase();

    startTransition(() => {
      if (lower.includes("filter by solana") || lower.includes("showing solana")) {
        if (args.selectedChain !== "solana") {
          args.setSelectedChain("solana");
        }
      } else if (
        lower.includes("filter by ethereum") ||
        lower.includes("showing ethereum")
      ) {
        if (args.selectedChain !== "ethereum") {
          args.setSelectedChain("ethereum");
        }
      }

      if (lower.includes("safe") || lower.includes("audit") || lower.includes("secure")) {
        args.setSafetyFilter(true);
      }

      if (lower.includes("ai") || lower.includes("artificial intelligence") || lower.includes("agent")) {
        args.setNarrativeFilter("AI Agent");
      }
      if (lower.includes("meme")) {
        args.setNarrativeFilter("Meme");
      }
      if (lower.includes("depin")) {
        args.setNarrativeFilter("DePin");
      }
      if (lower.includes("gaming")) {
        args.setNarrativeFilter("Gaming");
      }

      if (
        lower.includes("reset filter") ||
        lower.includes("show all") ||
        lower.includes("clear")
      ) {
        if (args.selectedChain !== "all") {
          args.setSelectedChain("all");
        }
        args.setSafetyFilter(false);
        args.setNarrativeFilter(null);
      }
    });
  });

  useEffect(() => {
    const lastMessage = args.messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content) {
      return;
    }

    applyIntent(lastMessage.content);
  }, [args.messages]);
}
