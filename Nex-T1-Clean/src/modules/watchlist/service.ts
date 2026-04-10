import "server-only";

import { isMissingColumnError, isMissingRelationError, toSupabaseLogContext } from "@/lib/errors/supabase";
import { logger } from "@/lib/logger";
import type { SupabaseServerClient } from "@/server/services/supabase/server";
import type { WatchlistItemNormalized } from "@/modules/watchlist/validation";
import type {
  WatchlistEnrichmentSnapshot,
  WatchlistItemSnapshot,
  WatchlistResponse,
  WatchlistSummary,
  WatchlistAssetType,
} from "@/types/watchlist";
import type { JsonObject } from "@/types/json";
import { observeServerOperation } from "@/server/observability/operations";

type EnrichmentRow = {
  chain_name: string;
  chain_id: number | null;
  address_or_mint: string;
  token_id: string | null;
  price_usd: number | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  liquidity_usd: number | null;
  decimals: number | null;
  metadata: JsonObject | null;
  source: string;
  timestamp: string;
};

type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  asset_id: string | null;
  asset_type: WatchlistAssetType;
  chain_id: number | null;
  chain_name: string | null;
  address_or_mint: string | null;
  token_id: string | null;
  symbol: string | null;
  name: string | null;
  display_name: string | null;
  logo_url: string | null;
  source: string;
  source_site: string | null;
  source_url: string | null;
  confidence: number | null;
  evidence: JsonObject[] | null;
  metadata: JsonObject | null;
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
};

type WatchlistRow = {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
  items?: WatchlistItemRow[] | null;
};

const WATCHLIST_DOMAIN = "watchlist";

const toLegacyAssetType = (assetType: WatchlistAssetType): "crypto" | "nft" => {
  if (assetType === "nft") return "nft";
  if (assetType === "crypto") return "crypto";
  if (assetType.endsWith("_NFT")) return "nft";
  return "crypto";
};

function buildEnrichmentKey(row: {
  chain_name?: string | null;
  address_or_mint?: string | null;
  token_id?: string | null;
}) {
  return `${row.chain_name ?? ""}:${row.address_or_mint ?? ""}:${row.token_id ?? ""}`.toLowerCase();
}

function normalizeEnrichment(row: EnrichmentRow): WatchlistEnrichmentSnapshot {
  const now = Date.now();
  const timestamp = row.timestamp;
  const stalenessSeconds = Math.max(
    0,
    Math.floor((now - new Date(timestamp).getTime()) / 1000),
  );

  return {
    chainName: row.chain_name,
    chainId: row.chain_id,
    addressOrMint: row.address_or_mint,
    tokenId: row.token_id,
    priceUsd: row.price_usd,
    marketCapUsd: row.market_cap_usd,
    fdvUsd: row.fdv_usd,
    liquidityUsd: row.liquidity_usd,
    decimals: row.decimals,
    metadata: row.metadata ?? {},
    source: row.source,
    timestamp,
    stalenessSeconds,
  };
}

function normalizeItem(row: WatchlistItemRow, enrichment?: WatchlistEnrichmentSnapshot | null): WatchlistItemSnapshot {
  const fallbackAssetId =
    row.asset_id ??
    (row.chain_name && row.address_or_mint
      ? `${row.chain_name}:${row.address_or_mint}${row.token_id ? `:${row.token_id}` : ""}`
      : row.address_or_mint ??
        "unknown");

  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    assetId: fallbackAssetId,
    assetType: row.asset_type as WatchlistAssetType,
    chainId: row.chain_id ?? null,
    chainName: row.chain_name ?? null,
    addressOrMint: row.address_or_mint ?? null,
    tokenId: row.token_id ?? null,
    symbol: row.symbol,
    name: row.name ?? null,
    displayName: row.display_name,
    logoUrl: row.logo_url ?? null,
    sourceSite: row.source_site ?? null,
    sourceUrl: row.source_url ?? null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    evidence: Array.isArray(row.evidence) ? row.evidence : null,
    source: row.source,
    metadata: row.metadata ?? {},
    lastPrice: typeof row.last_price === "number" ? row.last_price : null,
    lastPriceChangePct:
      typeof row.last_price_change_pct === "number" ? row.last_price_change_pct : null,
    lastVolume: typeof row.last_volume === "number" ? row.last_volume : null,
    lastVolumeChangePct:
      typeof row.last_volume_change_pct === "number" ? row.last_volume_change_pct : null,
    lastSnapshotAt: row.last_snapshot_at ?? null,
    priceBaseline: typeof row.price_baseline === "number" ? row.price_baseline : null,
    priceBaselineAt: row.price_baseline_at ?? null,
    volumeBaseline: typeof row.volume_baseline === "number" ? row.volume_baseline : null,
    volumeBaselineAt: row.volume_baseline_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    enrichment: enrichment ?? null,
  };
}

