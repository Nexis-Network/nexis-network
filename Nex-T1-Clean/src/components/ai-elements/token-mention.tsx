"use client";

import Image from "next/image";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { getKnownCryptoSymbols } from "@/lib/crypto-symbols";
import { getIconCandidates, PLACEHOLDER_ICON } from "@/lib/token-icons";
import { cn } from "@/lib/utils";
import {
  extractCoinGeckoMentions,
} from "@/components/chat-composer/token-mentions";
import { useCoinMentionRecord } from "@/components/chat-composer/use-token-mention-search";

const MIN_SYMBOL_LENGTH = 3;

const NFT_COLLECTIONS = [
  {
    name: "Bored Ape Yacht Club",
    symbol: "BAYC",
    icon: "/icons/chain-icons/ape.svg",
    aliases: ["Bored Ape Yacht Club", "Bored Apes", "BAYC"],
  },
  {
    name: "Degen",
    symbol: "DEGEN",
    icon: "/icons/chain-icons/degen.svg",
    aliases: ["Degen", "DEGEN"],
  },
  {
    name: "OpenSea",
    symbol: "OPENSEA",
    icon: "/icons/chain-icons/opensea.svg",
    aliases: ["OpenSea"],
  },
  {
    name: "Rarible",
    symbol: "RARI",
    icon: "/icons/chain-icons/rarible.svg",
    aliases: ["Rarible", "RARI"],
  },
] as const;

type TokenMentionMatch = {
  start: number;
  end: number;
  display: string;
  symbol: string;
  name?: string;
  iconOverride?: string;
  priority: number;
};

type MentionMatcher = {
  pattern: RegExp;
  priority: number;
  getMention: (match: RegExpExecArray) => Omit<TokenMentionMatch, "priority"> | null;
};

