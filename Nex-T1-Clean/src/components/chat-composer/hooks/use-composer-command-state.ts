"use client";

import { useCallback, useMemo, useState, type RefObject } from "react";

import { createInventoryInsertText } from "@/components/chat-composer/command-inventory";
import { buildCoinMentionMarkup } from "@/components/chat-composer/token-mentions";
import type {
  ComposerDraftState,
  CommandPaletteItem,
} from "@/components/chat-composer/types";
import type { TokenMentionSearchResult } from "@/components/chat-composer/token-mentions";
import { useCommandInventory } from "@/components/chat-composer/use-command-inventory";

type UseComposerCommandStateArgs = {
  applyComposerInsertion: (text: string, insertionIndex?: number | null) => void;
  focusInputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  resolvedDraftState: ComposerDraftState;
};

export function useComposerCommandState({
  applyComposerInsertion,
  focusInputRef,
  resolvedDraftState,
}: UseComposerCommandStateArgs) {
  const [isCommandBlocked, setIsCommandBlocked] = useState(false);

  const closeCommand = useCallback(() => {
    resolvedDraftState.setCommandOpen(false);
    resolvedDraftState.setCommandQuery("");
    setIsCommandBlocked(true);
    setTimeout(() => {
      setIsCommandBlocked(false);
      focusInputRef.current?.focus();
    }, 0);
  }, [focusInputRef, resolvedDraftState]);

  const openCommandPalette = useCallback(() => {
    if (isCommandBlocked) {
      return;
    }
    resolvedDraftState.setTokenSearchOpen(false);
    resolvedDraftState.setTokenSearchQuery("");
    resolvedDraftState.setTokenSearchInsertionIndex(null);
    resolvedDraftState.setCommandOpen(true);
  }, [isCommandBlocked, resolvedDraftState]);

  const closeTokenSearch = useCallback(() => {
    resolvedDraftState.setTokenSearchOpen(false);
    resolvedDraftState.setTokenSearchQuery("");
    resolvedDraftState.setTokenSearchInsertionIndex(null);
    setTimeout(() => {
      focusInputRef.current?.focus();
    }, 0);
  }, [focusInputRef, resolvedDraftState]);

  const openTokenSearch = useCallback(
    (insertionIndex: number) => {
      if (isCommandBlocked) {
        return;
      }
      resolvedDraftState.setCommandOpen(false);
      resolvedDraftState.setCommandQuery("");
      resolvedDraftState.setTokenSearchInsertionIndex(insertionIndex);
      resolvedDraftState.setTokenSearchOpen(true);
    },
    [isCommandBlocked, resolvedDraftState],
  );

  const commandInventory = useCommandInventory({
    enabled: resolvedDraftState.commandOpen,
  });
  const commandItems = useMemo<CommandPaletteItem[]>(
    () =>
      (commandInventory.data?.items ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        value: `${item.label} ${item.id} ${item.kind} ${item.category ?? ""}`.toLowerCase(),
        hint: item.description,
        kind: item.kind,
        category: item.category,
        keywords: [item.id, item.kind, item.category ?? ""],
        perform: () => {
          applyComposerInsertion(createInventoryInsertText(item));
        },
      })),
    [applyComposerInsertion, commandInventory.data?.items],
  );

  const handleTokenSelect = useCallback(
    (token: TokenMentionSearchResult) => {
      const mention = `${buildCoinMentionMarkup({
        id: token.id,
        label: token.name,
      })} `;

      applyComposerInsertion(mention, resolvedDraftState.tokenSearchInsertionIndex);
      closeTokenSearch();
    },
    [applyComposerInsertion, closeTokenSearch, resolvedDraftState.tokenSearchInsertionIndex],
  );

  return {
    closeCommand,
    closeTokenSearch,
    commandFilters: commandInventory.data?.filters ?? [],
    commandItems,
    handleTokenSelect,
    openCommandPalette,
    openTokenSearch,
  };
}