function normalizeWatchlist(row: WatchlistRow): WatchlistSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isDefault: Boolean(row.is_default),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.items) ? row.items.map((item) => normalizeItem(item)) : [],
  };
}

export async function ensureDefaultWatchlist(
  client: SupabaseServerClient,
  userId: string,
): Promise<string> {
  return observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "ensure_default",
      budgetMs: 1500,
      context: { userId },
    },
    async () => {
      if (!userId) {
        throw new Error("userId is required to resolve a watchlist");
      }

      const existing = await client
        .from("watchlists")
        .select("id")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing.data?.id) {
        return existing.data.id;
      }

      const upserted = await client
        .from("watchlists")
        .upsert(
          {
            user_id: userId,
            name: "Primary",
            slug: "primary",
            is_default: true,
          },
          { onConflict: "user_id,slug" },
        )
        .select("id")
        .single();

      if (upserted.error) {
        throw upserted.error;
      }

      return upserted.data.id;
    },
  );
}

export async function fetchDefaultWatchlist(
  client: SupabaseServerClient,
  userId: string,
): Promise<WatchlistSummary | null> {
  return observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "fetch_default",
      budgetMs: 2500,
      context: { userId },
    },
    async () => {
      const query = await client
        .from("watchlists")
        .select(
          `
        id,
        name,
        slug,
        is_default,
        metadata,
        created_at,
        updated_at,
        items:watchlist_items (
          id,
          watchlist_id,
          asset_id,
          asset_type,
          chain_id,
          chain_name,
          address_or_mint,
          token_id,
          symbol,
          name,
          display_name,
          logo_url,
          source,
          source_site,
          source_url,
          confidence,
          evidence,
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
          updated_at
        )
      `,
        )
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (query.error) {
        if (isMissingColumnError(query.error) || isMissingRelationError(query.error)) {
          logger.warn(
            {
              domain: WATCHLIST_DOMAIN,
              operation: "fetch_default_fallback",
              userId,
              ...toSupabaseLogContext(query.error),
            },
            "watchlist schema fallback applied",
          );

          const legacyWatchlist = await client
            .from("watchlists")
            .select(
              "id, name, slug, is_default, metadata, created_at, updated_at",
            )
            .eq("user_id", userId)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (legacyWatchlist.error) {
            throw legacyWatchlist.error;
          }

          if (!legacyWatchlist.data) {
            return null;
          }

          const legacyItems = await client
            .from("watchlist_items")
            .select("*")
            .eq("watchlist_id", legacyWatchlist.data.id)
            .order("created_at", { ascending: true });

          if (legacyItems.error) {
            throw legacyItems.error;
          }

          return normalizeWatchlist({
            ...(legacyWatchlist.data as Omit<WatchlistRow, "items">),
            items: (legacyItems.data ?? []) as WatchlistItemRow[],
          });
        }

        throw query.error;
      }

      if (!query.data) {
        return null;
      }

      return normalizeWatchlist(query.data as WatchlistRow);
    },
  );
}

export async function fetchAllWatchlistItems(
  client: SupabaseServerClient,
  userId: string,
): Promise<WatchlistItemSnapshot[]> {
  return observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "fetch_all_items",
      budgetMs: 3000,
      context: { userId },
    },
    async () => {
      const { data, error } = await client
        .from("watchlist_items")
        .select(
          `
        id,
        watchlist_id,
        asset_id,
        asset_type,
        chain_id,
        chain_name,
        address_or_mint,
        token_id,
        symbol,
        name,
        display_name,
        logo_url,
        source,
        source_site,
        source_url,
        confidence,
        evidence,
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
        watchlists!inner(id,user_id)
      `,
        )
        .eq("watchlists.user_id", userId);

      if (error) {
        if (isMissingColumnError(error) || isMissingRelationError(error)) {
          logger.warn(
            {
              domain: WATCHLIST_DOMAIN,
              operation: "fetch_all_items_fallback",
              userId,
              ...toSupabaseLogContext(error),
            },
            "watchlist item schema fallback applied",
          );

          const watchlists = await client
            .from("watchlists")
            .select("id")
            .eq("user_id", userId);

          if (watchlists.error) {
            throw watchlists.error;
          }

          const watchlistIds = ((watchlists.data ?? []) as Array<{ id: string }>)
            .map((row) => row.id)
            .filter((id) => typeof id === "string" && id.length > 0);

          if (watchlistIds.length === 0) {
            return [];
          }

          const legacy = await client
            .from("watchlist_items")
            .select("*")
            .in("watchlist_id", watchlistIds);
          if (legacy.error) {
            throw legacy.error;
          }
          return (legacy.data ?? []).map((row) => normalizeItem(row as WatchlistItemRow));
        }
        throw error;
      }

      return (data ?? []).map((row) => normalizeItem(row as WatchlistItemRow));
    },
  );
}

