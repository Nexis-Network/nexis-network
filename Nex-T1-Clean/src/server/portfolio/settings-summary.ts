import "server-only";

import {
  classifyPortfolioHolding,
  createEmptyPortfolioSummary,
  createEmptySeries,
  deriveRiskPosture,
  getAssetColor,
  getSliceColor,
  getTrackedAssetPresentation,
  normalizeAssetSymbol,
  resolveTrackedAssetSymbol,
  roundTo,
  toPercent,
  type SettingsPortfolioCategory,
  type SettingsCoreTrackedAssetSymbol,
  type SettingsPortfolioHolding,
  type SettingsPortfolioSeriesPoint,
  type SettingsPortfolioRange,
  type SettingsPortfolioSummary,
  type SettingsPortfolioWalletFilter,
  type SettingsTrackedAsset,
  type SettingsPortfolioWalletSource,
  SETTINGS_MAX_TRACKED_ASSETS,
  SETTINGS_TRACKED_ASSET_ACTIVITY_POINTS,
  SETTINGS_PORTFOLIO_RANGE_CONFIG,
  SETTINGS_TRACKED_ASSET_SYMBOLS,
} from "@/lib/portfolio/settings-summary";
import { resolveWalletChainPresentation, type WalletChainPresentation } from "@/lib/wallets/chain-presentation";
import { createLogger } from "@/server/logging/logging";
import { getEvmErc20TokenPrice } from "@/server/moralis/evm/token";
import {
  getEvmNativeBalance,
  getEvmWalletHistory,
  getEvmWalletTokenBalancesPrice,
  getEvmWalletTokenApprovals,
  mapEvmTokensToUnified,
  toUnifiedEvmChain,
  type MoralisEvmTokenApproval,
  type MoralisEvmWalletHistoryItem,
} from "@/server/moralis/evm/wallet";
import { mapSolanaPortfolioToUnifiedAssets } from "@/server/moralis/solana/wallet";
import { getWalletHistoryAggregate, type WalletHistoryEvent } from "@/server/settings/wallet-aggregator";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";
import { listCdpWalletAccountRecords, type CdpWalletAccountRecord } from "@/server/wallets/user-wallets";
import type { UnifiedFungibleAsset } from "@/types/wallet-unified";

const logger = createLogger("settings-portfolio-summary");

const SETTINGS_SUBTITLE =
  "Monitor deployed positions versus liquid reserves across your embedded EVM and Solana wallets.";

const EVM_NATIVE_WRAPPED_TOKEN: Record<number, string> = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  10: "0x4200000000000000000000000000000000000006",
  137: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  8453: "0x4200000000000000000000000000000000000006",
  42161: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  43114: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
};

type SettingsPortfolioSource = {
  accountId: string;
  address: string;
  presentation: WalletChainPresentation;
  walletSource: SettingsPortfolioWalletSource;
  platform: "evm" | "solana";
};

type CurrentHoldingInput = SettingsPortfolioHolding & {
  accountId: string;
};

type HistoryRowInput = {
  accountId: string;
  symbol: string | null;
  address: string | null;
  tokenId: string | null;
  snapshotAt: number;
  valueUsd: number;
  walletSource: SettingsPortfolioWalletSource;
};

type ActivityEventInput = {
  timestamp: number;
  symbol: string | null;
  address: string | null;
  type: WalletHistoryEvent["type"];
  volumeUsd: number;
};

type SummaryBuildInput = {
  range: SettingsPortfolioRange;
  generatedAt?: string;
  currentHoldings: CurrentHoldingInput[];
  historyRows: HistoryRowInput[];
  activityEvents: ActivityEventInput[];
  sources: SettingsPortfolioSource[];
  partial: boolean;
  trackedAssetDefinitions?: TrackedAssetDefinition[];
};

type WalletPositionHistoryRow = {
  account_id: string;
  chain_id: number | null;
  contract_address: string | null;
  token_id: string | null;
  symbol: string | null;
  quantity_usd: number | string | null;
  snapshot_at: string;
};

type TrackedAssetDefinition = {
  id: string;
  symbol: string;
  name: string;
  color: string;
  isCore: boolean;
  coreSymbol: SettingsCoreTrackedAssetSymbol | null;
  normalizedSymbol: string;
  address: string | null;
};

type TrackedAssetDiscoveryCandidate = {
  symbol: string;
  name: string;
  address: string | null;
  color: string;
  currentTotalUsd: number;
  latestActivityAt: number | null;
  hasApproval: boolean;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function formatRawBalance(balance: string | null | undefined, decimals: number): number | null {
  if (typeof balance !== "string") {
    return null;
  }

  const trimmed = balance.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }

  if (trimmed === "0") {
    return 0;
  }

  const padded = trimmed.padStart(decimals + 1, "0");
  const integerPart = padded.slice(0, -decimals) || "0";
  const fractionPart = padded.slice(-decimals).slice(0, 6).replace(/0+$/u, "");
  const formatted = fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
  const parsed = Number(formatted);
  return Number.isFinite(parsed) ? parsed : null;
}

function weightedChange(holdings: SettingsPortfolioHolding[]): number | null {
  let totalWeight = 0;
  let weighted = 0;

  for (const holding of holdings) {
    if (typeof holding.changePct24h !== "number" || !Number.isFinite(holding.changePct24h) || holding.valueUsd <= 0) {
      continue;
    }

    totalWeight += holding.valueUsd;
    weighted += holding.valueUsd * holding.changePct24h;
  }

  if (totalWeight <= 0) {
    return null;
  }

  return roundTo(weighted / totalWeight, 2);
}