const NAME_WITH_SYMBOL_MATCHER: MentionMatcher = {
  pattern: /\b([A-Z][A-Za-z0-9 .'-]{2,40}?)\s*\(([A-Z0-9]{2,8})\)/g,
  priority: 3,
  getMention: (match) => {
    const fullMatch = match[0];
    const name = match[1]?.trim();
    const symbol = match[2]?.toUpperCase();
    if (!fullMatch || !symbol) {
      return null;
    }

    const start = match.index ?? 0;
    return {
      start,
      end: start + fullMatch.length,
      display: fullMatch,
      symbol,
      name,
    };
  },
};

const DOLLAR_SYMBOL_MATCHER: MentionMatcher = {
  pattern: /\$([a-z0-9]{2,8})\b/gi,
  priority: 2,
  getMention: (match) => {
    const fullMatch = match[0];
    const rawSymbol = match[1];
    const symbol = rawSymbol?.toUpperCase();
    if (!fullMatch || !symbol) {
      return null;
    }

    const start = match.index ?? 0;
    return {
      start,
      end: start + fullMatch.length,
      display: fullMatch,
      symbol,
    };
  },
};

const SYMBOL_ONLY_MATCHER: MentionMatcher = {
  pattern: /\b([a-z0-9]{3,8})\b/gi,
  priority: 1,
  getMention: (match) => {
    const fullMatch = match[0];
    const rawSymbol = match[1];
    if (!rawSymbol || rawSymbol === rawSymbol.toLowerCase()) {
      return null;
    }
    const symbol = rawSymbol?.toUpperCase();
    if (!fullMatch || !symbol) {
      return null;
    }

    if (symbol.length < MIN_SYMBOL_LENGTH) {
      return null;
    }

    if (!getKnownCryptoSymbols().has(symbol)) {
      return null;
    }

    const start = match.index ?? 0;
    return {
      start,
      end: start + fullMatch.length,
      display: fullMatch,
      symbol,
    };
  },
};

const MENTION_MATCHERS: MentionMatcher[] = [
  NAME_WITH_SYMBOL_MATCHER,
  DOLLAR_SYMBOL_MATCHER,
  SYMBOL_ONLY_MATCHER,
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const addMention = (mentions: TokenMentionMatch[], mention: TokenMentionMatch) => {
  if (!mention.symbol) {
    return;
  }

  const overlappingIndex = mentions.findIndex((existing) =>
    mention.start < existing.end && mention.end > existing.start
  );

  if (overlappingIndex >= 0) {
    const existing = mentions[overlappingIndex];
    const existingLength = existing.end - existing.start;
    const incomingLength = mention.end - mention.start;

    if (
      mention.priority > existing.priority ||
      (mention.priority === existing.priority && incomingLength > existingLength)
    ) {
      mentions[overlappingIndex] = mention;
    }

    return;
  }

  mentions.push(mention);
};

const collectTokenMentions = (text: string): TokenMentionMatch[] => {
  const mentions: TokenMentionMatch[] = [];

  for (const matcher of MENTION_MATCHERS) {
    matcher.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.pattern.exec(text)) !== null) {
      const candidate = matcher.getMention(match);
      if (!candidate) {
        continue;
      }

      addMention(mentions, { ...candidate, priority: matcher.priority });
    }
  }

  for (const collection of NFT_COLLECTIONS) {
    for (const alias of collection.aliases) {
      const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "gi");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const start = match.index ?? 0;

        addMention(mentions, {
          start,
          end: start + fullMatch.length,
          display: fullMatch,
          symbol: collection.symbol,
          name: collection.name,
          iconOverride: collection.icon,
          priority: 4,
        });
      }
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
};

export type TokenIconProps = {
  symbol: string;
  name?: string;
  iconOverride?: string;
  size?: number;
};

export const TokenIcon = ({ symbol, name, iconOverride, size = 18 }: TokenIconProps) => {
  const candidates = useMemo(
    () => getIconCandidates({ symbol, name, iconOverride, kind: "token" }),
    [symbol, name, iconOverride],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  const handleError = useCallback(() => {
    setCandidateIndex((previous) => {
      const nextIndex = previous + 1;
      return nextIndex < candidates.length ? nextIndex : previous;
    });
  }, [candidates.length]);

  const src = candidates[candidateIndex] ?? PLACEHOLDER_ICON;
  const alt = name ? `${name} icon` : `${symbol} icon`;

  return (
    <Image
      alt={alt}
      className="flex-none rounded-full border border-border/40 bg-background/80 object-contain"
      style={{ height: size, width: size }}
      height={size}
      onError={handleError}
      src={src}
      unoptimized
      width={size}
    />
  );
};

type TokenMentionProps = {
  symbol: string;
  display: string;
  name?: string;
  iconOverride?: string;
};

export const TokenMention = ({ symbol, display, name, iconOverride }: TokenMentionProps) => {
  return (
    <span className="inline-flex items-center gap-1 align-middle whitespace-nowrap">
      <TokenIcon iconOverride={iconOverride} name={name ?? display} symbol={symbol} />
      <span>{display}</span>
    </span>
  );
};

export function CoinGeckoMentionLink({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const mentionQuery = useCoinMentionRecord(id);
  const record = mentionQuery.data?.record;
  const displayName = record?.name ?? label;
  const displaySymbol = record?.symbol?.toUpperCase() ?? label.toUpperCase();
  const imageUrl = record?.imageUrl ?? undefined;

  return (
    <a
      href={`https://www.coingecko.com/en/coins/${id}`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 align-middle whitespace-nowrap underline decoration-sky-500/35 underline-offset-4 transition-colors text-sky-500 !text-sky-500 hover:text-sky-400 hover:!text-sky-400",
        className,
      )}
    >
      <TokenIcon
        iconOverride={imageUrl}
        name={displayName}
        symbol={displaySymbol}
        size={16}
      />
      <span>{displayName}</span>
    </a>
  );
}

const renderPlainTextWithTokenMentions = (
  text: string,
  getKey: () => string,
): ReactNode[] => {
  if (!text) {
    return [];
  }

  const mentions = collectTokenMentions(text);

  if (mentions.length === 0) {
    return [<span key={getKey()}>{text}</span>];
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const mention of mentions) {
    if (mention.start > cursor) {
      nodes.push(<span key={getKey()}>{text.slice(cursor, mention.start)}</span>);
    }

    nodes.push(
      <TokenMention
        key={getKey()}
        display={mention.display}
        iconOverride={mention.iconOverride}
        name={mention.name}
        symbol={mention.symbol}
      />
    );

    cursor = mention.end;
  }

  if (cursor < text.length) {
    nodes.push(<span key={getKey()}>{text.slice(cursor)}</span>);
  }

  return nodes;
};

export const renderTextWithTokenMentions = (
  text: string,
  getKey: () => string,
): ReactNode[] => {
  if (!text) {
    return [];
  }

  const coinGeckoMentions = extractCoinGeckoMentions(text);
  if (coinGeckoMentions.length === 0) {
    return renderPlainTextWithTokenMentions(text, getKey);
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const mention of coinGeckoMentions) {
    if (mention.start > cursor) {
      nodes.push(
        ...renderPlainTextWithTokenMentions(
          text.slice(cursor, mention.start),
          getKey,
        ),
      );
    }

    nodes.push(
      <CoinGeckoMentionLink
        key={getKey()}
        id={mention.id}
        label={mention.label}
      />,
    );

    cursor = mention.end;
  }

  if (cursor < text.length) {
    nodes.push(
      ...renderPlainTextWithTokenMentions(text.slice(cursor), getKey),
    );
  }

  return nodes;
};
