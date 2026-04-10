import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { WatchlistItemSnapshot, WatchlistQuote } from "@/types/watchlist";
import type { JsonObject } from "@/types/json";

export type WatchlistAlertRecord = {
  watchlist_item_id: string;
  trigger_type: "price" | "volume";
  direction: "up" | "down";
  change_percent: number;
  previous_value: number;
  current_value: number;
  threshold_percent: number;
  vs_currency: string;
  message: string;
  metadata: JsonObject;
};

export type WatchlistItemUpdatePayload = {
  id: string;
  last_price?: number | null;
  last_price_change_pct?: number | null;
  last_volume?: number | null;
  last_volume_change_pct?: number | null;
  last_snapshot_at?: string | null;
  price_baseline?: number | null;
  price_baseline_at?: string | null;
  volume_baseline?: number | null;
  volume_baseline_at?: string | null;
};

export type WatchlistEvaluationResult = {
  alerts: WatchlistAlertRecord[];
  updates: WatchlistItemUpdatePayload[];
};

export type WatchlistRuleEvaluationInput = {
  ruleType: "price_percent" | "volume_percent";
  direction: "above" | "below";
  thresholdPercent: number;
};

export type WatchlistRuleEvaluationResult = {
  alert: WatchlistAlertRecord | null;
  updates: WatchlistItemUpdatePayload;
};

const DEFAULT_PRICE_THRESHOLD = 5;
const DEFAULT_VOLUME_THRESHOLD = 5;

export function evaluateWatchlistItems(
  items: WatchlistItemSnapshot[],
  quotes: Map<string, WatchlistQuote>,
  vsCurrency: string,
  thresholds?: { pricePercent?: number; volumePercent?: number },
): WatchlistEvaluationResult {
  const now = new Date().toISOString();
  const priceThreshold = thresholds?.pricePercent ?? DEFAULT_PRICE_THRESHOLD;
  const volumeThreshold = thresholds?.volumePercent ?? DEFAULT_VOLUME_THRESHOLD;

  const alerts: WatchlistAlertRecord[] = [];
  const updates: WatchlistItemUpdatePayload[] = [];

  for (const item of items) {
    const quote = quotes.get(keyFor(item.assetId, item.assetType));
    if (!quote) {
      continue;
    }

    const update: WatchlistItemUpdatePayload = { id: item.id };

    if (typeof quote.price === "number") {
      update.last_price = quote.price;
      update.last_price_change_pct = quote.priceChangePct ?? null;
    }
    if (typeof quote.volume24h === "number") {
      update.last_volume = quote.volume24h;
      update.last_volume_change_pct = quote.priceChangePct ?? null;
    }
    update.last_snapshot_at = quote.updatedAt ?? now;

    if (typeof quote.price === "number" && Number.isFinite(quote.price) && quote.price > 0) {
      const baseline = resolveBaseline(item.priceBaseline, quote.price);
      if (baseline.shouldPersistBaseline) {
        update.price_baseline = baseline.nextBaseline;
        update.price_baseline_at = now;
      }

      const { changePercent, shouldAlert } = computeChangePercent(baseline.current, quote.price, priceThreshold);
      if (shouldAlert && changePercent !== null) {
        const direction = changePercent >= 0 ? "up" : "down";
        alerts.push({
          watchlist_item_id: item.id,
          trigger_type: "price",
          direction,
          change_percent: changePercent,
          previous_value: baseline.current,
          current_value: quote.price,
          threshold_percent: priceThreshold,
          vs_currency: vsCurrency,
          message: buildAlertMessage(item, direction, changePercent, quote.price, vsCurrency, "price"),
          metadata: buildMetadata(item, quote, "price"),
        });
        update.price_baseline = quote.price;
        update.price_baseline_at = now;
      }
    }

    if (typeof quote.volume24h === "number" && Number.isFinite(quote.volume24h) && quote.volume24h > 0) {
      const baseline = resolveBaseline(item.volumeBaseline, quote.volume24h);
      if (baseline.shouldPersistBaseline) {
        update.volume_baseline = baseline.nextBaseline;
        update.volume_baseline_at = now;
      }
      const { changePercent, shouldAlert } = computeChangePercent(
        baseline.current,
        quote.volume24h,
        volumeThreshold,
      );
      if (shouldAlert && changePercent !== null) {
        const direction = changePercent >= 0 ? "up" : "down";
        alerts.push({
          watchlist_item_id: item.id,
          trigger_type: "volume",
          direction,
          change_percent: changePercent,
          previous_value: baseline.current,
          current_value: quote.volume24h,
          threshold_percent: volumeThreshold,
          vs_currency: vsCurrency,
          message: buildAlertMessage(item, direction, changePercent, quote.volume24h, vsCurrency, "volume"),
          metadata: buildMetadata(item, quote, "volume"),
        });
        update.volume_baseline = quote.volume24h;
        update.volume_baseline_at = now;
      }
    }

    updates.push(update);
  }

  return { alerts, updates };
}