function buildHoldingKey(holding: Pick<SettingsPortfolioHolding, "chain" | "walletSource" | "address" | "symbol">): string {
  return [
    holding.walletSource,
    holding.chain,
    (holding.address ?? "").toLowerCase(),
    holding.symbol.toUpperCase(),
  ].join(":");
}

function aggregateHoldings(holdings: CurrentHoldingInput[], category: SettingsPortfolioCategory): SettingsPortfolioHolding[] {
  const byKey = new Map<
    string,
    SettingsPortfolioHolding & {
      changeWeightUsd: number;
      changeWeightedSum: number;
    }
  >();

  for (const holding of holdings) {
    if (holding.category !== category || holding.valueUsd <= 0) {
      continue;
    }

    const key = buildHoldingKey(holding);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...holding,
        quantity: holding.quantity,
        priceUsd: holding.priceUsd,
        changePct24h: holding.changePct24h ?? null,
        changeWeightUsd:
          typeof holding.changePct24h === "number" && Number.isFinite(holding.changePct24h) ? holding.valueUsd : 0,
        changeWeightedSum:
          typeof holding.changePct24h === "number" && Number.isFinite(holding.changePct24h)
            ? holding.valueUsd * holding.changePct24h
            : 0,
      });
      continue;
    }

    existing.valueUsd += holding.valueUsd;
    existing.quantity = (existing.quantity ?? 0) + (holding.quantity ?? 0);
    if (typeof holding.changePct24h === "number" && Number.isFinite(holding.changePct24h)) {
      existing.changeWeightUsd += holding.valueUsd;
      existing.changeWeightedSum += holding.valueUsd * holding.changePct24h;
      existing.changePct24h = roundTo(existing.changeWeightedSum / existing.changeWeightUsd, 2);
    }
  }

  return Array.from(byKey.values())
    .map(({ changeWeightUsd: _changeWeightUsd, changeWeightedSum: _changeWeightedSum, ...holding }) => holding)
    .sort((left, right) => right.valueUsd - left.valueUsd)
    .slice(0, 5);
}

function createEmptyTrackedActivitySeries(
  range: SettingsPortfolioRange,
  color: string,
  now = Date.now(),
): SettingsPortfolioSeriesPoint[] {
  const durationMs = SETTINGS_PORTFOLIO_RANGE_CONFIG[range].durationMs;
  const points = SETTINGS_TRACKED_ASSET_ACTIVITY_POINTS[range];
  const step = durationMs / points;
  const start = now - durationMs;

  return Array.from({ length: points }, (_value, index) => ({
    timestamp: Math.round(start + step * (index + 1)),
    valueUsd: 0,
    volumeUsd: 0,
    buyVolumeUsd: 0,
    sellVolumeUsd: 0,
    buyCount: 0,
    sellCount: 0,
    color,
    empty: true,
  }));
}

function classifyActivitySide(type: WalletHistoryEvent["type"]): "buy" | "sell" | null {
  if (type === "buy" || type === "receive") {
    return "buy";
  }

  if (type === "sell" || type === "send") {
    return "sell";
  }

  return null;
}

function normalizeTrackedAssetCandidate(params: {
  symbol: string | null | undefined;
  name: string | null | undefined;
  address?: string | null;
  color?: string | null;
}): Omit<TrackedAssetDefinition, "id" | "isCore" | "coreSymbol"> | null {
  const normalizedSymbol = normalizeAssetSymbol(params.symbol);
  if (!normalizedSymbol) {
    return null;
  }

  return {
    symbol: normalizedSymbol,
    name: params.name?.trim() || normalizedSymbol,
    color: params.color?.trim() || getAssetColor(normalizedSymbol, "investment"),
    normalizedSymbol,
    address: params.address?.trim().toLowerCase() || null,
  };
}

