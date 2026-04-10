"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

import { ComposerSuggestionButtons } from "@/components/chat-composer/composer-suggestion-buttons";
import { APP_CHAT_COMPOSER_SUGGESTIONS } from "@/components/chat-composer/constants";
import type { CommandInventoryFilter } from "@/components/chat-composer/command-inventory";
import type {
  CommandPaletteItem,
  ComposerDraftState,
} from "@/components/chat-composer/types";
import type { TokenMentionSearchResult } from "@/components/chat-composer/token-mentions";

const CommandPalette = dynamic(
  () => import("./command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);

const TokenSearchPalette = dynamic(
  () => import("./token-search-palette").then((mod) => mod.TokenSearchPalette),
  { ssr: false },
);

type ComposerOverlaysProps = {
  commandFilters: CommandInventoryFilter[];
  commandInputRef: RefObject<HTMLInputElement | null>;
  commandItems: CommandPaletteItem[];
  commandOpen: boolean;
  commandQuery: string;
  compactSuggestions?: boolean;
  draftState: Pick<
    ComposerDraftState,
    "fileInputRef" | "handleAttachmentSelection" | "setCommandQuery" | "setTokenSearchQuery" | "tokenSearchOpen" | "tokenSearchQuery"
  >;
  onCommandClose: () => void;
  onPromptClick: (prompt: string) => void;
  onTokenSearchClose: () => void;
  onTokenSelect: (token: TokenMentionSearchResult) => void;
  showSuggestions: boolean;
  tokenSearchInputRef: RefObject<HTMLInputElement | null>;
};

export function ComposerOverlays({
  commandFilters,
  commandInputRef,
  commandItems,
  commandOpen,
  commandQuery,
  compactSuggestions = false,
  draftState,
  onCommandClose,
  onPromptClick,
  onTokenSearchClose,
  onTokenSelect,
  showSuggestions,
  tokenSearchInputRef,
}: ComposerOverlaysProps) {
  return (
    <>
      <CommandPalette
        open={commandOpen}
        query={commandQuery}
        onQueryChange={draftState.setCommandQuery}
        onClose={onCommandClose}
        items={commandItems}
        filters={commandFilters}
        commandInputRef={commandInputRef}
      />

      <TokenSearchPalette
        open={draftState.tokenSearchOpen}
        query={draftState.tokenSearchQuery}
        onQueryChange={draftState.setTokenSearchQuery}
        onClose={onTokenSearchClose}
        onSelectToken={onTokenSelect}
        commandInputRef={tokenSearchInputRef}
      />

      <input
        ref={draftState.fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={draftState.handleAttachmentSelection}
      />

      {showSuggestions ? (
        <ComposerSuggestionButtons
          suggestions={APP_CHAT_COMPOSER_SUGGESTIONS}
          onSelect={onPromptClick}
          compact={compactSuggestions}
        />
      ) : null}
    </>
  );
}