export function evaluateWatchlistRule(
  item: WatchlistItemSnapshot,
  quote: WatchlistQuote,
  vsCurrency: string,
  rule: WatchlistRuleEvaluationInput,
): WatchlistRuleEvaluationResult {
  const now = quote.updatedAt ?? new Date().toISOString();
  const updates: WatchlistItemUpdatePayload = {
    id: item.id,
    last_snapshot_at: now,
  };

  if (typeof quote.price === "number") {
    updates.last_price = quote.price;
    updates.last_price_change_pct = quote.priceChangePct ?? null;
  }

  if (typeof quote.volume24h === "number") {
    updates.last_volume = quote.volume24h;
    updates.last_volume_change_pct = null;
  }

  if (rule.ruleType === "price_percent") {
    return evaluatePriceRule(item, quote, vsCurrency, rule, updates, now);
  }

  return evaluateVolumeRule(item, quote, vsCurrency, rule, updates, now);
}

function keyFor(assetId: string, assetType: string) {
  return `${assetType}:${assetId}`.toLowerCase();
}

function resolveBaseline(existing: number | null | undefined, fallback: number): {
  current: number;
  shouldPersistBaseline: boolean;
  nextBaseline: number;
} {
  if (typeof existing === "number" && Number.isFinite(existing) && existing > 0) {
    return { current: existing, shouldPersistBaseline: false, nextBaseline: existing };
  }
  return { current: fallback, shouldPersistBaseline: true, nextBaseline: fallback };
}

function computeChangePercent(
  baseline: number,
  current: number,
  threshold: number,
): { changePercent: number | null; shouldAlert: boolean } {
  if (!baseline || baseline === 0) {
    return { changePercent: null, shouldAlert: false };
  }
  const delta = ((current - baseline) / baseline) * 100;
  if (!Number.isFinite(delta)) {
    return { changePercent: null, shouldAlert: false };
  }
  return { changePercent: delta, shouldAlert: Math.abs(delta) >= threshold };
}

function evaluatePriceRule(
  item: WatchlistItemSnapshot,
  quote: WatchlistQuote,
  vsCurrency: string,
  rule: WatchlistRuleEvaluationInput,
  updates: WatchlistItemUpdatePayload,
  now: string,
): WatchlistRuleEvaluationResult {
  if (typeof quote.price !== "number" || !Number.isFinite(quote.price) || quote.price <= 0) {
    return { alert: null, updates };
  }

  const baseline = resolveBaseline(item.priceBaseline, quote.price);
  if (baseline.shouldPersistBaseline) {
    updates.price_baseline = baseline.nextBaseline;
    updates.price_baseline_at = now;
  }

  const { changePercent } = computeChangePercent(
    baseline.current,
    quote.price,
    Math.abs(rule.thresholdPercent),
  );
  if (changePercent === null || !matchesDirectionalRule(changePercent, rule)) {
    return { alert: null, updates };
  }

  const direction = changePercent >= 0 ? "up" : "down";
  updates.price_baseline = quote.price;
  updates.price_baseline_at = now;

  return {
    alert: {
      watchlist_item_id: item.id,
      trigger_type: "price",
      direction,
      change_percent: changePercent,
      previous_value: baseline.current,
      current_value: quote.price,
      threshold_percent: Math.abs(rule.thresholdPercent),
      vs_currency: vsCurrency,
      message: buildAlertMessage(item, direction, changePercent, quote.price, vsCurrency, "price"),
      metadata: buildMetadata(item, quote, "price"),
    },
    updates,
  };
}