function buildTrackedAssetDefinitions(
  currentHoldings: CurrentHoldingInput[],
  discoveryCandidates: TrackedAssetDiscoveryCandidate[],
): TrackedAssetDefinition[] {
  const coreDefinitions: TrackedAssetDefinition[] = SETTINGS_TRACKED_ASSET_SYMBOLS.map((symbol) => {
    const presentation = getTrackedAssetPresentation(symbol);
    return {
      id: symbol,
      symbol,
      name: presentation.name,
      color: presentation.color,
      isCore: true,
      coreSymbol: symbol,
      normalizedSymbol: symbol,
      address: null,
    };
  });

  const extraLimit = Math.max(0, SETTINGS_MAX_TRACKED_ASSETS - coreDefinitions.length);
  if (extraLimit === 0) {
    return coreDefinitions;
  }

  const candidates = new Map<string, TrackedAssetDiscoveryCandidate>();

  const upsertCandidate = (candidate: TrackedAssetDiscoveryCandidate | null) => {
    if (!candidate) {
      return;
    }

    const coreSymbol = resolveTrackedAssetSymbol(candidate.symbol);
    if (coreSymbol) {
      return;
    }

    const normalized = normalizeTrackedAssetCandidate(candidate);
    if (!normalized) {
      return;
    }

    const key = normalized.normalizedSymbol;
    const existing = candidates.get(key);
    if (!existing) {
      candidates.set(key, {
        symbol: normalized.symbol,
        name: normalized.name,
        address: normalized.address,
        color: normalized.color,
        currentTotalUsd: candidate.currentTotalUsd,
        latestActivityAt: candidate.latestActivityAt,
        hasApproval: candidate.hasApproval,
      });
      return;
    }

    existing.currentTotalUsd += candidate.currentTotalUsd;
    existing.latestActivityAt = Math.max(existing.latestActivityAt ?? 0, candidate.latestActivityAt ?? 0) || null;
    existing.hasApproval = existing.hasApproval || candidate.hasApproval;
    if (candidate.currentTotalUsd >= existing.currentTotalUsd) {
      existing.name = normalized.name;
      existing.color = normalized.color;
      existing.address = normalized.address ?? existing.address;
    }
  };

  for (const holding of currentHoldings) {
    upsertCandidate({
      symbol: holding.symbol,
      name: holding.name,
      address: holding.address ?? null,
      color: holding.color,
      currentTotalUsd: holding.valueUsd,
      latestActivityAt: null,
      hasApproval: false,
    });
  }

  for (const candidate of discoveryCandidates) {
    upsertCandidate(candidate);
  }

  const extraDefinitions = Array.from(candidates.values())
    .sort((left, right) => {
      if (right.currentTotalUsd !== left.currentTotalUsd) {
        return right.currentTotalUsd - left.currentTotalUsd;
      }
      if ((right.latestActivityAt ?? 0) !== (left.latestActivityAt ?? 0)) {
        return (right.latestActivityAt ?? 0) - (left.latestActivityAt ?? 0);
      }
      if (right.hasApproval !== left.hasApproval) {
        return Number(right.hasApproval) - Number(left.hasApproval);
      }
      return left.symbol.localeCompare(right.symbol);
    })
    .slice(0, extraLimit)
    .reduce<TrackedAssetDefinition[]>((definitions, candidate) => {
      const normalized = normalizeTrackedAssetCandidate(candidate);
      if (!normalized) {
        return definitions;
      }

      definitions.push({
        id: normalized.normalizedSymbol,
        symbol: normalized.symbol,
        name: normalized.name,
        color: normalized.color,
        isCore: false,
        coreSymbol: null,
        normalizedSymbol: normalized.normalizedSymbol,
        address: normalized.address,
      });
      return definitions;
    }, []);

  return [...coreDefinitions, ...extraDefinitions];
}

function matchesTrackedAssetDefinition(
  definition: TrackedAssetDefinition,
  symbol: string | null | undefined,
  address: string | null | undefined,
): boolean {
  if (definition.coreSymbol) {
    return resolveTrackedAssetSymbol(symbol) === definition.coreSymbol;
  }

  const normalizedSymbol = normalizeAssetSymbol(symbol);
  if (normalizedSymbol && normalizedSymbol === definition.normalizedSymbol) {
    return true;
  }

  return Boolean(definition.address && address && definition.address === address.trim().toLowerCase());
}

function buildTrackedAssetSeries(params: {
  range: SettingsPortfolioRange;
  definition: TrackedAssetDefinition;
  activityEvents: ActivityEventInput[];
  now?: number;
}): SettingsPortfolioSeriesPoint[] {
  const durationMs = SETTINGS_PORTFOLIO_RANGE_CONFIG[params.range].durationMs;
  const pointCount = SETTINGS_TRACKED_ASSET_ACTIVITY_POINTS[params.range];
  const now = params.now ?? Date.now();
  const start = now - durationMs;
  const step = durationMs / pointCount;
  const emptySeries = createEmptyTrackedActivitySeries(params.range, params.definition.color, now);
  const buckets = Array.from({ length: pointCount }, () => ({
    volumeUsd: 0,
    buyVolumeUsd: 0,
    sellVolumeUsd: 0,
    buyCount: 0,
    sellCount: 0,
  }));

  for (const event of params.activityEvents) {
    if (event.timestamp < start || event.timestamp > now) {
      continue;
    }

    if (!matchesTrackedAssetDefinition(params.definition, event.symbol, event.address)) {
      continue;
    }

    const bucketIndex = Math.min(
      pointCount - 1,
      Math.max(0, Math.floor((event.timestamp - start) / step)),
    );
    const bucket = buckets[bucketIndex];
    const side = classifyActivitySide(event.type);
    const volumeUsd = Math.max(0, roundTo(event.volumeUsd));

    bucket.volumeUsd += volumeUsd;
    if (side === "buy") {
      bucket.buyVolumeUsd += volumeUsd;
      bucket.buyCount += 1;
    } else if (side === "sell") {
      bucket.sellVolumeUsd += volumeUsd;
      bucket.sellCount += 1;
    }
  }

  return emptySeries.map((point, index) => {
    const bucket = buckets[index];
    const volumeUsd = roundTo(bucket.volumeUsd);
    const buyVolumeUsd = roundTo(bucket.buyVolumeUsd);
    const sellVolumeUsd = roundTo(bucket.sellVolumeUsd);

    return {
      ...point,
      valueUsd: volumeUsd,
      volumeUsd,
      buyVolumeUsd,
      sellVolumeUsd,
      buyCount: bucket.buyCount,
      sellCount: bucket.sellCount,
      color: volumeUsd > 0 ? params.definition.color : point.color,
      empty: volumeUsd <= 0,
    };
  });
}

