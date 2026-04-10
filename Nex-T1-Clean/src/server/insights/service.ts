import "server-only";

import { randomUUID } from "node:crypto";

import { generateObject, gateway } from "ai";
import { after } from "next/server";

import { logger } from "@/lib/logger";
import { buildWalletHomeAggregate } from "@/server/mobile-contracts/wallet-home";
import { getMarketOverviewNewsFeed } from "@/server/market/market-overview-news";
import {
  getCoinDataByContract,
  getCoinDetails,
  getCoingeckoMarkets,
} from "@/server/market/coingecko";
import { PortfolioService } from "@/server/services/portfolio-service";
import { directOpenai, openai } from "@/server/services/ai-sdk/openai";
import { redis } from "@/server/services/redis";
import {
  AI_INSIGHT_CATEGORY,
  AI_INSIGHT_GENERATION_SOURCE,
  AI_INSIGHT_SCOPE,
  FALLBACK_NEWS_TTL_HOURS,
  type AiInsightCategory,
  type AiInsightScope,
} from "@/server/insights/constants";
import {
  buildAssetFallbackInsight,
  buildPortfolioFallbackNewsInsight,
} from "@/server/insights/fallbacks";
import { hashNormalizedInsightInput } from "@/server/insights/hash";
import {
  type AiInsightRepository,
  createAiInsightRepository,
} from "@/server/insights/repository";
import {
  InsightOutputSchema,
  ensureValidInsightOutput,
  isInsightFresh,
  resolveAssetInsightTtlHours,
  resolveInsightExpiry,
} from "@/server/insights/validation";

type InsightRow = Record<string, unknown>;
type WalletAccountRow = Record<string, unknown>;
type WalletSnapshotRow = Record<string, unknown>;

type AssetSource = {
  name: string;
  symbol: string;
  detail: Record<string, unknown>;
  market_data: Record<string, unknown>;
  attributes: Record<string, unknown>;
};

type PortfolioFallbackArticle = {
  title: string;
  source: string | null;
};

type PortfolioAggregate = {
  netWorthUsd?: unknown;
  portfolioAssets?: unknown;
};

type AssetInsightParams = {
  tokenId?: string | null;
  chainId?: number | null;
  coingeckoId?: string | null;
};

