"use client";

import { type RefObject, useDeferredValue, useMemo } from "react";
import { Command } from "cmdk";

import { TokenIcon } from "@/components/ai-elements/token-mention";
import { ComposerPopupShell } from "@/components/chat-composer/composer-popup-shell";
import type { TokenMentionSearchResult } from "@/components/chat-composer/token-mentions";
import {
  useRecentTokenMentions,
  useTokenMentionSearch,
} from "@/components/chat-composer/use-token-mention-search";
import { cn } from "@/lib/utils";

type TokenSearchPaletteProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelectToken: (token: TokenMentionSearchResult) => void;
  commandInputRef: RefObject<HTMLInputElement | null>;
};

function formatLaunchDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TokenSearchItem({
  token,
  onSelect,
}: {
  token: TokenMentionSearchResult;
  onSelect: (token: TokenMentionSearchResult) => void;
}) {
  const launchDate = formatLaunchDate(token.launchedAt);

  return (
    <Command.Item
      value={`${token.name} ${token.symbol} ${token.id}`.toLowerCase()}
      className={cn(
        "nex-command-item relative cursor-pointer border-b border-border/40 px-4 py-3 text-left text-sm last:border-b-0",
        "focus-visible:outline-none",
      )}
      onSelect={() => onSelect(token)}
    >
      <div className="relative z-[1] flex items-center gap-3">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-background/80">
          <TokenIcon
            symbol={token.symbol}
            name={token.name}
            iconOverride={token.imageUrl ?? undefined}
            size={36}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {token.name}
            </span>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {token.symbol}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{token.id}</span>
            {typeof token.marketCapRank === "number" ? (
              <span>Rank #{token.marketCapRank}</span>
            ) : null}
            {launchDate ? <span>Listed {launchDate}</span> : null}
          </div>
        </div>
      </div>
    </Command.Item>
  );
}

export function TokenSearchPalette({
  open,
  query,
  onQueryChange,
  onClose,
  onSelectToken,
  commandInputRef,
}: TokenSearchPaletteProps) {
  const normalizedQuery = query.trim();
  const deferredQuery = useDeferredValue(normalizedQuery);
  const searchQuery = useTokenMentionSearch(deferredQuery, { enabled: open });
  const recentQuery = useRecentTokenMentions({ enabled: open });

  const content = useMemo(() => {
    if (deferredQuery.length > 0) {
      return {
        title: "Search Results",
        items: searchQuery.data?.results ?? [],
        isLoading: searchQuery.isLoading,
        emptyLabel: "No CoinGecko matches found.",
      };
    }

    return {
      title:
        recentQuery.data?.source === "trending-fallback"
          ? "Trending Coins"
          : "Recently Listed Coins",
      items: recentQuery.data?.results ?? [],
      isLoading: recentQuery.isLoading,
      emptyLabel: "No recent coins available.",
    };
  }, [
    deferredQuery,
    recentQuery.data?.results,
    recentQuery.data?.source,
    recentQuery.isLoading,
    searchQuery.data?.results,
    searchQuery.isLoading,
  ]);

  return (
    <ComposerPopupShell
      open={open}
      label="Token search"
      query={query}
      onQueryChange={onQueryChange}
      onClose={onClose}
      searchPlaceholder="Search CoinGecko tokens…"
      inputRef={commandInputRef}
      footer={
        <span>
          {deferredQuery.length > 0
            ? "CoinGecko search • Enter to tag token"
            : "Recent CoinGecko feed refreshes every 30s"}
        </span>
      }
    >
      <div className="border-b border-border/50 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {content.title}
      </div>
      {content.isLoading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Loading tokens…
        </div>
      ) : content.items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {content.emptyLabel}
        </div>
      ) : (
        content.items.map((token) => (
          <TokenSearchItem
            key={token.id}
            token={token}
            onSelect={(nextToken) => {
              onSelectToken(nextToken);
              onClose();
            }}
          />
        ))
      )}
    </ComposerPopupShell>
  );
}