function buildTrackedAssets(params: {
  range: SettingsPortfolioRange;
  currentHoldings: CurrentHoldingInput[];
  activityEvents: ActivityEventInput[];
  trackedAssetDefinitions: TrackedAssetDefinition[];
}): SettingsTrackedAsset[] {
  const trackedTotals = new Map<
    string,
    {
      totalUsd: number;
      quantity: number;
      priceWeightUsd: number;
      priceWeightedSum: number;
      changeWeightUsd: number;
      changeWeightedSum: number;
    }
  >(
    params.trackedAssetDefinitions.map((definition) => [
      definition.id,
      {
        totalUsd: 0,
        quantity: 0,
        priceWeightUsd: 0,
        priceWeightedSum: 0,
        changeWeightUsd: 0,
        changeWeightedSum: 0,
      },
    ]),
  );

  for (const holding of params.currentHoldings) {
    const definition = params.trackedAssetDefinitions.find((candidate) =>
      matchesTrackedAssetDefinition(candidate, holding.symbol, holding.address),
    );
    if (!definition) {
      continue;
    }

    const bucket = trackedTotals.get(definition.id);
    if (!bucket) {
      continue;
    }

    bucket.totalUsd += holding.valueUsd;
    if (typeof holding.quantity === "number" && Number.isFinite(holding.quantity)) {
      bucket.quantity += holding.quantity;
    }

    if (typeof holding.priceUsd === "number" && Number.isFinite(holding.priceUsd)) {
      bucket.priceWeightUsd += holding.valueUsd;
      bucket.priceWeightedSum += holding.valueUsd * holding.priceUsd;
    }

    if (typeof holding.changePct24h === "number" && Number.isFinite(holding.changePct24h)) {
      bucket.changeWeightUsd += holding.valueUsd;
      bucket.changeWeightedSum += holding.valueUsd * holding.changePct24h;
    }
  }

  return params.trackedAssetDefinitions.map((definition) => {
    const bucket = trackedTotals.get(definition.id);
    const totalUsd = roundTo(bucket?.totalUsd ?? 0);
    const quantity = roundTo(bucket?.quantity ?? 0, definition.coreSymbol === "ETH" || definition.coreSymbol === "SOL" ? 4 : 2);
    const priceUsd =
      bucket != null && bucket.priceWeightUsd > 0
        ? roundTo(bucket.priceWeightedSum / bucket.priceWeightUsd, 6)
        : null;
    const changePct24h =
      bucket != null && bucket.changeWeightUsd > 0 ? roundTo(bucket.changeWeightedSum / bucket.changeWeightUsd, 2) : null;

    return {
      id: definition.id,
      symbol: definition.symbol,
      name: definition.name,
      totalUsd,
      quantity,
      priceUsd,
      changePct24h,
      color: definition.color,
      series: buildTrackedAssetSeries({
        range: params.range,
        definition,
        activityEvents: params.activityEvents,
      }),
      isCore: definition.isCore,
      coreSymbol: definition.coreSymbol,
    };
  });
}

function buildTrackedAssetDiscoveryCandidate(params: {
  symbol: string | null | undefined;
  name: string | null | undefined;
  address?: string | null;
  color?: string | null;
  currentTotalUsd?: number;
  latestActivityAt?: number | null;
  hasApproval?: boolean;
}): TrackedAssetDiscoveryCandidate | null {
  const normalized = normalizeTrackedAssetCandidate(params);
  if (!normalized) {
    return null;
  }

  return {
    symbol: normalized.symbol,
    name: normalized.name,
    address: normalized.address,
    color: normalized.color,
    currentTotalUsd: Math.max(0, roundTo(params.currentTotalUsd ?? 0)),
    latestActivityAt: params.latestActivityAt ?? null,
    hasApproval: params.hasApproval ?? false,
  };
}

function buildApprovalDiscoveryCandidate(approval: MoralisEvmTokenApproval): TrackedAssetDiscoveryCandidate | null {
  return buildTrackedAssetDiscoveryCandidate({
    symbol: toNonEmptyString(approval.token_symbol),
    name: toNonEmptyString(approval.token_name, approval.token_symbol),
    address: toNonEmptyString(approval.token_address),
    hasApproval: true,
  });
}

function buildHistoryDiscoveryCandidate(item: MoralisEvmWalletHistoryItem): TrackedAssetDiscoveryCandidate | null {
  const timestamp = Date.parse(toNonEmptyString(item.block_timestamp, item.blockTimestamp, item.timestamp) ?? "");

  return buildTrackedAssetDiscoveryCandidate({
    symbol: toNonEmptyString(item.symbol, item.token_symbol, item.asset_symbol),
    name: toNonEmptyString(item.token_name, item.asset_name, item.symbol, item.token_symbol),
    address: toNonEmptyString(item.token_address, item.contract_address, item.token_contract_address),
    latestActivityAt: Number.isNaN(timestamp) ? null : timestamp,
  });
}

function buildChainBreakdown(holdings: CurrentHoldingInput[], totalPortfolioUsd: number) {
  const byChain = new Map<string, { chain: string; chainIcon: string | null; totalUsd: number }>();

  for (const holding of holdings) {
    if (holding.valueUsd <= 0) {
      continue;
    }

    const existing = byChain.get(holding.chain);
    if (existing) {
      existing.totalUsd += holding.valueUsd;
      continue;
    }

    byChain.set(holding.chain, {
      chain: holding.chain,
      chainIcon: holding.chainIcon,
      totalUsd: holding.valueUsd,
    });
  }

  return Array.from(byChain.values())
    .map((entry) => ({
      ...entry,
      totalUsd: roundTo(entry.totalUsd),
      allocationPct: toPercent(entry.totalUsd, totalPortfolioUsd),
    }))
    .sort((left, right) => right.totalUsd - left.totalUsd);
}

function historyAssetKey(row: HistoryRowInput): string {
  return [
    row.accountId,
    (row.address ?? "").toLowerCase(),
    row.tokenId ?? "",
    row.symbol ?? "",
  ].join(":");
}