type BatchPortfolioParams = {
  userIds?: string[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

type GenerateInsightInput = {
  scope: AiInsightScope;
  category: AiInsightCategory;
  prompt: string;
  env: NodeJS.ProcessEnv;
  fallbackOutput: ReturnType<typeof buildAssetFallbackInsight> | ReturnType<typeof buildPortfolioFallbackNewsInsight> | null;
  snapshotRef: string | null;
  inputHash: string;
  userId?: string | null;
  assetKey?: string | null;
};

type AiInsightServiceOptions = {
  env?: NodeJS.ProcessEnv;
  repository?: AiInsightRepository;
  loadAssetSource?: (params: AssetInsightParams) => Promise<AssetSource | null>;
  loadPortfolioAggregate?: (userId: string) => Promise<PortfolioAggregate | null>;
  loadFallbackArticles?: () => Promise<PortfolioFallbackArticle[]>;
  scheduleBackgroundTask?: (task: () => Promise<unknown>) => void;
};

const inflightGenerations = new Map<string, Promise<unknown>>();
const LOCK_TTL_SECONDS = 30;
const REFRESH_TTL_SECONDS = 45;

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampConfidence(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function buildAssetKey({ tokenId, chainId, coingeckoId }: AssetInsightParams): string {
  const normalizedCoinGeckoId =
    typeof coingeckoId === "string" && coingeckoId.trim().length > 0
      ? coingeckoId.trim().toLowerCase()
      : null;

  if (normalizedCoinGeckoId) {
    return `coingecko:${normalizedCoinGeckoId}`;
  }

  const normalizedTokenId = String(tokenId ?? "").trim().toLowerCase();
  const normalizedChainId = Number.isFinite(Number(chainId))
    ? String(Number(chainId))
    : "unknown";

  return `${normalizedChainId}:${normalizedTokenId}`;
}

function buildInsightDto(row: InsightRow | null, now = new Date()) {
  if (!row) {
    return null;
  }

  const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;
  const generatedAt = typeof row.created_at === "string" ? row.created_at : null;
  const generationSource =
    typeof row.generation_source === "string" ? row.generation_source : "primary-model";

  return {
    id: String(row.id ?? ""),
    scope: String(row.scope ?? ""),
    category: String(row.category ?? ""),
    sentence: String(row.sentence ?? ""),
    reasonCodes: Array.isArray(row.reason_codes)
      ? row.reason_codes.map((value) => String(value))
      : [],
    confidence: Number(row.confidence ?? 0),
    generatedAt,
    expiresAt,
    isFresh: isInsightFresh(expiresAt, now),
    isFallback:
      row.category === AI_INSIGHT_CATEGORY.FALLBACK_NEWS ||
      generationSource === AI_INSIGHT_GENERATION_SOURCE.DETERMINISTIC_FALLBACK ||
      generationSource === AI_INSIGHT_GENERATION_SOURCE.FALLBACK_NEWS,
  };
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(toRecord(entry)))
    : [];
}

function normalizeAddress(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function resolveAccountAddress(account: WalletAccountRow): string | null {
  const address = String(account.address ?? account.safe_address ?? "").trim();
  return address.length > 0 ? address : null;
}

function resolveAccountNamespace(account: WalletAccountRow): "evm" | "solana" {
  const platform = String(account.platform ?? "").trim().toLowerCase();
  const walletType = String(account.wallet_type ?? "").trim().toLowerCase();
  const chainId = toNumber(account.chain_id);

  if (platform === "solana" || walletType.includes("solana") || chainId == null) {
    return "solana";
  }

  return "evm";
}

function resolveSnapshotNamespace(snapshot: WalletSnapshotRow): "evm" | "solana" {
  const chainNamespace = String(snapshot.chain_namespace ?? "").trim().toLowerCase();
  return chainNamespace === "solana" ? "solana" : "evm";
}

function resolveSnapshotCapturedAt(snapshot: WalletSnapshotRow): string {
  return String(snapshot.captured_at ?? snapshot.snapshot_at ?? 0);
}

function resolveSnapshotValueUsd(snapshot: WalletSnapshotRow): number {
  return (
    toNumber(
      snapshot.total_value_usd ??
        snapshot.net_worth_usd ??
        snapshot.totalValueUsd ??
        snapshot.netWorthUsd,
    ) ?? 0
  );
}

function resolvePositionValueUsd(position: Record<string, unknown>): number {
  return toNumber(position.valueUsd ?? position.balanceUsd ?? position.quantity_usd) ?? 0;
}

function resolvePositionChainKey(position: Record<string, unknown>): string {
  const asset = toRecord(position.asset);
  return String(
    asset?.chainNamespace ??
      position.chainType ??
      position.chain ??
      position.chain_namespace ??
      "unknown",
  );
}

function resolvePositionSymbol(position: Record<string, unknown>): string {
  const asset = toRecord(position.asset);
  return String(asset?.symbol ?? position.symbol ?? "ASSET").toUpperCase();
}

function resolvePositionChange24hPercent(position: Record<string, unknown>): number | null {
  return toNumber(
    position.change24hPct ?? position.priceChange24hPercent ?? position.price_change_24h,
  );
}

function resolveTopContributors(
  positions: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  type Contributor = {
    symbol: string;
    chainType: string;
    valueUsd: number;
    change24hPercent: number | null;
  };

  const normalized = positions
    .map<Contributor | null>((position) => {
      const valueUsd = resolvePositionValueUsd(position);
      if (valueUsd == null || !Number.isFinite(valueUsd) || valueUsd <= 0) {
        return null;
      }
      const normalizedValueUsd = Number(valueUsd);

      return {
        symbol: resolvePositionSymbol(position),
        chainType: resolvePositionChainKey(position),
        valueUsd: normalizedValueUsd,
        change24hPercent: resolvePositionChange24hPercent(position),
      };
    })
    .filter((value): value is Contributor => value !== null)
    .sort((left, right) => right.valueUsd - left.valueUsd);

  const totalValueUsd = normalized.reduce((sum, entry) => sum + entry.valueUsd, 0);

  return normalized.slice(0, 5).map((entry) => ({
    ...entry,
    allocationRatio:
      totalValueUsd > 0 ? Number((entry.valueUsd / totalValueUsd).toFixed(4)) : 0,
  }));
}

function buildAllocation(
  positions: Array<Record<string, unknown>>,
  totalValueUsd: number,
): Array<Record<string, unknown>> {
  const byChain = new Map<string, number>();

  for (const position of positions) {
    const chainKey = resolvePositionChainKey(position);
    const valueUsd = resolvePositionValueUsd(position);
    byChain.set(chainKey, (byChain.get(chainKey) ?? 0) + valueUsd);
  }

  return [...byChain.entries()]
    .map(([label, valueUsd]) => ({
      label,
      valueUsd: Number(valueUsd.toFixed(2)),
      ratio: totalValueUsd > 0 ? Number((valueUsd / totalValueUsd).toFixed(4)) : 0,
    }))
    .sort((left, right) => Number(right.valueUsd) - Number(left.valueUsd));
}

function buildPortfolioFeatures(params: {
  userId: string;
  accounts: WalletAccountRow[];
  snapshots: WalletSnapshotRow[];
  aggregate?: PortfolioAggregate | null;
  now?: Date;
}) {
  const previousCutoffMs = (params.now ?? new Date()).getTime() - 24 * 60 * 60 * 1000;
  const aggregatePositions = toRecordArray(params.aggregate?.portfolioAssets);

  if (aggregatePositions.length > 0 || params.aggregate?.netWorthUsd != null) {
    const totalValueUsd = Number(
      (
        toNumber(params.aggregate?.netWorthUsd) ??
        aggregatePositions.reduce((sum, position) => sum + resolvePositionValueUsd(position), 0)
      ).toFixed(2),
    );

    const previousSnapshots = params.accounts
      .map((account) => {
        const accountAddress = resolveAccountAddress(account);
        if (!accountAddress) {
          return null;
        }

        const accountNamespace = resolveAccountNamespace(account);
        const accountSnapshots = params.snapshots
          .filter(
            (snapshot) =>
              normalizeAddress(snapshot.wallet_address) === normalizeAddress(accountAddress) &&
              resolveSnapshotNamespace(snapshot) === accountNamespace,
          )
          .sort(
            (left, right) =>
              new Date(resolveSnapshotCapturedAt(right)).getTime() -
              new Date(resolveSnapshotCapturedAt(left)).getTime(),
          );

        return (
          accountSnapshots.find(
            (snapshot) =>
              new Date(resolveSnapshotCapturedAt(snapshot)).getTime() <= previousCutoffMs,
          ) ??
          accountSnapshots.at(-1) ??
          null
        );
      })
      .filter((snapshot): snapshot is WalletSnapshotRow => snapshot !== null);

    const previousTotalValueUsd = previousSnapshots.reduce(
      (sum, snapshot) => sum + resolveSnapshotValueUsd(snapshot),
      0,
    );
    const change24hPercent =
      previousTotalValueUsd > 0
        ? Number(
            (((totalValueUsd - previousTotalValueUsd) / previousTotalValueUsd) * 100).toFixed(2),
          )
        : 0;
    const topContributors = resolveTopContributors(aggregatePositions);
    const allocation = buildAllocation(aggregatePositions, totalValueUsd);

    return {
      subjectKey: params.userId,
      walletCount: params.accounts.length,
      snapshotCount: params.snapshots.length,
      totalValueUsd,
      change24hPercent,
      topContributors,
      allocation,
      concentrationTop3Ratio: Number(
        topContributors
          .slice(0, 3)
          .reduce((sum, entry) => sum + Number(entry.allocationRatio ?? 0), 0)
          .toFixed(4),
      ),
    };
  }

  const latestByAccount = new Map<string, WalletSnapshotRow>();
  const previousByAccount = new Map<string, WalletSnapshotRow>();

  for (const account of params.accounts) {
    const accountId = typeof account.id === "string" ? account.id : null;
    if (!accountId) {
      continue;
    }

    const accountSnapshots = params.snapshots
      .filter((snapshot) => snapshot.wallet_account_id === accountId)
      .sort(
        (left, right) =>
          new Date(resolveSnapshotCapturedAt(right)).getTime() -
          new Date(resolveSnapshotCapturedAt(left)).getTime(),
      );

    const latest = accountSnapshots[0] ?? null;
    if (latest) {
      latestByAccount.set(accountId, latest);
    }

    const previous =
      accountSnapshots.find(
        (snapshot) => new Date(resolveSnapshotCapturedAt(snapshot)).getTime() <= previousCutoffMs,
      ) ??
      accountSnapshots.at(-1) ??
      null;

    if (previous) {
      previousByAccount.set(accountId, previous);
    }
  }

  const latestSnapshots = [...latestByAccount.values()];
  const positions = latestSnapshots.flatMap((snapshot) =>
    Array.isArray(snapshot.positions_json)
      ? (snapshot.positions_json as Array<Record<string, unknown>>)
      : [],
  );
  const totalValueUsd = latestSnapshots.reduce(
    (sum, snapshot) => sum + resolveSnapshotValueUsd(snapshot),
    0,
  );
  const previousTotalValueUsd = [...previousByAccount.values()].reduce(
    (sum, snapshot) => sum + resolveSnapshotValueUsd(snapshot),
    0,
  );
  const change24hPercent =
    previousTotalValueUsd > 0
      ? Number(
          (((totalValueUsd - previousTotalValueUsd) / previousTotalValueUsd) * 100).toFixed(2),
        )
      : 0;
  const topContributors = resolveTopContributors(positions);
  const allocation = buildAllocation(positions, totalValueUsd);

  return {
    subjectKey: params.userId,
    walletCount: params.accounts.length,
    snapshotCount: latestSnapshots.length,
    totalValueUsd: Number(totalValueUsd.toFixed(2)),
    change24hPercent,
    topContributors,
    allocation,
    concentrationTop3Ratio: Number(
      topContributors
        .slice(0, 3)
        .reduce((sum, entry) => sum + Number(entry.allocationRatio ?? 0), 0)
        .toFixed(4),
    ),
  };
}

function buildAssetFeatures({
  assetKey,
  source,
  now = new Date(),
}: {
  assetKey: string;
  source: AssetSource;
  now?: Date;
}) {
  const marketData = source.market_data ?? {};
  const detail = source.detail ?? {};
  const attributes = source.attributes ?? {};
  const detailMarketData = toRecord(detail.market_data) ?? {};

  const priceUsd =
    toNumber((marketData as Record<string, unknown>).current_price && toRecord((marketData as Record<string, unknown>).current_price)?.usd) ??
    toNumber(detail.current_price) ??
    toNumber(attributes.price_in_usd) ??
    toNumber(detailMarketData.current_price && toRecord(detailMarketData.current_price)?.usd) ??
    0;
  const volume24hUsd =
    toNumber((marketData as Record<string, unknown>).total_volume && toRecord((marketData as Record<string, unknown>).total_volume)?.usd) ??
    toNumber(detail.total_volume) ??
    toNumber(attributes.volume_usd) ??
    toNumber(detailMarketData.total_volume && toRecord(detailMarketData.total_volume)?.usd) ??
    0;
  const change24hPercent =
    toNumber((marketData as Record<string, unknown>).price_change_percentage_24h) ??
    toNumber(detail.price_change_percentage_24h) ??
    toNumber(attributes.price_change_percentage_24h) ??
    toNumber(detailMarketData.price_change_percentage_24h) ??
    0;
  const marketCapUsd =
    toNumber((marketData as Record<string, unknown>).market_cap && toRecord((marketData as Record<string, unknown>).market_cap)?.usd) ??
    toNumber(detail.market_cap) ??
    toNumber(attributes.market_cap_usd) ??
    toNumber(detailMarketData.market_cap && toRecord(detailMarketData.market_cap)?.usd);

  const sentimentProxy =
    change24hPercent >= 6
      ? "hot"
      : change24hPercent <= -6
        ? "cooling"
        : volume24hUsd >= 50_000_000
          ? "active"
          : "steady";

  return {
    subjectKey: assetKey,
    name: String(source.name ?? source.symbol ?? assetKey),
    symbol: String(source.symbol ?? assetKey).toUpperCase(),
    priceUsd: Number(priceUsd.toFixed(6)),
    volume24hUsd: Number(volume24hUsd.toFixed(2)),
    change24hPercent: Number(change24hPercent.toFixed(2)),
    marketCapUsd: marketCapUsd != null ? Number(marketCapUsd.toFixed(2)) : null,
    sentimentProxy,
    observedAt: nowIso(now),
  };
}

function mapToCoingeckoPlatform(chainId: number | string): string {
  const id = String(chainId).toLowerCase();
  if (id === "1") return "ethereum";
  if (id === "137") return "polygon-pos";
  if (id === "42161") return "arbitrum-one";
  if (id === "10") return "optimism";
  if (id === "8453") return "base";
  if (id === "56") return "binance-smart-chain";
  if (id === "43114") return "avalanche";
  if (id === "solana" || id === "101") return "solana";
  return "ethereum";
}

async function defaultLoadAssetSource(params: AssetInsightParams): Promise<AssetSource | null> {
  const coingeckoId =
    typeof params.coingeckoId === "string" && params.coingeckoId.trim().length > 0
      ? params.coingeckoId.trim().toLowerCase()
      : null;

  if (coingeckoId) {
    const [detail, markets] = await Promise.all([
      getCoinDetails(coingeckoId),
      getCoingeckoMarkets([coingeckoId]),
    ]);

    const marketRow = Array.isArray(markets.data) ? markets.data[0] ?? null : null;
    return {
      name: String(detail.data?.name ?? marketRow?.name ?? coingeckoId),
      symbol: String(detail.data?.symbol ?? marketRow?.symbol ?? coingeckoId),
      detail: (marketRow as Record<string, unknown> | null) ?? {},
      market_data: (detail.data?.marketData as Record<string, unknown> | undefined) ?? {},
      attributes: {},
    };
  }

  const tokenId = String(params.tokenId ?? "").trim();
  const chainId = Number(params.chainId);
  if (!tokenId || !Number.isFinite(chainId)) {
    return null;
  }

  const detail = await getCoinDataByContract(mapToCoingeckoPlatform(chainId), tokenId);
  if (!detail.data) {
    return null;
  }

  return {
    name: String(detail.data.name ?? tokenId),
    symbol: String(detail.data.symbol ?? tokenId),
    detail: detail.data as unknown as Record<string, unknown>,
    market_data: (detail.data.marketData as Record<string, unknown> | undefined) ?? {},
    attributes: {},
  };
}

async function defaultLoadFallbackArticles(): Promise<PortfolioFallbackArticle[]> {
  const response = await getMarketOverviewNewsFeed({ limit: 4 });
  return (response.data ?? [])
    .map((article) => ({
      title: article.title,
      source: article.source ?? null,
    }))
    .filter((article) => article.title.trim().length > 0);
}

async function defaultLoadPortfolioAggregate(
  userId: string,
): Promise<PortfolioAggregate | null> {
  const portfolio = await PortfolioService.getAggregatedPortfolio(userId);
  return buildWalletHomeAggregate({
    portfolio,
    request: {},
  });
}

function defaultScheduleBackgroundTask(task: () => Promise<unknown>): void {
  try {
    after(async () => {
      await task();
    });
  } catch {
    void task();
  }
}

function buildPortfolioPrompt(features: Record<string, unknown>): string {
  return [
    "Write one factual sentence about this crypto portfolio.",
    "Do not give financial advice.",
    "Stay under 160 characters.",
    "Use only the structured features below.",
    JSON.stringify(features),
  ].join("\n");
}

function buildAssetPrompt(features: Record<string, unknown>): string {
  return [
    "Write one factual sentence about this crypto asset market snapshot.",
    "Do not give financial advice.",
    "Stay under 160 characters.",
    "Use only the structured features below.",
    JSON.stringify(features),
  ].join("\n");
}

function resolvePrimaryProvider(env: NodeJS.ProcessEnv): string {
  return String(env.AI_INSIGHTS_PROVIDER ?? "openai").trim().toLowerCase();
}

function resolvePrimaryModel(env: NodeJS.ProcessEnv): string {
  return String(env.AI_INSIGHTS_MODEL ?? env.NEX_BALANCED_MODEL ?? "gpt-5-mini").trim();
}

function resolveFallbackProvider(env: NodeJS.ProcessEnv): string {
  return String(
    env.AI_INSIGHTS_FALLBACK_PROVIDER ?? env.AI_INSIGHTS_PROVIDER ?? "openai",
  )
    .trim()
    .toLowerCase();
}

function resolveFallbackModel(env: NodeJS.ProcessEnv): string {
  return String(
    env.AI_INSIGHTS_FALLBACK_MODEL ??
      env.AI_INSIGHTS_MODEL ??
      env.NEX_BALANCED_MODEL ??
      "gpt-5-mini",
  ).trim();
}

function stripProviderPrefix(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed.includes("/")) {
    return trimmed;
  }
  return trimmed.split("/").slice(1).join("/");
}

function toGatewayModelId(modelId: string): string {
  const trimmed = modelId.trim();
  return trimmed.includes("/") ? trimmed : `openai/${stripProviderPrefix(trimmed)}`;
}

function resolveInsightModel(provider: string, modelId: string) {
  switch (provider) {
    case "openai":
      return openai(stripProviderPrefix(modelId));
    case "direct":
    case "direct-openai":
      return directOpenai(stripProviderPrefix(modelId));
    case "gateway":
      return gateway(toGatewayModelId(modelId));
    default:
      throw new Error(`Unsupported AI insight provider: ${provider}`);
  }
}

async function runModelGeneration(params: {
  prompt: string;
  category: AiInsightCategory;
  env: NodeJS.ProcessEnv;
  provider: string;
  modelId: string;
}) {
  const startedAt = Date.now();
  const model = resolveInsightModel(params.provider, params.modelId);
  const result = await generateObject({
    model,
    schema: InsightOutputSchema.omit({ category: true }),
    prompt: params.prompt,
  });

  return {
    output: ensureValidInsightOutput({
      ...result.object,
      category: params.category,
    }),
    latencyMs: Date.now() - startedAt,
  };
}

function createGeneratedInsightRow(params: {
  scope: AiInsightScope;
  category: AiInsightCategory;
  inputHash: string;
  snapshotRef: string | null;
  output: ReturnType<typeof ensureValidInsightOutput>;
  provider: string;
  modelId: string;
  generationSource: string;
  latencyMs: number;
  expiresAt: string;
  userId?: string | null;
  assetKey?: string | null;
}): InsightRow {
  return {
    id: randomUUID(),
    scope: params.scope,
    category: params.category,
    sentence: params.output.sentence,
    reason_codes: params.output.reasonCodes,
    confidence: clampConfidence(params.output.confidence),
    input_hash: params.inputHash,
    snapshot_ref: params.snapshotRef,
    user_id: params.userId ?? null,
    asset_key: params.assetKey ?? null,
    provider: params.provider,
    model_id: params.modelId,
    generation_source: params.generationSource,
    latency_ms: params.latencyMs,
    expires_at: params.expiresAt,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function createPortfolioSnapshotRow(params: {
  userId: string;
  inputHash: string;
  features: ReturnType<typeof buildPortfolioFeatures>;
  expiresAt: string;
}): InsightRow {
  return {
    id: randomUUID(),
    user_id: params.userId,
    input_hash: params.inputHash,
    total_value_usd: params.features.totalValueUsd,
    change_24h_percent: params.features.change24hPercent,
    top_contributors_json: params.features.topContributors,
    allocation_json: params.features.allocation,
    features_json: params.features,
    expires_at: params.expiresAt,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function createAssetSnapshotRow(params: {
  assetKey: string;
  inputHash: string;
  features: ReturnType<typeof buildAssetFeatures>;
  expiresAt: string;
}): InsightRow {
  return {
    id: randomUUID(),
    asset_key: params.assetKey,
    input_hash: params.inputHash,
    price_usd: params.features.priceUsd,
    volume_24h_usd: params.features.volume24hUsd,
    change_24h_percent: params.features.change24hPercent,
    sentiment_proxy: params.features.sentimentProxy,
    features_json: params.features,
    expires_at: params.expiresAt,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

async function createInsightFromModel(params: GenerateInsightInput): Promise<InsightRow> {
  const primaryProvider = resolvePrimaryProvider(params.env);
  const primaryModel = resolvePrimaryModel(params.env);

  try {
    const primary = await runModelGeneration({
      prompt: params.prompt,
      category: params.category,
      env: params.env,
      provider: primaryProvider,
      modelId: primaryModel,
    });

    return createGeneratedInsightRow({
      scope: params.scope,
      category: params.category,
      inputHash: params.inputHash,
      snapshotRef: params.snapshotRef,
      output: primary.output,
      provider: primaryProvider,
      modelId: primaryModel,
      generationSource: AI_INSIGHT_GENERATION_SOURCE.PRIMARY_MODEL,
      latencyMs: primary.latencyMs,
      expiresAt: resolveInsightExpiry(params.scope, new Date(), params.env).toISOString(),
      userId: params.userId ?? null,
      assetKey: params.assetKey ?? null,
    });
  } catch (primaryError) {
    const fallbackProvider = resolveFallbackProvider(params.env);
    const fallbackModel = resolveFallbackModel(params.env);

    try {
      const secondary = await runModelGeneration({
        prompt: params.prompt,
        category: params.category,
        env: params.env,
        provider: fallbackProvider,
        modelId: fallbackModel,
      });

      return createGeneratedInsightRow({
        scope: params.scope,
        category: params.category,
        inputHash: params.inputHash,
        snapshotRef: params.snapshotRef,
        output: secondary.output,
        provider: fallbackProvider,
        modelId: fallbackModel,
        generationSource: AI_INSIGHT_GENERATION_SOURCE.FALLBACK_MODEL,
        latencyMs: secondary.latencyMs,
        expiresAt: resolveInsightExpiry(params.scope, new Date(), params.env).toISOString(),
        userId: params.userId ?? null,
        assetKey: params.assetKey ?? null,
      });
    } catch (fallbackError) {
      if (!params.fallbackOutput) {
        throw fallbackError instanceof Error ? fallbackError : primaryError;
      }

      return createGeneratedInsightRow({
        scope: params.scope,
        category: params.fallbackOutput.category,
        inputHash: params.inputHash,
        snapshotRef: params.snapshotRef,
        output: params.fallbackOutput,
        provider: "deterministic",
        modelId: "fallback-v1",
        generationSource:
          params.fallbackOutput.category === AI_INSIGHT_CATEGORY.FALLBACK_NEWS
            ? AI_INSIGHT_GENERATION_SOURCE.FALLBACK_NEWS
            : AI_INSIGHT_GENERATION_SOURCE.DETERMINISTIC_FALLBACK,
        latencyMs: 0,
        expiresAt:
          params.scope === AI_INSIGHT_SCOPE.PORTFOLIO &&
          params.fallbackOutput.category === AI_INSIGHT_CATEGORY.FALLBACK_NEWS
            ? new Date(Date.now() + FALLBACK_NEWS_TTL_HOURS * 60 * 60 * 1000).toISOString()
            : resolveInsightExpiry(params.scope, new Date(), params.env).toISOString(),
        userId: params.userId ?? null,
        assetKey: params.assetKey ?? null,
      });
    }
  }
}

function buildPortfolioInputHash(userId: string, features: Record<string, unknown>): string {
  return hashNormalizedInsightInput({
    scope: AI_INSIGHT_SCOPE.PORTFOLIO,
    subjectKey: userId,
    featureVersion: "portfolio-v1",
    features,
  });
}

function buildAssetInputHash(assetKey: string, features: Record<string, unknown>): string {
  return hashNormalizedInsightInput({
    scope: AI_INSIGHT_SCOPE.ASSET,
    subjectKey: assetKey,
    featureVersion: "asset-v1",
    features,
  });
}

async function waitForResult<T>(finder: () => Promise<T | null>, attempts = 12): Promise<T | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await finder();
    if (result) {
      return result;
    }
    await sleep(250);
  }
  return null;
}

async function withGenerationLock<T>(
  lockKey: string,
  task: () => Promise<T>,
  waitForExisting: () => Promise<T | null>,
): Promise<T | null> {
  const existing = inflightGenerations.get(lockKey);
  if (existing) {
    return existing as Promise<T | null>;
  }

  const owner = randomUUID();
  const acquired = await redis.trySetNx(lockKey, owner, LOCK_TTL_SECONDS);
  if (!acquired) {
    return waitForResult(waitForExisting);
  }

  const promise = (async () => {
    try {
      return await task();
    } finally {
      inflightGenerations.delete(lockKey);
      try {
        await redis.tryReleaseLock(lockKey, owner);
      } catch (error) {
        logger.warn("[ai-insights] Failed to release Redis lock", {
          error: error instanceof Error ? error.message : String(error),
          lockKey,
        });
      }
    }
  })();

  inflightGenerations.set(lockKey, promise);
  return promise;
}

async function queueBackgroundRefresh(
  refreshKey: string,
  scheduleBackgroundTask: (task: () => Promise<unknown>) => void,
  task: () => Promise<unknown>,
): Promise<boolean> {
  const owner = randomUUID();
  const acquired = await redis.trySetNx(refreshKey, owner, REFRESH_TTL_SECONDS);
  if (!acquired) {
    return false;
  }

  scheduleBackgroundTask(async () => {
    try {
      await task();
    } finally {
      try {
        await redis.tryReleaseLock(refreshKey, owner);
      } catch (error) {
        logger.warn("[ai-insights] Failed to release refresh lock", {
          error: error instanceof Error ? error.message : String(error),
          refreshKey,
        });
      }
    }
  });

  return true;
}

export function createAiInsightService(options: AiInsightServiceOptions = {}) {
  const env = options.env ?? process.env;
  const repository = options.repository ?? createAiInsightRepository();
  const loadAssetSource = options.loadAssetSource ?? defaultLoadAssetSource;
  const loadPortfolioAggregate =
    options.loadPortfolioAggregate ?? defaultLoadPortfolioAggregate;
  const loadFallbackArticles = options.loadFallbackArticles ?? defaultLoadFallbackArticles;
  const scheduleBackgroundTask =
    options.scheduleBackgroundTask ?? defaultScheduleBackgroundTask;

  return {
    async getHomeInsight({ userId }: { userId: string }) {
      const latest = await repository.findLatestPortfolioInsightByUser(userId);
      if (latest && isInsightFresh(String(latest.expires_at ?? null))) {
        return buildInsightDto(latest);
      }

      const existingFallback =
        await repository.findLatestPortfolioFallbackInsightByUser(userId);
      if (existingFallback && isInsightFresh(String(existingFallback.expires_at ?? null))) {
        return buildInsightDto(existingFallback);
      }

      const articles = await loadFallbackArticles();
      const fallback = buildPortfolioFallbackNewsInsight(articles);
      if (!fallback) {
        return null;
      }

      const inputHash = hashNormalizedInsightInput({
        scope: AI_INSIGHT_SCOPE.PORTFOLIO,
        subjectKey: userId,
        featureVersion: "portfolio-news-fallback-v1",
        headlines: articles.map((article) => article.title).slice(0, 4),
      });
      const existingByHash = await repository.findInsightByScopeAndInputHash(
        AI_INSIGHT_SCOPE.PORTFOLIO,
        inputHash,
      );
      if (existingByHash && isInsightFresh(String(existingByHash.expires_at ?? null))) {
        return buildInsightDto(existingByHash);
      }

      const row = await repository.saveInsight({
        id: randomUUID(),
        scope: AI_INSIGHT_SCOPE.PORTFOLIO,
        category: fallback.category,
        sentence: fallback.sentence,
        reason_codes: fallback.reasonCodes,
        confidence: fallback.confidence,
        input_hash: inputHash,
        snapshot_ref: null,
        user_id: userId,
        asset_key: null,
        provider: "deterministic",
        model_id: "fallback-news-v1",
        generation_source: AI_INSIGHT_GENERATION_SOURCE.FALLBACK_NEWS,
        latency_ms: 0,
        expires_at: new Date(
          Date.now() + FALLBACK_NEWS_TTL_HOURS * 60 * 60 * 1000,
        ).toISOString(),
        created_at: nowIso(),
        updated_at: nowIso(),
      });

      return buildInsightDto(row);
    },

    async getAssetInsight(params: AssetInsightParams) {
      const assetKey = buildAssetKey(params);
      const latest = await repository.findLatestAssetInsightByAssetKey(assetKey);
      if (!latest) {
        return this.generateAssetInsight(params);
      }

      if (isInsightFresh(String(latest.expires_at ?? null))) {
        return buildInsightDto(latest);
      }

      await queueBackgroundRefresh(
        `ai-insight-refresh:${assetKey}`,
        scheduleBackgroundTask,
        async () => {
          try {
            await this.generateAssetInsight(params);
          } catch (error) {
            logger.warn("[ai-insights] Asset refresh failed", {
              assetKey,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      );

      return buildInsightDto(latest);
    },

    async generateAssetInsight(params: AssetInsightParams) {
      const assetKey = buildAssetKey(params);
      const row = await withGenerationLock(
        `ai-insight-generate:asset:${assetKey}`,
        async () => {
          const source = await loadAssetSource(params);
          if (!source) {
            return null;
          }

          const features = buildAssetFeatures({ assetKey, source });
          const inputHash = buildAssetInputHash(assetKey, features);
          const existing = await repository.findInsightByScopeAndInputHash(
            AI_INSIGHT_SCOPE.ASSET,
            inputHash,
          );
          if (existing && isInsightFresh(String(existing.expires_at ?? null))) {
            return existing;
          }

          const expiresAt = new Date(
            Date.now() + resolveAssetInsightTtlHours(env) * 60 * 60 * 1000,
          ).toISOString();
          const snapshot = await repository.saveAssetMarketSnapshot(
            createAssetSnapshotRow({
              assetKey,
              inputHash,
              features,
              expiresAt,
            }),
          );

          const generated = await createInsightFromModel({
            scope: AI_INSIGHT_SCOPE.ASSET,
            category: AI_INSIGHT_CATEGORY.ASSET,
            prompt: buildAssetPrompt(features),
            env,
            fallbackOutput: buildAssetFallbackInsight(features),
            snapshotRef: String(snapshot.id ?? ""),
            inputHash,
            assetKey,
          });

          return repository.saveInsight(generated);
        },
        async () => repository.findLatestAssetInsightByAssetKey(assetKey),
      );

      return buildInsightDto(row);
    },

    async generatePortfolioInsightForUser(userId: string) {
      const row = await withGenerationLock(
        `ai-insight-generate:portfolio:${userId}`,
        async () => {
          const accounts = await repository.listWalletAccountsByUserId(userId);
          if (accounts.length === 0) {
            return { status: "skipped", reason: "no-wallet-accounts" };
          }

          const aggregate = await loadPortfolioAggregate(userId);
          if (!aggregate) {
            return { status: "skipped", reason: "portfolio-aggregate-unavailable" };
          }

          const walletAddresses = accounts
            .map(resolveAccountAddress)
            .filter((value): value is string => Boolean(value));
          const snapshots = await repository.listWalletSnapshotsByWalletAddresses(walletAddresses, {
            since: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          });

          const features = buildPortfolioFeatures({
            userId,
            accounts,
            snapshots,
            aggregate,
          });
          if (features.totalValueUsd <= 0) {
            return { status: "skipped", reason: "empty-portfolio" };
          }

          const inputHash = buildPortfolioInputHash(userId, features);
          const existing = await repository.findInsightByScopeAndInputHash(
            AI_INSIGHT_SCOPE.PORTFOLIO,
            inputHash,
          );
          if (existing && isInsightFresh(String(existing.expires_at ?? null))) {
            return { status: "cached", insight: buildInsightDto(existing) };
          }

          const expiresAt = resolveInsightExpiry(AI_INSIGHT_SCOPE.PORTFOLIO, new Date(), env).toISOString();
          const snapshot = await repository.savePortfolioSnapshot(
            createPortfolioSnapshotRow({
              userId,
              inputHash,
              features,
              expiresAt,
            }),
          );

          const generated = await createInsightFromModel({
            scope: AI_INSIGHT_SCOPE.PORTFOLIO,
            category: AI_INSIGHT_CATEGORY.PORTFOLIO,
            prompt: buildPortfolioPrompt(features),
            env,
            fallbackOutput: null,
            snapshotRef: String(snapshot.id ?? ""),
            inputHash,
            userId,
          });
          const saved = await repository.saveInsight(generated);
          return { status: "generated", insight: buildInsightDto(saved) };
        },
        async () => {
          const latest = await repository.findLatestPortfolioInsightByUser(userId);
          if (!latest) {
            return null;
          }
          return { status: "cached", insight: buildInsightDto(latest) };
        },
      );

      return row ?? { status: "skipped", reason: "generation-locked" };
    },

    async generatePortfolioInsightsBatch({ userIds, limit = 200, offset = 0 }: BatchPortfolioParams = {}) {
      const targetUserIds =
        Array.isArray(userIds) && userIds.length > 0
          ? userIds
          : await repository.listTrackedPortfolioUsers({ limit, offset });

      const results: Array<Record<string, unknown>> = [];
      for (const userId of targetUserIds.slice(0, limit)) {
        let attempt = 0;
        let lastError: unknown = null;

        while (attempt < 3) {
          attempt += 1;
          try {
            const result = await this.generatePortfolioInsightForUser(userId);
            results.push({ userId, attempt, ...result });
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            logger.warn("[ai-insights] Portfolio batch attempt failed", {
              userId,
              attempt,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (lastError) {
          results.push({
            userId,
            status: "failed",
            attempt: 3,
            error: lastError instanceof Error ? lastError.message : String(lastError),
          });
        }
      }

      return {
        attempted: targetUserIds.length,
        processed: results.length,
        hasMore: !userIds && targetUserIds.length === limit,
        nextOffset: offset + targetUserIds.length,
        results,
      };
    },
  };
}

let defaultAiInsightService: ReturnType<typeof createAiInsightService> | undefined;

export function getAiInsightService() {
  defaultAiInsightService ??= createAiInsightService();
  return defaultAiInsightService;
}
