import { differenceInMinutes } from "date-fns";

import { fetchWatchlistQuotes } from "@/modules/watchlist/quotes";
import {
  evaluateWatchlistRule,
  type WatchlistRuleEvaluationInput,
  type WatchlistItemUpdatePayload,
} from "@/modules/watchlist/evaluator";
import { enqueueNotification } from "@/server/notifications/enqueue";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import type { WatchlistItemSnapshot } from "@/types/watchlist";

type AlertRuleRow = {
  id: string;
  user_id: string;
  name: string;
  source: string;
  scope_type: string;
  scope_ref: string;
  rule_type: "price_percent" | "volume_percent";
  condition: Record<string, UntypedJson>;
  channels: string[];
  cooldown_minutes: number;
  severity: "info" | "warning" | "critical";
  last_triggered_at: string | null;
};

type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  asset_id: string;
  asset_type: string;
  source: string;
  display_name: string | null;
  symbol: string | null;
  metadata: Record<string, UntypedJson>;
  last_price: number | null;
  last_price_change_pct: number | null;
  last_volume: number | null;
  last_volume_change_pct: number | null;
  last_snapshot_at: string | null;
  price_baseline: number | null;
  price_baseline_at: string | null;
  volume_baseline: number | null;
  volume_baseline_at: string | null;
  created_at: string;
  updated_at: string;
  watchlists?: { user_id: string } | Array<{ user_id: string }>;
};

type ProcessWatchlistAlertRulesResult = {
  processed: number;
  triggered: number;
  notified: number;
  suppressed: number;
  updatedItems: number;
};

export async function processWatchlistAlertRules(): Promise<ProcessWatchlistAlertRulesResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client unavailable");
  }

  const rules = await fetchActiveWatchlistRules(supabase);
  if (rules.length === 0) {
    return { processed: 0, triggered: 0, notified: 0, suppressed: 0, updatedItems: 0 };
  }

  const items = await fetchWatchlistItemsByIds(
    supabase,
    rules.map((rule) => rule.scope_ref),
  );
  if (items.length === 0) {
    return { processed: rules.length, triggered: 0, notified: 0, suppressed: 0, updatedItems: 0 };
  }

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const quotes = await fetchWatchlistQuotes(items, "usd");
  const pendingUpdates = new Map<string, WatchlistItemUpdatePayload>();

  let triggered = 0;
  let notified = 0;
  let suppressed = 0;

  for (const rule of rules) {
    const item = itemMap.get(rule.scope_ref);
    if (!item) {
      continue;
    }

    const quote = quotes.get(`${item.assetType}:${item.assetId}`.toLowerCase());
    if (!quote) {
      continue;
    }

    const evaluation = evaluateWatchlistRule(item, quote, "usd", toRuleInput(rule));
    mergeWatchlistItemUpdate(pendingUpdates, evaluation.updates);

    if (!evaluation.alert) {
      continue;
    }

    if (isCoolingDown(rule.last_triggered_at, rule.cooldown_minutes)) {
      suppressed += 1;
      continue;
    }

    triggered += 1;
    const dedupeKey = buildDedupeKey(rule, evaluation.alert.current_value);

    await supabase.from("watchlist_alert_history").insert({
      watchlist_item_id: item.id,
      trigger_type: evaluation.alert.trigger_type,
      direction: evaluation.alert.direction,
      change_percent: evaluation.alert.change_percent,
      previous_value: evaluation.alert.previous_value,
      current_value: evaluation.alert.current_value,
      threshold_percent: evaluation.alert.threshold_percent,
      vs_currency: evaluation.alert.vs_currency,
      message: evaluation.alert.message,
      metadata: evaluation.alert.metadata,
    });

    await supabase.from("alert_events").insert({
      rule_id: rule.id,
      user_id: rule.user_id,
      source: "watchlist",
      scope_type: "watchlist_item",
      scope_ref: item.id,
      asset_id: item.assetId,
      status: "triggered",
      severity: rule.severity,
      dedupe_key: dedupeKey,
      title: buildNotificationTitle(rule, item),
      body: evaluation.alert.message,
      payload: {
        ruleId: rule.id,
        watchlistItemId: item.id,
        triggerType: evaluation.alert.trigger_type,
        direction: evaluation.alert.direction,
        changePercent: evaluation.alert.change_percent,
        currentValue: evaluation.alert.current_value,
      },
    });

    await enqueueNotification({
      userId: rule.user_id,
      source: "watchlist",
      template: {
        type:
          evaluation.alert.trigger_type === "price"
            ? "watchlist.price_alert"
            : "watchlist.volume_alert",
        title: buildNotificationTitle(rule, item),
        body: evaluation.alert.message,
        url: "/app",
        data: {
          ruleId: rule.id,
          watchlistItemId: item.id,
          assetId: item.assetId,
          assetType: item.assetType,
          triggerType: evaluation.alert.trigger_type,
        },
        dedupeKey,
      },
    });
    notified += 1;

    await supabase
      .from("alert_rules")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", rule.id);
  }

  let updatedItems = 0;
  for (const [itemId, update] of pendingUpdates.entries()) {
    const { id: _id, ...values } = update;
    await supabase.from("watchlist_items").update(values).eq("id", itemId);
    updatedItems += 1;
  }

  return {
    processed: rules.length,
    triggered,
    notified,
    suppressed,
    updatedItems,
  };
}