function buildSliceSeries(params: {
  range: SettingsPortfolioRange;
  color: string;
  category: SettingsPortfolioCategory;
  historyRows: HistoryRowInput[];
  currentTotal: number;
  now?: number;
}): SettingsPortfolioSeriesPoint[] {
  const config = SETTINGS_PORTFOLIO_RANGE_CONFIG[params.range];
  const now = params.now ?? Date.now();
  const start = now - config.durationMs;
  const step = config.durationMs / config.points;
  const buckets = Array.from({ length: config.points }, () => new Map<string, HistoryRowInput>());
  const emptySeries = createEmptySeries(params.range, params.color, now);

  for (const row of params.historyRows) {
    if (row.snapshotAt < start || row.snapshotAt > now) {
      continue;
    }

    const bucketIndex = Math.min(
      config.points - 1,
      Math.max(0, Math.floor((row.snapshotAt - start) / step)),
    );
    const assetKey = historyAssetKey(row);
    const existing = buckets[bucketIndex].get(assetKey);
    if (!existing || row.snapshotAt >= existing.snapshotAt) {
      buckets[bucketIndex].set(assetKey, row);
    }
  }

  const rawValues = buckets.map((bucket) => {
    let total = 0;

    for (const row of bucket.values()) {
      const category = classifyPortfolioHolding({
        symbol: row.symbol,
        address: row.address,
        walletSource: row.walletSource,
      });

      if (category === params.category) {
        total += row.valueUsd;
      }
    }

    return roundTo(total);
  });

  if (rawValues.every((value) => value <= 0)) {
    const lastPoint = emptySeries[emptySeries.length - 1];
    if (lastPoint && params.currentTotal > 0) {
      lastPoint.valueUsd = roundTo(params.currentTotal);
      lastPoint.empty = false;
      lastPoint.color = params.color;
    }
    return emptySeries;
  }

  const values = [...rawValues];
  let lastKnown: number | null = null;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] > 0) {
      lastKnown = values[index];
      continue;
    }

    if (lastKnown != null) {
      values[index] = lastKnown;
    }
  }

  if (params.currentTotal > 0) {
    values[values.length - 1] = roundTo(params.currentTotal);
  }

  return values.map((value, index) => ({
    timestamp: emptySeries[index]?.timestamp ?? Math.round(start + step * index),
    valueUsd: value,
    color: value > 0 ? params.color : emptySeries[index]?.color ?? params.color,
    empty: value <= 0,
  }));
}

function buildWalletSummary(sources: SettingsPortfolioSource[]) {
  const evmSources = sources.filter((source) => source.walletSource === "cdp-embedded-evm");
  const solanaSources = sources.filter((source) => source.walletSource === "cdp-embedded-solana");

  return {
    hasWallets: sources.length > 0,
    evmAddress: evmSources[0]?.address ?? null,
    solanaAddress: solanaSources[0]?.address ?? null,
    evmCount: evmSources.length,
    solanaCount: solanaSources.length,
  };
}

export function buildSettingsPortfolioSummaryModel(input: SummaryBuildInput): SettingsPortfolioSummary {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const walletSummary = buildWalletSummary(input.sources);

  if (input.sources.length === 0) {
    return createEmptyPortfolioSummary({
      range: input.range,
      generatedAt,
      emptyReason: "no-wallets",
      message: "Provision a Nex Wallet to load allocation analytics.",
      wallets: walletSummary,
    });
  }

  const currentHoldings = input.currentHoldings.filter((holding) => holding.valueUsd > 0);
  if (currentHoldings.length === 0) {
    const summary = createEmptyPortfolioSummary({
      range: input.range,
      generatedAt,
      emptyReason: "no-holdings",
      message: "No funded positions detected yet. Deposit assets to start tracking allocation history.",
      wallets: walletSummary,
    });

    if (input.trackedAssetDefinitions?.length) {
      summary.trackedAssets = buildTrackedAssets({
        range: input.range,
        currentHoldings: [],
        activityEvents: input.activityEvents,
        trackedAssetDefinitions: input.trackedAssetDefinitions,
      });
    }

    return summary;
  }

  const totalPortfolioUsd = roundTo(
    currentHoldings.reduce((sum, holding) => sum + holding.valueUsd, 0),
  );
  const investmentHoldings = aggregateHoldings(currentHoldings, "investment");
  const stablecoinHoldings = aggregateHoldings(currentHoldings, "stablecoin");
  const trackedAssetDefinitions = input.trackedAssetDefinitions ?? buildTrackedAssetDefinitions(currentHoldings, []);
  const trackedAssets = buildTrackedAssets({
    range: input.range,
    currentHoldings,
    activityEvents: input.activityEvents,
    trackedAssetDefinitions,
  });
  const investmentsTotal = roundTo(
    investmentHoldings.reduce((sum, holding) => sum + holding.valueUsd, 0),
  );
  const stablecoinsTotal = roundTo(
    stablecoinHoldings.reduce((sum, holding) => sum + holding.valueUsd, 0),
  );
  const chains = buildChainBreakdown(currentHoldings, totalPortfolioUsd);
  const largestAsset =
    [...investmentHoldings, ...stablecoinHoldings].sort((left, right) => right.valueUsd - left.valueUsd)[0] ?? null;
  const totalDeltaPct = weightedChange(currentHoldings);

  return {
    status: input.partial ? "partial" : "ready",
    emptyReason: null,
    range: input.range,
    generatedAt,
    totalPortfolioUsd,
    totalDeltaPct,
    activeChainsCount: chains.length,
    largestAsset,
    riskPosture: deriveRiskPosture(toPercent(stablecoinsTotal, totalPortfolioUsd)),
    subtitle: SETTINGS_SUBTITLE,
    message: input.partial ? "Some wallet sources are temporarily unavailable. Showing the latest successful allocation snapshot." : null,
    wallets: walletSummary,
    chains,
    trackedAssets,
    slices: {
      investments: {
        label: "Investments",
        totalUsd: investmentsTotal,
        changePct: weightedChange(investmentHoldings),
        allocationPct: toPercent(investmentsTotal, totalPortfolioUsd),
        series: buildSliceSeries({
          range: input.range,
          color: getSliceColor("Investments"),
          category: "investment",
          historyRows: input.historyRows,
          currentTotal: investmentsTotal,
        }),
        holdings: investmentHoldings,
      },
      stablecoins: {
        label: "Stablecoins",
        totalUsd: stablecoinsTotal,
        changePct: weightedChange(stablecoinHoldings),
        allocationPct: toPercent(stablecoinsTotal, totalPortfolioUsd),
        series: buildSliceSeries({
          range: input.range,
          color: getSliceColor("Stablecoins"),
          category: "stablecoin",
          historyRows: input.historyRows,
          currentTotal: stablecoinsTotal,
        }),
        holdings: stablecoinHoldings,
      },
    },
  };
}

