"use client";

import { SignalAvatarData, SignalAvatarStack } from "@/components/market-overview/signal-avatars";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type { NewsArticle } from "@/types/market";

const SIGNAL_TITLE_FONT_STACK = "'Roboto', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SIGNAL_DESCRIPTION_FONT_STACK = "'Roboto', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

function truncateText(input: string, maxLength: number) {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength).trimEnd()}...`;
}

function getHostnameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getFaviconFromUrl(url?: string | null): string | null {
  const hostname = getHostnameFromUrl(url);
  if (!hostname) return null;
  return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
}

export function DevelopmentCard({ article }: { article: NewsArticle }) {
  const hostname = getHostnameFromUrl(article.url);
  const avatars: SignalAvatarData[] = [];
  const faviconUrl = getFaviconFromUrl(article.url);

  if (faviconUrl) {
    avatars.push({ src: faviconUrl, label: article.source });
  }
  if (article.imageUrl) {
    avatars.push({ src: article.imageUrl, label: article.title });
  }
  if (!avatars.length) {
    avatars.push({ label: article.source });
  }

  const description = article.description?.trim() || "";
  const timeAgo = formatRelativeTime(article.publishedAt);
  const normalizedTitle = (article.title ?? "Untitled signal").trim() || "Untitled signal";
  const displayTitle = truncateText(normalizedTitle, 63);
  const sourceName = truncateText((article.source ?? "Market desk").trim() || "Market desk", 48);
  const hostLabel = hostname ? truncateText(hostname, 40) : null;

  const cardContent = (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 flex h-[16px] w-full max-w-[250px] items-center gap-2 isolate">
        <SignalAvatarStack avatars={avatars} label={hostname ?? article.source} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[11px] font-medium uppercase tracking-[0.2px] text-foreground">{sourceName}</span>
          {hostLabel ? (
            <span className="text-[10px] uppercase tracking-[0.18px] text-muted-foreground/50">{hostLabel}</span>
          ) : null}
        </div>
        <span className="ml-auto flex h-[16px] w-[58px] items-center justify-end text-[12px] font-light leading-[16px] tracking-[0.16px] text-muted-foreground/55">
          {timeAgo}
        </span>
      </div>

      <div className="mb-2 flex w-full max-w-[250px] items-center">
        <h3
          className="flex w-full items-center text-[14px] font-medium leading-[18px] tracking-[0.16px] text-foreground"
          style={{ fontFamily: SIGNAL_TITLE_FONT_STACK }}
        >
          {displayTitle}
        </h3>
      </div>
      <div className="w-full max-w-[250px] border-b border-border/5 pb-[4.5px]" />

      <div className="mt-0 flex w-full flex-none">
        <p
          className="w-full max-w-[250px] text-left text-[11px] font-light leading-[16px] tracking-[0.16px] text-foreground line-clamp-4"
          style={{ fontFamily: SIGNAL_DESCRIPTION_FONT_STACK }}
        >
          {description || ""}
        </p>
      </div>

      <div className="mt-2 flex w-full flex-none">
        <p className="w-full max-w-[250px] text-left text-[11px] font-light leading-[16px] tracking-[0.16px] text-foreground">
          Tap through to see full story
        </p>
      </div>
      <span className="sr-only">Source: {article.source}</span>
    </div>
  );

  const baseClassName = cn(
    "relative flex h-[237px] w-[250px] min-w-[250px] snap-start flex-col items-start justify-center overflow-hidden rounded-[12px] border border-border/40 bg-card p-[17px] text-left",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  );

  if (article.url) {
    return (
      <a href={article.url} target="_blank" rel="noreferrer" className={baseClassName}>
        {cardContent}
      </a>
    );
  }

  return <article className={baseClassName}>{cardContent}</article>;
}
