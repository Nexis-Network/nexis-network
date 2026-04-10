import { getLatestCryptoNews } from "@/server/market/crypto-news";
import { getSosovalueFeaturedNews, type SosovalueFeaturedNewsItem } from "@/server/market/sosovalue";
import type { CachedResponse, NewsArticle } from "@/types/market";

const DEFAULT_LIMIT = 12;

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(50, Math.floor(value));
}

function pickPreferredContent(item: SosovalueFeaturedNewsItem): { title: string; description: string | null } {
  const entries = item.multilanguageContent ?? [];
  const preferred =
    entries.find((entry) => entry?.language?.toLowerCase().startsWith("en")) ??
    entries.find((entry) => entry?.language?.toLowerCase().includes("en")) ??
    entries[0];

  const rawTitle = typeof preferred?.title === "string" ? preferred.title : "";
  const rawContent = typeof preferred?.content === "string" ? preferred.content : "";
  return { title: rawTitle.trim(), description: rawContent.trim() || null };
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max = 220): string {
  const normalized = input.trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function pickUrl(item: SosovalueFeaturedNewsItem): string | null {
  const sourceLink = typeof item.sourceLink === "string" ? item.sourceLink.trim() : "";
  if (sourceLink) return sourceLink;

  const media = item.mediaInfo ?? [];
  const best = media.find((m) => typeof m?.originalUrl === "string" && m.originalUrl.trim().length)
    ?? media.find((m) => typeof m?.shortUrl === "string" && m.shortUrl.trim().length)
    ?? media.find((m) => typeof m?.sosoUrl === "string" && m.sosoUrl.trim().length);

  const url = typeof best?.originalUrl === "string"
    ? best.originalUrl
    : typeof best?.shortUrl === "string"
      ? best.shortUrl
      : typeof best?.sosoUrl === "string"
        ? best.sosoUrl
        : "";
  return url.trim() || null;
}

function normalizeTimestamp(releaseTime: UntypedJson): string {
  if (typeof releaseTime !== "number" || !Number.isFinite(releaseTime)) {
    return new Date().toISOString();
  }
  const timestampMs = releaseTime > 10_000_000_000 ? releaseTime : releaseTime * 1000;
  return new Date(timestampMs).toISOString();
}

function mapSosovalueFeaturedNews(items: SosovalueFeaturedNewsItem[]): NewsArticle[] {
  return items
    .map<NewsArticle | null>((item) => {
      const url = pickUrl(item);
      if (!url) return null;

      const content = pickPreferredContent(item);
      const title = content.title || "SoSoValue update";
      const description = content.description ? truncate(stripHtml(content.description)) : null;
      const imageUrl = typeof item.featureImage === "string" && item.featureImage.trim().length ? item.featureImage.trim() : null;

      const article: NewsArticle = {
        id: `sosovalue:${item.id}`,
        title,
        description,
        url,
        imageUrl,
        source: "SoSoValue",
        publishedAt: normalizeTimestamp(item.releaseTime),
      };

      return article;
    })
    .filter((item): item is NewsArticle => item !== null);
}

function pickLatestIso(a: string, b?: string | null): string {
  if (!b) return a;
  return b > a ? b : a;
}

function mergeUniqueByUrl(primary: NewsArticle[], secondary: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];

  for (const article of [...primary, ...secondary]) {
    const url = (article.url ?? "").trim();
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    merged.push(article);
  }

  return merged;
}

export async function getMarketOverviewNewsFeed(params?: { limit?: number }): Promise<CachedResponse<NewsArticle[]>> {
  const limit = clampLimit(params?.limit ?? Number(process.env.MARKET_NEWS_LIMIT ?? DEFAULT_LIMIT));

  const [cryptoNews, sosovalueNews] = await Promise.allSettled([
    getLatestCryptoNews(),
    getSosovalueFeaturedNews({ pageNum: 1, pageSize: Math.max(10, limit) }),
  ]);

  const fallbackNow = new Date().toISOString();
  const cryptoResponse: CachedResponse<NewsArticle[]> =
    cryptoNews.status === "fulfilled"
      ? cryptoNews.value
      : {
        data: [],
        fetchedAt: fallbackNow,
        cache: "miss",
        fallback: true,
        error: cryptoNews.reason instanceof Error ? cryptoNews.reason.message : String(cryptoNews.reason),
      };

  const sosovalueArticles =
    sosovalueNews.status === "fulfilled"
      ? mapSosovalueFeaturedNews(sosovalueNews.value.data?.list ?? [])
      : [];
  const merged = mergeUniqueByUrl(sosovalueArticles, cryptoResponse.data);

  merged.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  const fetchedAt = pickLatestIso(cryptoResponse.fetchedAt, sosovalueNews.status === "fulfilled" ? sosovalueNews.value.fetchedAt : null);
  const cache: CachedResponse<NewsArticle[]>["cache"] =
    cryptoResponse.cache === "hit" && (sosovalueNews.status !== "fulfilled" || sosovalueNews.value.cache === "hit")
      ? "hit"
      : "miss";

  return {
    data: merged.slice(0, limit),
    fetchedAt,
    cache,
    ...(cryptoResponse.stale ? { stale: true } : {}),
    ...(cryptoResponse.fallback ? { fallback: true } : {}),
    ...(cryptoResponse.error ? { error: cryptoResponse.error } : {}),
  };
}