function resolveSources(records: CdpWalletAccountRecord[]): SettingsPortfolioSource[] {
  const seen = new Set<string>();
  const sources: SettingsPortfolioSource[] = [];

  for (const record of records) {
    const address = typeof record.address === "string" ? record.address.trim() : "";
    if (!address) {
      continue;
    }

    const platform = record.platform?.trim().toLowerCase() === "solana" ? "solana" : "evm";
    const presentation = resolveWalletChainPresentation(
      platform === "solana"
        ? { platform: "solana", network: "mainnet" }
        : { platform: "evm", chainId: record.chain_id },
    );

    const uniqueKey = [platform, presentation.chainId ?? "solana", address.toLowerCase()].join(":");
    if (seen.has(uniqueKey)) {
      continue;
    }
    seen.add(uniqueKey);

    sources.push({
      accountId: record.id,
      address,
      presentation,
      walletSource: platform === "solana" ? "cdp-embedded-solana" : "cdp-embedded-evm",
      platform,
    });
  }

  return sources;
}

function filterSourcesByWalletScope(
  sources: SettingsPortfolioSource[],
  walletScope: SettingsPortfolioWalletFilter,
): SettingsPortfolioSource[] {
  if (walletScope === "all") {
    return sources;
  }

  return sources.filter((source) => source.walletSource === walletScope);
}

function toHoldingFromUnifiedAsset(params: {
  asset: UnifiedFungibleAsset;
  source: SettingsPortfolioSource;
}): CurrentHoldingInput | null {
  const { asset, source } = params;
  const valueUsd = toNumber(asset.valueUsd);
  if (!valueUsd || valueUsd <= 0) {
    return null;
  }

  const symbol = (asset.symbol ?? source.presentation.nativeSymbol ?? "Asset").trim();
  const name = (asset.name ?? symbol).trim();
  const category = classifyPortfolioHolding({
    symbol,
    name,
    address: asset.address,
    walletSource: source.walletSource,
  });

  return {
    accountId: source.accountId,
    symbol,
    name,
    chain: source.presentation.chainName,
    chainIcon: source.presentation.chainIcon,
    category,
    valueUsd: roundTo(valueUsd),
    quantity:
      toNumber(asset.balanceFormatted) ??
      formatRawBalance(asset.balance, asset.decimals ?? (asset.kind === "native" ? 18 : 0)) ??
      undefined,
    priceUsd: toNumber(asset.priceUsd) ?? undefined,
    changePct24h: toNumber(asset.change24hPercent),
    walletSource: source.walletSource,
    address: asset.address,
    color: getAssetColor(symbol, category),
  };
}