export async function addWatchlistItem(
  client: SupabaseServerClient,
  userId: string,
  payload: WatchlistItemNormalized,
) {
  return observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "add_item",
      budgetMs: 2500,
      context: {
        userId,
        assetType: payload.assetType,
        assetId: payload.assetId ?? null,
        chainName: payload.chainName ?? null,
      },
    },
    async () => {
      const watchlistId = await ensureDefaultWatchlist(client, userId);
      const isLegacy = payload.assetType === "crypto" || payload.assetType === "nft";
      const legacyAssetType = toLegacyAssetType(payload.assetType);
      const legacyAssetId = payload.assetId ?? "";
      const legacyDisplayName = payload.displayName ?? payload.name ?? payload.symbol ?? null;

      const existingQuery = isLegacy
        ? client
            .from("watchlist_items")
            .select("id")
            .eq("watchlist_id", watchlistId)
            .eq("asset_type", payload.assetType)
            .eq("asset_id", legacyAssetId)
            .maybeSingle()
        : client
            .from("watchlist_items")
            .select("id")
            .eq("user_id", userId)
            .eq("chain_name", payload.chainName ?? "")
            .eq("address_or_mint", payload.addressOrMint ?? "")
            .eq("token_id_normalized", payload.tokenId ?? "")
            .maybeSingle();

      const existing = await existingQuery;
      if (existing.error) {
        if (isMissingColumnError(existing.error)) {
          return addLegacyWatchlistItem(client, watchlistId, {
            assetId: legacyAssetId,
            assetType: legacyAssetType,
            source: payload.source,
            symbol: payload.symbol,
            displayName: legacyDisplayName,
            metadata: payload.metadata ?? {},
          });
        }
        throw existing.error;
      }
      const alreadyExisted = Boolean(existing.data?.id);

      const insertPayload = {
        watchlist_id: watchlistId,
        user_id: userId,
        asset_id: payload.assetId,
        asset_type: payload.assetType,
        chain_id: payload.chainId ?? null,
        chain_name: payload.chainName ?? null,
        address_or_mint: payload.addressOrMint ?? null,
        token_id: payload.tokenId ?? null,
        symbol: payload.symbol ?? null,
        name: payload.name ?? null,
        display_name: payload.displayName ?? null,
        logo_url: payload.logoUrl ?? null,
        source: payload.source,
        source_site: payload.sourceSite ?? payload.source,
        source_url: payload.sourceUrl ?? null,
        confidence: payload.confidence ?? null,
        evidence: payload.evidence ?? [],
        metadata: payload.metadata ?? {},
      };

      const insert = await client
        .from("watchlist_items")
        .upsert(insertPayload, {
          onConflict: isLegacy
            ? "watchlist_id,asset_type,asset_id"
            : "user_id,chain_name,address_or_mint,token_id_normalized",
        })
        .select(
          `
        id,
        watchlist_id,
        asset_id,
        asset_type,
        chain_id,
        chain_name,
        address_or_mint,
        token_id,
        symbol,
        name,
        display_name,
        logo_url,
        source,
        source_site,
        source_url,
        confidence,
        evidence,
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
        updated_at
      `,
        )
        .single();

      if (insert.error) {
        if (isMissingColumnError(insert.error)) {
          return addLegacyWatchlistItem(client, watchlistId, {
            assetId: legacyAssetId,
            assetType: legacyAssetType,
            source: payload.source,
            symbol: payload.symbol,
            displayName: legacyDisplayName,
            metadata: payload.metadata ?? {},
          });
        }
        throw insert.error;
      }

      return { item: normalizeItem(insert.data as WatchlistItemRow), alreadyExisted };
    },
  );
}