function evaluateVolumeRule(
  item: WatchlistItemSnapshot,
  quote: WatchlistQuote,
  vsCurrency: string,
  rule: WatchlistRuleEvaluationInput,
  updates: WatchlistItemUpdatePayload,
  now: string,
): WatchlistRuleEvaluationResult {
  if (
    typeof quote.volume24h !== "number" ||
    !Number.isFinite(quote.volume24h) ||
    quote.volume24h <= 0
  ) {
    return { alert: null, updates };
  }

  const baseline = resolveBaseline(item.volumeBaseline, quote.volume24h);
  if (baseline.shouldPersistBaseline) {
    updates.volume_baseline = baseline.nextBaseline;
    updates.volume_baseline_at = now;
  }

  const { changePercent } = computeChangePercent(
    baseline.current,
    quote.volume24h,
    Math.abs(rule.thresholdPercent),
  );
  if (changePercent === null || !matchesDirectionalRule(changePercent, rule)) {
    return { alert: null, updates };
  }

  const direction = changePercent >= 0 ? "up" : "down";
  updates.volume_baseline = quote.volume24h;
  updates.volume_baseline_at = now;

  return {
    alert: {
      watchlist_item_id: item.id,
      trigger_type: "volume",
      direction,
      change_percent: changePercent,
      previous_value: baseline.current,
      current_value: quote.volume24h,
      threshold_percent: Math.abs(rule.thresholdPercent),
      vs_currency: vsCurrency,
      message: buildAlertMessage(item, direction, changePercent, quote.volume24h, vsCurrency, "volume"),
      metadata: buildMetadata(item, quote, "volume"),
    },
    updates,
  };
}

function matchesDirectionalRule(
  changePercent: number,
  rule: WatchlistRuleEvaluationInput,
): boolean {
  const threshold = Math.abs(rule.thresholdPercent);
  if (rule.direction === "below") {
    return changePercent <= -threshold;
  }
  return changePercent >= threshold;
}

function buildAlertMessage(
  item: WatchlistItemSnapshot,
  direction: "up" | "down",
  percent: number,
  currentValue: number,
  vsCurrency: string,
  trigger: "price" | "volume",
): string {
  const label = item.displayName ?? item.symbol ?? item.assetId;
  const delta = formatPercentage(percent, { maximumFractionDigits: 2 });
  if (trigger === "price") {
    const priceLabel = formatCurrency(currentValue, { currency: vsCurrency });
    return `${label} ${direction === "up" ? "rallied" : "pulled back"} ${delta} to ${priceLabel}`;
  }
  const volumeLabel = formatCurrency(currentValue, { currency: vsCurrency, compact: true });
  return `${label} ${direction === "up" ? "volume surged" : "volume cooled"} ${delta} (${volumeLabel} 24h)`;
}

function buildMetadata(
  item: WatchlistItemSnapshot,
  quote: WatchlistQuote,
  trigger: "price" | "volume",
): JsonObject {
  return {
    assetId: item.assetId,
    assetType: item.assetType,
    symbol: item.symbol,
    displayName: item.displayName,
    quote,
    trigger,
  };
}