async function fetchEvmHoldings(source: SettingsPortfolioSource): Promise<CurrentHoldingInput[]> {
  const moralisChain = source.presentation.moralisChain ?? source.presentation.chainId ?? undefined;
  const wrappedNativeAddress =
    source.presentation.chainId != null ? EVM_NATIVE_WRAPPED_TOKEN[source.presentation.chainId] : undefined;

  const [tokens, nativeBalance, wrappedNativePrice] = await Promise.all([
    getEvmWalletTokenBalancesPrice({
      address: source.address,
      chain: moralisChain,
      excludeSpam: true,
      excludeUnverified: true,
    }),
    getEvmNativeBalance({
      address: source.address,
      chain: moralisChain,
    }),
    wrappedNativeAddress
      ? getEvmErc20TokenPrice({
          address: wrappedNativeAddress,
          chain: moralisChain,
          include24hrPercentChange: true,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const chain = toUnifiedEvmChain(moralisChain);
  const unifiedTokens = mapEvmTokensToUnified(tokens, chain);
  const holdings = unifiedTokens
    .filter((asset) => asset.isSpam !== true)
    .map((asset) => toHoldingFromUnifiedAsset({ asset, source }))
    .filter((asset): asset is CurrentHoldingInput => asset !== null);

  const nativeQuantity =
    toNumber(nativeBalance.balance_formatted) ?? formatRawBalance(nativeBalance.balance ?? "0", 18);
  const nativePriceUsd = wrappedNativePrice?.usdPrice ?? null;
  const nativeValueUsd =
    typeof nativeQuantity === "number" && Number.isFinite(nativeQuantity) && typeof nativePriceUsd === "number"
      ? nativeQuantity * nativePriceUsd
      : 0;

  if (nativeValueUsd > 0) {
    const category = classifyPortfolioHolding({
      symbol: source.presentation.nativeSymbol,
      name: source.presentation.chainName,
      walletSource: source.walletSource,
    });

    holdings.push({
      accountId: source.accountId,
      symbol: source.presentation.nativeSymbol,
      name: source.presentation.chainName,
      chain: source.presentation.chainName,
      chainIcon: source.presentation.chainIcon,
      category,
      valueUsd: roundTo(nativeValueUsd),
      quantity: nativeQuantity ?? undefined,
      priceUsd: nativePriceUsd ?? undefined,
      changePct24h: toNumber(wrappedNativePrice?.["24hrPercentChange"]),
      walletSource: source.walletSource,
      address: null,
      color: getAssetColor(source.presentation.nativeSymbol, category),
    });
  }

  return holdings;
}

async function fetchSolanaHoldings(source: SettingsPortfolioSource): Promise<CurrentHoldingInput[]> {
  const summary = await fetchNexSolanaWalletSummary(source.address, {
    includeTokens: true,
    includeNfts: false,
    includeTransactions: false,
    skipCache: false,
  });

  const chain = { kind: "solana", network: "mainnet" } as const;
  const unifiedAssets = mapSolanaPortfolioToUnifiedAssets({ assets: summary.tokens }, chain);
  const holdings = unifiedAssets
    .filter((asset) => asset.isSpam !== true)
    .map((asset) => toHoldingFromUnifiedAsset({ asset, source }))
    .filter((asset): asset is CurrentHoldingInput => asset !== null);

  const hasNativeHolding = holdings.some((holding) => holding.symbol === "SOL");
  if (!hasNativeHolding) {
    const referenceAsset = unifiedAssets.find(
      (asset) => asset.symbol?.toUpperCase() === "SOL" || asset.symbol?.toUpperCase() === "WSOL",
    );
    const nativeQuantity =
      typeof referenceAsset?.balanceFormatted === "string"
        ? Number(referenceAsset.balanceFormatted)
        : formatRawBalance(
            typeof referenceAsset?.balance === "string" ? referenceAsset.balance : "0",
            9,
          );
    const priceUsd = toNumber(referenceAsset?.priceUsd);
    const nativeValueUsd =
      typeof nativeQuantity === "number" && Number.isFinite(nativeQuantity) && typeof priceUsd === "number"
        ? nativeQuantity * priceUsd
        : 0;

    if (nativeValueUsd > 0) {
      const category = classifyPortfolioHolding({
        symbol: "SOL",
        walletSource: source.walletSource,
      });

      holdings.push({
        accountId: source.accountId,
        symbol: "SOL",
        name: "Solana",
        chain: source.presentation.chainName,
        chainIcon: source.presentation.chainIcon,
        category,
        valueUsd: roundTo(nativeValueUsd),
        quantity: nativeQuantity ?? undefined,
        priceUsd: priceUsd ?? undefined,
        changePct24h: null,
        walletSource: source.walletSource,
        address: null,
        color: getAssetColor("SOL", category),
      });
    }
  }

  return holdings;
}

async function fetchCurrentHoldings(source: SettingsPortfolioSource): Promise<CurrentHoldingInput[]> {
  return source.platform === "solana" ? fetchSolanaHoldings(source) : fetchEvmHoldings(source);
}

async function fetchTrackedAssetDiscoveryCandidates(
  source: SettingsPortfolioSource,
): Promise<TrackedAssetDiscoveryCandidate[]> {
  if (source.platform !== "evm") {
    return [];
  }

  const moralisChain = source.presentation.moralisChain ?? source.presentation.chainId ?? undefined;
  const [approvalsResult, historyResult] = await Promise.allSettled([
    getEvmWalletTokenApprovals({
      address: source.address,
      chain: moralisChain,
      limit: 50,
    }),
    getEvmWalletHistory({
      address: source.address,
      chain: moralisChain,
      limit: 50,
      includeDecoded: false,
      includeInternalTransactions: false,
    }),
  ]);

  const candidates: TrackedAssetDiscoveryCandidate[] = [];

  if (approvalsResult.status === "fulfilled") {
    candidates.push(
      ...approvalsResult.value.items
        .map((item) => buildApprovalDiscoveryCandidate(item))
        .filter((item): item is TrackedAssetDiscoveryCandidate => item !== null),
    );
  } else {
    logger.debugExpectedError("wallet_approval_discovery_failed", approvalsResult.reason, {
      accountId: source.accountId,
      address: source.address,
    });
  }

  if (historyResult.status === "fulfilled") {
    candidates.push(
      ...historyResult.value.items
        .map((item) => buildHistoryDiscoveryCandidate(item))
        .filter((item): item is TrackedAssetDiscoveryCandidate => item !== null),
    );
  } else {
    logger.debugExpectedError("wallet_history_discovery_failed", historyResult.reason, {
      accountId: source.accountId,
      address: source.address,
    });
  }

  return candidates;
}

function matchesTrackedActivitySource(
  event: WalletHistoryEvent,
  evmAddresses: Set<string>,
  solanaAddresses: Set<string>,
): boolean {
  if (event.source !== "evm" && event.source !== "solana") {
    return false;
  }

  if (typeof event.walletAddress !== "string" || event.walletAddress.trim().length === 0) {
    return false;
  }

  const trimmedAddress = event.walletAddress.trim();
  if (evmAddresses.has(trimmedAddress.toLowerCase())) {
    return true;
  }

  return solanaAddresses.has(trimmedAddress);
}

async function fetchTrackedAssetActivityEvents(params: {
  userId: string;
  sources: SettingsPortfolioSource[];
  range: SettingsPortfolioRange;
}): Promise<ActivityEventInput[]> {
  if (params.sources.length === 0) {
    return [];
  }

  const rangeStart = Date.now() - SETTINGS_PORTFOLIO_RANGE_CONFIG[params.range].durationMs;
  const evmAddresses = new Set(
    params.sources
      .filter((source) => source.platform === "evm")
      .map((source) => source.address.trim().toLowerCase())
      .filter(Boolean),
  );
  const solanaAddresses = new Set(
    params.sources
      .filter((source) => source.platform === "solana")
      .map((source) => source.address.trim())
      .filter(Boolean),
  );

  try {
    const aggregate = await getWalletHistoryAggregate(params.userId);

    return aggregate.events
      .map((event) => {
        if (typeof event.timestamp !== "number" || !Number.isFinite(event.timestamp) || event.timestamp < rangeStart) {
          return null;
        }

        if (!matchesTrackedActivitySource(event, evmAddresses, solanaAddresses)) {
          return null;
        }

        const symbol = typeof event.symbol === "string" && event.symbol.trim().length > 0 ? event.symbol : null;
        const address =
          typeof event.tokenAddress === "string" && event.tokenAddress.trim().length > 0
            ? event.tokenAddress
            : null;

        if (!symbol && !address) {
          return null;
        }

        return {
          timestamp: event.timestamp,
          symbol,
          address,
          type: event.type,
          volumeUsd:
            typeof event.priceUsd === "number" && Number.isFinite(event.priceUsd) ? Math.abs(event.priceUsd) : 0,
        } satisfies ActivityEventInput;
      })
      .filter((event): event is ActivityEventInput => event !== null);
  } catch (error) {
    logger.warn("tracked_asset_activity_fetch_failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId,
    });
    return [];
  }
}

async function fetchHistoryRows(
  sources: SettingsPortfolioSource[],
  range: SettingsPortfolioRange,
): Promise<HistoryRowInput[]> {
  if (sources.length === 0) {
    return [];
  }

  const config = SETTINGS_PORTFOLIO_RANGE_CONFIG[range];
  const startIso = new Date(Date.now() - config.durationMs).toISOString();
  const sourceByAccount = new Map(sources.map((source) => [source.accountId, source]));
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("wallet_position_history")
    .select("account_id,chain_id,contract_address,token_id,symbol,quantity_usd,snapshot_at")
    .in(
      "account_id",
      sources.map((source) => source.accountId),
    )
    .gte("snapshot_at", startIso)
    .order("snapshot_at", { ascending: true })
    .returns<WalletPositionHistoryRow[]>();

  if (error) {
    logger.warn("wallet_position_history_query_failed", { error: error.message });
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const source = sourceByAccount.get(row.account_id);
      const valueUsd = toNumber(row.quantity_usd) ?? 0;
      const snapshotAt = Date.parse(row.snapshot_at);
      if (!source || valueUsd <= 0 || Number.isNaN(snapshotAt)) {
        return null;
      }

      return {
        accountId: row.account_id,
        symbol: row.symbol,
        address: row.contract_address,
        tokenId: row.token_id,
        snapshotAt,
        valueUsd,
        walletSource: source.walletSource,
      } satisfies HistoryRowInput;
    })
    .filter((row): row is HistoryRowInput => row !== null);
}

export async function getSettingsPortfolioSummary(params: {
  userId: string;
  range: SettingsPortfolioRange;
  walletScope?: SettingsPortfolioWalletFilter;
}): Promise<SettingsPortfolioSummary> {
  const records = await listCdpWalletAccountRecords(params.userId);
  const sources = filterSourcesByWalletScope(
    resolveSources(records),
    params.walletScope ?? "all",
  );

  if (sources.length === 0) {
    return buildSettingsPortfolioSummaryModel({
      range: params.range,
      sources: [],
      currentHoldings: [],
      historyRows: [],
      activityEvents: [],
      partial: false,
    });
  }

  const results = await Promise.allSettled(
    sources.map(async (source) => ({
      source,
      holdings: await fetchCurrentHoldings(source),
      discoveryCandidates: await fetchTrackedAssetDiscoveryCandidates(source),
    })),
  );

  const successful = results
    .filter((result): result is PromiseFulfilledResult<{
      source: SettingsPortfolioSource;
      holdings: CurrentHoldingInput[];
      discoveryCandidates: TrackedAssetDiscoveryCandidate[];
    }> => result.status === "fulfilled")
    .map((result) => result.value);

  const partial = successful.length > 0 && successful.length < sources.length;
  if (successful.length === 0) {
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("wallet_summary_fetch_failed", {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
    throw new Error("Unable to load wallet allocation data");
  }

  const successfulSources = successful.map((entry) => entry.source);
  const [historyRows, activityEvents] = await Promise.all([
    fetchHistoryRows(successfulSources, params.range),
    fetchTrackedAssetActivityEvents({
      userId: params.userId,
      sources: successfulSources,
      range: params.range,
    }),
  ]);
  const currentHoldings = successful.flatMap((entry) => entry.holdings);
  const trackedAssetDefinitions = buildTrackedAssetDefinitions(
    currentHoldings,
    successful.flatMap((entry) => entry.discoveryCandidates),
  );

  return buildSettingsPortfolioSummaryModel({
    range: params.range,
    generatedAt: new Date().toISOString(),
    currentHoldings,
    historyRows,
    activityEvents,
    sources: successfulSources,
    partial,
    trackedAssetDefinitions,
  });
}