export async function deleteWatchlistItem(
  client: SupabaseServerClient,
  itemId: string,
) {
  await observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "delete_item",
      budgetMs: 1500,
      context: { itemId },
    },
    async () => {
      const { error } = await client.from("watchlist_items").delete().eq("id", itemId);
      if (error) {
        throw error;
      }
    },
  );
}

export function buildWatchlistResponse(
  watchlist: WatchlistSummary | null,
  currency: string,
): WatchlistResponse {
  return {
    watchlist,
    stats: {
      totalItems: watchlist?.items.length ?? 0,
      currency,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function fetchEnrichmentSnapshots(
  client: SupabaseServerClient,
  items: Pick<WatchlistItemSnapshot, "chainName" | "addressOrMint" | "tokenId">[],
): Promise<Map<string, WatchlistEnrichmentSnapshot>> {
  return observeServerOperation(
    {
      domain: WATCHLIST_DOMAIN,
      operation: "fetch_enrichment",
      budgetMs: 2500,
      context: { itemCount: items.length },
    },
    async () => {
      const keys = items
        .filter((item) => item.chainName && item.addressOrMint)
        .map((item) => ({
          chain_name: item.chainName as string,
          address_or_mint: item.addressOrMint as string,
          token_id: item.tokenId ?? null,
        }));

      if (!keys.length) {
        return new Map();
      }

      const chainNames = Array.from(new Set(keys.map((key) => key.chain_name)));
      const addresses = Array.from(new Set(keys.map((key) => key.address_or_mint)));

      const { data, error } = await client
        .from("asset_enrichment_snapshot")
        .select(
          `
        chain_name,
        chain_id,
        address_or_mint,
        token_id,
        price_usd,
        market_cap_usd,
        fdv_usd,
        liquidity_usd,
        decimals,
        metadata,
        source,
        timestamp
      `,
        )
        .in("chain_name", chainNames)
        .in("address_or_mint", addresses);

      if (error) {
        if (isMissingRelationError(error)) {
          logger.warn(
            {
              domain: WATCHLIST_DOMAIN,
              operation: "fetch_enrichment_missing_table",
              itemCount: items.length,
              ...toSupabaseLogContext(error),
            },
            "watchlist enrichment snapshot table unavailable",
          );
          return new Map();
        }
        throw error;
      }

      const map = new Map<string, WatchlistEnrichmentSnapshot>();
      for (const row of data ?? []) {
        const key = buildEnrichmentKey(row as EnrichmentRow);
        const normalized = normalizeEnrichment(row as EnrichmentRow);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, normalized);
          continue;
        }
        if (new Date(normalized.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
          map.set(key, normalized);
        }
      }

      return map;
    },
  );
}

async function addLegacyWatchlistItem(
  client: SupabaseServerClient,
  watchlistId: string,
  payload: {
    assetId: string;
    assetType: "crypto" | "nft";
    source: string;
    symbol: string | null;
    displayName: string | null;
    metadata: JsonObject;
  },
) {
  const existing = await client
    .from("watchlist_items")
    .select("id")
    .eq("watchlist_id", watchlistId)
    .eq("asset_type", payload.assetType)
    .eq("asset_id", payload.assetId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const alreadyExisted = Boolean(existing.data?.id);
  const insert = await client
    .from("watchlist_items")
    .upsert(
      {
        watchlist_id: watchlistId,
        asset_id: payload.assetId,
        asset_type: payload.assetType,
        source: payload.source,
        display_name: payload.displayName,
        symbol: payload.symbol,
        metadata: payload.metadata ?? {},
      },
      { onConflict: "watchlist_id,asset_type,asset_id" },
    )
    .select(
      `
        id,
        watchlist_id,
        asset_id,
        asset_type,
        symbol,
        display_name,
        source,
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
        updated_at
      `,
    )
    .single();

  if (insert.error) {
    throw insert.error;
  }

  return { item: normalizeItem(insert.data as WatchlistItemRow), alreadyExisted };
}

export function attachEnrichment(
  items: WatchlistItemSnapshot[],
  enrichment: Map<string, WatchlistEnrichmentSnapshot>,
): WatchlistItemSnapshot[] {
  return items.map((item) => {
    const key = buildEnrichmentKey({
      chain_name: item.chainName ?? undefined,
      address_or_mint: item.addressOrMint ?? undefined,
      token_id: item.tokenId ?? null,
    });
    const snapshot = enrichment.get(key) ?? null;
    return { ...item, enrichment: snapshot };
  });
}
