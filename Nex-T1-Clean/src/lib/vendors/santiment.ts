import { withVendorCache, vendorCacheKey, vendorFetch, VendorResponse } from "./base";

const SANTIMENT_ENDPOINT = "https://api.santiment.net/graphql";
const DEFAULT_TTL_SECONDS = 300;

type SantimentSeriesPoint = { datetime: string; value: number };

export interface SantimentSentimentResponse {
  data: {
    socialDominance: SantimentSeriesPoint[];
    sentimentWeightedCombined: SantimentSeriesPoint[];
  };
}

type RawSantimentSentimentResponse = {
  data?: {
    socialDominance?: {
      timeseriesData?: SantimentSeriesPoint[] | null;
    } | null;
    sentimentWeightedCombined?: {
      timeseriesData?: SantimentSeriesPoint[] | null;
    } | null;
  } | null;
};

export async function getSantimentSentiment(
  assetSlug: string,
  from: string,
  to: string,
  interval = "5m",
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<VendorResponse<SantimentSentimentResponse>> {
  const key = vendorCacheKey([
    "santiment",
    "sentiment",
    assetSlug,
    from,
    to,
    interval,
  ]);

  return withVendorCache(key, ttlSeconds, async () => {
    const body = {
      query: SENTIMENT_QUERY,
      variables: {
        slug: assetSlug,
        from,
        to,
        interval,
      },
    };

    const response = await vendorFetch<RawSantimentSentimentResponse>(
      SANTIMENT_ENDPOINT,
      {
        method: "POST",
        headers: santimentHeaders(),
        body: JSON.stringify(body),
      },
    );

    return {
      data: {
        socialDominance:
          response.data?.socialDominance?.timeseriesData ?? [],
        sentimentWeightedCombined:
          response.data?.sentimentWeightedCombined?.timeseriesData ?? [],
      },
    } satisfies SantimentSentimentResponse;
  });
}

type SantimentWordCloudEntry = {
  word: string;
  score: number;
};

type RawSantimentWordCloudResponse = {
  data?: {
    getTrendingWords?: Array<{
      datetime?: string;
      topWords?: SantimentWordCloudEntry[] | null;
    }> | null;
  } | null;
};

export interface SantimentWordCloudResponse {
  data: {
    wordsCloud: SantimentWordCloudEntry[];
  };
}

type LegacySantimentSocialSource =
  | "TWITTER"
  | "TELEGRAM_CHATS"
  | "REDDIT";

function mapSantimentWordCloudSource(
  source: LegacySantimentSocialSource,
): "TWITTER_CRYPTO" | "TELEGRAM" | "REDDIT" {
  switch (source) {
    case "TWITTER":
      return "TWITTER_CRYPTO";
    case "REDDIT":
      return "REDDIT";
    case "TELEGRAM_CHATS":
    default:
      return "TELEGRAM";
  }
}

function mapRawSantimentWordCloud(
  response: RawSantimentWordCloudResponse,
): SantimentWordCloudResponse {
  const latestBucket =
    response.data?.getTrendingWords?.at(-1) ??
    response.data?.getTrendingWords?.[0] ??
    null;

  return {
    data: {
      wordsCloud: latestBucket?.topWords ?? [],
    },
  };
}

export async function getSantimentWordCloud(
  assetSlug: string,
  from: string,
  to: string,
  source: LegacySantimentSocialSource = "TELEGRAM_CHATS",
  ttlSeconds = 3600,
): Promise<VendorResponse<SantimentWordCloudResponse>> {
  const key = vendorCacheKey([
    "santiment",
    "wordcloud",
    assetSlug,
    from,
    to,
    source,
  ]);

  return withVendorCache(key, ttlSeconds, async () => {
    const body = {
      query: WORDCLOUD_QUERY,
      variables: {
        from,
        to,
        source: mapSantimentWordCloudSource(source),
      },
    };

    const response = await vendorFetch<RawSantimentWordCloudResponse>(
      SANTIMENT_ENDPOINT,
      {
        method: "POST",
        headers: santimentHeaders(),
        body: JSON.stringify(body),
        retry: 0,
        backoffMs: 300,
        timeoutMs: 5000,
      },
    );

    return mapRawSantimentWordCloud(response);
  });
}

const SENTIMENT_QUERY = `
  query SentimentSnapshot($slug: String!, $from: DateTime!, $to: DateTime!, $interval: interval!) {
    socialDominance: getMetric(metric: "social_dominance_total") {
      timeseriesData(selector: { slug: $slug }, from: $from, to: $to, interval: $interval) {
        datetime
        value
      }
    }
    sentimentWeightedCombined: getMetric(metric: "sentiment_weighted_total") {
      timeseriesData(selector: { slug: $slug }, from: $from, to: $to, interval: $interval) {
        datetime
        value
      }
    }
  }
`;

// Santiment's current public schema exposes a time-bucketed trending words feed
// rather than the older slug-scoped wordsCloud field. We map the latest bucket
// back into the legacy response contract the UI already consumes.
const WORDCLOUD_QUERY = `
  query WordsCloud($from: DateTime!, $to: DateTime!, $source: TrendingWordsSource!) {
    getTrendingWords(from: $from, to: $to, source: $source, size: 50) {
      datetime
      topWords {
        word
        score
      }
    }
  }
`;

function santimentHeaders(): HeadersInit {
  if (!process.env.SANTIMENT_API_KEY) {
    throw new Error("Missing SANTIMENT_API_KEY environment variable");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Apikey ${process.env.SANTIMENT_API_KEY}`,
  };
}