async function fetchActiveWatchlistRules(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  const { data, error } = await supabase
    .from("alert_rules")
    .select(
      "id,user_id,name,source,scope_type,scope_ref,rule_type,condition,channels,cooldown_minutes,severity,last_triggered_at",
    )
    .eq("is_active", true)
    .in("rule_type", ["price_percent", "volume_percent"])
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load alert rules: ${error.message}`);
  }

  return (data ?? []).filter(
    (row) => row.source === "watchlist" && row.scope_type === "watchlist_item",
  ) as AlertRuleRow[];
}

async function fetchWatchlistItemsByIds(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  ids: string[],
): Promise<WatchlistItemSnapshot[]> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select(
      `
        id,
        watchlist_id,
        asset_id,
        asset_type,
        source,
        display_name,
        symbol,
        metadata,
        last_price,
        last_price_change_pct,
        last_volume,
        last_volume_change_pct,
        last_snapshot_at,
        price_baseline,
        price_baseline_at,
        volume_baseline,
        volume_baseline_at,
        created_at,
        updated_at,
        watchlists!inner(user_id)
      `,
    )
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to load watchlist items: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeWatchlistItem(row as WatchlistItemRow));
}

function normalizeWatchlistItem(row: WatchlistItemRow): WatchlistItemSnapshot {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    assetId: row.asset_id,
    assetType: row.asset_type as WatchlistItemSnapshot["assetType"],
    source: row.source,
    displayName: row.display_name,
    symbol: row.symbol,
    metadata: row.metadata ?? {},
    lastPrice: row.last_price,
    lastPriceChangePct: row.last_price_change_pct,
    lastVolume: row.last_volume,
    lastVolumeChangePct: row.last_volume_change_pct,
    lastSnapshotAt: row.last_snapshot_at,
    priceBaseline: row.price_baseline,
    priceBaselineAt: row.price_baseline_at,
    volumeBaseline: row.volume_baseline,
    volumeBaselineAt: row.volume_baseline_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRuleInput(rule: AlertRuleRow): WatchlistRuleEvaluationInput {
  return {
    ruleType: rule.rule_type,
    direction: rule.condition.direction === "below" ? "below" : "above",
    thresholdPercent: Number(rule.condition.thresholdPercent ?? 0),
  };
}

function buildNotificationTitle(rule: AlertRuleRow, item: WatchlistItemSnapshot): string {
  const label = item.displayName ?? item.symbol ?? item.assetId;
  return rule.rule_type === "price_percent"
    ? `${label} price alert`
    : `${label} volume alert`;
}

function buildDedupeKey(rule: AlertRuleRow, currentValue: number): string {
  return `alert-rule:${rule.id}:${Math.round(currentValue * 100)}`;
}

function isCoolingDown(lastTriggeredAt: string | null, cooldownMinutes: number): boolean {
  if (!lastTriggeredAt || cooldownMinutes <= 0) {
    return false;
  }

  return differenceInMinutes(new Date(), new Date(lastTriggeredAt)) < cooldownMinutes;
}

function mergeWatchlistItemUpdate(
  updates: Map<string, WatchlistItemUpdatePayload>,
  next: WatchlistItemUpdatePayload,
) {
  const current = updates.get(next.id) ?? { id: next.id };
  updates.set(next.id, {
    ...current,
    ...next,
  });
}
