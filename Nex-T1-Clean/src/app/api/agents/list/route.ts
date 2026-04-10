export const maxDuration = 15;

import { connection, NextRequest } from "next/server";

import {
  createErrorResponse,
  createSuccessResponse,
  getOrCreateCorrelationId,
} from "@/lib/request-utils";
import { resolveOrgMembershipRole } from "@/server/agents/agent-access";
import { createCookieBridge, getCookieValue } from "@/server/auth/cookie-bridge";
import { withAuth } from "@/server/security/with-auth";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";


import { logger } from '@/lib/logger';
const DB_QUERY_TIMEOUT_MS = 8000;
const MEMBERSHIP_REPAIR_TIMEOUT_MS = 1500;
const ACTIVE_ORG_COOKIE = "org_active_account";
const ACTIVE_ORG_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: "lax",
} as const;

type QueryResult<T> = { data: T | null; error: { message: string } | null };

// Helper to add timeout to Supabase queries
// Supabase builders become promises when we call .then() on them
async function withQueryTimeout<T>(
  queryBuilder: PromiseLike<QueryResult<T>>,
  timeoutMs: number,
  scope: string
): Promise<QueryResult<T>> {
  const timeoutPromise = new Promise<QueryResult<T>>((resolve) => {
    setTimeout(() => {
      logger.warn(`[${scope}] Query timeout after ${timeoutMs}ms`);
      resolve({ data: null, error: { message: `Query timeout after ${timeoutMs}ms` } });
    }, timeoutMs);
  });
  
  // Convert the builder to a promise by wrapping in Promise.resolve
  return Promise.race([Promise.resolve(queryBuilder), timeoutPromise]);
}

const ALLOWED_LISTING_TYPES = new Set(["sale", "rent", "usage"]);

type ListingSummaryRow = {
  agent_id: string;
  listing_id: string;
  listing_type: "sale" | "rent" | "usage";
  network_id: string;
  asset_id: string | null;
  price_base_units: string;
  currency_symbol: string | null;
  currency_decimals: number;
};

type ListingSummaryRowRaw = Omit<ListingSummaryRow, "network_id" | "price_base_units" | "currency_decimals"> & {
  network_id: string | null;
  price_base_units: string | number | null;
  currency_decimals: number | string | null;
  listing_type: string;
};

type PerformanceRow = {
  agent_id: string;
  realized_pnl_usd: string | number | null;
  volume_usd: string | number | null;
  win_rate_percent: string | number | null;
  total_trades: string | number | null;
  wins: string | number | null;
  losses: string | number | null;
  average_return_percent: string | number | null;
};

type AgentRow = {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: "public" | "private" | "unlisted";
  owner_user_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
  supply: number | string | null;
  num_owners: number | string | null;
};

type OrgMemberLookupRow = {
  org_id: string | null;
};

async function findFirstOrgIdForUser(options: {
  service: ReturnType<typeof createServiceRoleClient>;
  userId: string;
  correlationId: string;
}): Promise<string | null> {
  const { service, userId, correlationId } = options;

  try {
    const { data, error } = await withQueryTimeout(
      service
        .from("org_member")
        .select("org_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1),
      MEMBERSHIP_REPAIR_TIMEOUT_MS,
      "org_membership_repair_lookup",
    );

    if (error) {
      logger.warn("org_membership_repair_lookup_failed", {
        correlationId,
        error: error.message,
      });
      return null;
    }

    const row = Array.isArray(data) ? ((data[0] as OrgMemberLookupRow | undefined) ?? null) : null;
    const orgId = row?.org_id ?? null;
    return typeof orgId === "string" && orgId.trim().length > 0 ? orgId : null;
  } catch (error) {
    logger.warn("org_membership_repair_lookup_failed", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function GET(req: NextRequest) {
  await connection();
  const cookieBridge = createCookieBridge(req.cookies);
  const commitCookies = (response: Response) =>
    cookieBridge.pending().length > 0 ? cookieBridge.commit(response) : response;

  try {
    const correlationId = getOrCreateCorrelationId(req);
    const url = new URL(req.url);
    const search = url.searchParams;
    let orgId = req.headers.get("x-org-id") ?? search.get("orgId");
    
    // Log parameters for debugging 400 errors
    if (!orgId) {
      // It's possible to have no orgId if public, but let's log it if that's the intent
      // logger.debug("[AgentsList] No orgId provided");
    }

    const service = createServiceRoleClient();
    const session = orgId ? await withAuth(req, { allowPublic: false, requireOrg: false }) : await withAuth(req, { allowPublic: true, requireOrg: false });
    if (!session.ok) return session.response;
    const userId = session.session?.user?.id ?? null;
    const activeOrgCookie = (getCookieValue(cookieBridge, ACTIVE_ORG_COOKIE) ?? "").trim() || null;
    let repairedActiveOrgId: string | null = null;

    if (orgId && userId) {
      const membership = await resolveOrgMembershipRole({ service, orgId, userId });
      if (membership.error) {
        return commitCookies(
          createErrorResponse(new Error(membership.error), {
          status: 400,
          customMessage: "Unable to verify org membership",
          headers: { "X-Correlation-Id": correlationId },
          }),
        );
      }

      if (!membership.isMember && activeOrgCookie && activeOrgCookie === orgId) {
        const fallbackOrgId = await findFirstOrgIdForUser({ service, userId, correlationId });
        if (fallbackOrgId && fallbackOrgId !== orgId) {
          orgId = fallbackOrgId;
          repairedActiveOrgId = fallbackOrgId;
          cookieBridge.setAll([
            {
              name: ACTIVE_ORG_COOKIE,
              value: fallbackOrgId,
              options: ACTIVE_ORG_COOKIE_OPTIONS,
            },
          ]);
        }
      }

      if (!membership.isMember && repairedActiveOrgId === null) {
        return commitCookies(
          createErrorResponse(new Error("Forbidden"), {
            status: 403,
            customMessage: "Forbidden",
            headers: { "X-Correlation-Id": correlationId },
          }),
        );
      }
    } else if (orgId && !userId) {
      return commitCookies(
        createErrorResponse(new Error("Unauthenticated"), {
          status: 401,
          customMessage: "Unauthenticated",
          headers: { "X-Correlation-Id": correlationId },
        }),
      );
    }

    const query = sanitizeSearch(search.get("q"));
    const listingTypes = parseCsv(search.get("listingTypes")).filter((value) =>
      ALLOWED_LISTING_TYPES.has(value),
    ) as Array<"sale" | "rent" | "usage">;
    const networks = parseCsv(search.get("networks"));
    const assetFiltersRaw = parseCsv(search.get("assets"));
    const assetFilters = parseAssetFilters(assetFiltersRaw);

    const requiresListingFilter =
      listingTypes.length > 0 || networks.length > 0 || assetFilters.length > 0;

    // Preload listings if we need to filter by them
    let listingSummaries: ListingSummaryRow[] = [];
    if (requiresListingFilter) {
      const listingQuery = service
        .from("agent_listings_view")
        .select(
          "agent_id, listing_id, listing_type, network_id, asset_id, price_base_units, currency_symbol, currency_decimals",
        );

      if (orgId) {
        listingQuery.eq("org_id", orgId);
      }

      if (listingTypes.length > 0) {
        listingQuery.in("listing_type", listingTypes);
      }
      if (networks.length > 0) {
        listingQuery.in("network_id", networks);
      }
      const assetNetworkFilter = new Set(assetFilters.map((item) => item.networkId));
      if (assetNetworkFilter.size > 0) {
        listingQuery.in("network_id", Array.from(assetNetworkFilter));
      }

      const listingResult = await withQueryTimeout(
        listingQuery,
        DB_QUERY_TIMEOUT_MS,
        "agents_listing_query"
      );
      const { data: listingData, error: listingError } = listingResult;
      if (listingError) {
        return commitCookies(
          createErrorResponse(new Error(listingError.message), {
            status: 400,
            customMessage: "Failed to load listings",
          }),
        );
      }
      listingSummaries = normalizeListingSummaries(listingData ?? []).filter((entry) =>
        matchesAssetFilter(entry, assetFilters),
      );

      if (!listingSummaries.length) {
        const response = createSuccessResponse(
          { ok: true, items: [] },
          {
            headers: {
              "X-Correlation-Id": correlationId,
              ...(repairedActiveOrgId ? { "X-Active-Org-Id": repairedActiveOrgId, "X-Org-Repaired": "1" } : {}),
            },
          },
        );
        return commitCookies(response);
      }
    }

    let agentQuery = service
      .from("agent")
      .select(
        "id, org_id, slug, name, description, visibility, owner_user_id, avatar_url, supply, num_owners, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (orgId) {
      agentQuery = agentQuery.eq("org_id", orgId);
    } else {
      agentQuery = agentQuery.in("visibility", ["public", "unlisted"]);
    }

    if (query) {
      const likePattern = `%${escapeForILike(query)}%`;
      agentQuery = agentQuery.or(
        `name.ilike.${likePattern},description.ilike.${likePattern},slug.ilike.${likePattern}`,
      );
    }

    if (requiresListingFilter) {
      const allowedAgentIds = Array.from(
        new Set(listingSummaries.map((entry) => entry.agent_id)),
      );
      agentQuery = agentQuery.in("id", allowedAgentIds);
    }

    const agentResult = await withQueryTimeout(
      agentQuery,
      DB_QUERY_TIMEOUT_MS,
      "agents_list_query"
    );
    const { data: agents, error: agentError } = agentResult;
    if (agentError) {
      return commitCookies(
        createErrorResponse(new Error(agentError.message), {
          status: 400,
          customMessage: "Failed to load agents",
        }),
      );
    }

    const typedAgents = (agents ?? []) as AgentRow[];
    if (typedAgents.length === 0) {
      const response = createSuccessResponse(
        { ok: true, items: [] },
        {
          headers: {
            "X-Correlation-Id": correlationId,
            ...(repairedActiveOrgId ? { "X-Active-Org-Id": repairedActiveOrgId, "X-Org-Repaired": "1" } : {}),
          },
        },
      );
      return commitCookies(response);
    }

    let allListings = listingSummaries;
    if (!requiresListingFilter) {
      const agentIds = typedAgents.map((agent) => agent.id);
      const listingsByIdsResult = await withQueryTimeout(
        service
          .from("agent_listings_view")
          .select(
            "agent_id, listing_id, listing_type, network_id, asset_id, price_base_units, currency_symbol, currency_decimals",
          )
          .in("agent_id", agentIds),
        DB_QUERY_TIMEOUT_MS,
        "agents_listings_by_ids"
      );
      const { data: listingData, error: listingError } = listingsByIdsResult;
      if (listingError) {
        return commitCookies(
          createErrorResponse(new Error(listingError.message), {
            status: 400,
            customMessage: "Failed to load listing summaries",
          }),
        );
      }
      allListings = normalizeListingSummaries(listingData ?? []);
    }

    const listingsByAgent = new Map<string, ListingSummaryRow[]>();
    for (const summary of allListings) {
      const list = listingsByAgent.get(summary.agent_id) ?? [];
      list.push(summary);
      listingsByAgent.set(summary.agent_id, list);
    }

    const agentIds = typedAgents.map((agent) => agent.id);
    const performanceByAgent = new Map<string, PerformanceRow>();
    if (agentIds.length > 0) {
      const perfQueryResult = await withQueryTimeout(
        service
          .from("agent_performance_summary")
          .select("agent_id, realized_pnl_usd, volume_usd, win_rate_percent, total_trades, wins, losses, average_return_percent")
          .in("agent_id", agentIds),
        DB_QUERY_TIMEOUT_MS,
        "agents_performance_query"
      );
      const { data: performanceRows, error: performanceError } = perfQueryResult;
      if (performanceError) {
        return commitCookies(
          createErrorResponse(new Error(performanceError.message), {
            status: 400,
            customMessage: "Failed to load agent performance",
          }),
        );
      }
      for (const row of performanceRows ?? []) {
        const typedRow = row as PerformanceRow;
        if (!typedRow?.agent_id) continue;
        performanceByAgent.set(typedRow.agent_id, typedRow);
      }
    }

    const combined = typedAgents.map((agent) => {
      const performance = performanceByAgent.get(agent.id) ?? null;
      return {
        ...agent,
        listing_summary: listingsByAgent.get(agent.id) ?? [],
        ...(performance
          ? {
              realized_pnl_usd: performance.realized_pnl_usd,
              volume_usd: performance.volume_usd,
              win_rate_percent: performance.win_rate_percent,
              total_trades: performance.total_trades,
              wins: performance.wins,
              losses: performance.losses,
              average_return_percent: performance.average_return_percent,
            }
          : {}),
      };
    });

    let response = createSuccessResponse(
      { ok: true, items: combined },
      {
        headers: {
          "X-Correlation-Id": correlationId,
          ...(repairedActiveOrgId ? { "X-Active-Org-Id": repairedActiveOrgId, "X-Org-Repaired": "1" } : {}),
        },
      },
    );
    // Add cache headers - shorter for authenticated data
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return commitCookies(response);
  } catch (error) {
    return commitCookies(createErrorResponse(error));
  }
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function sanitizeSearch(value: string | null): string {
  if (!value) return "";
  return value.trim().slice(0, 120);
}

function escapeForILike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

type AssetFilter = {
  networkId: string;
  assetId: string | null;
};

function parseAssetFilters(values: string[]): AssetFilter[] {
  const filters: AssetFilter[] = [];
  for (const value of values) {
    const [networkId, ...rest] = value.split("|");
    if (!networkId) continue;
    const rawAsset = rest.length > 0 ? rest.join("|") : "native";
    const assetId = rawAsset.toLowerCase() === "native" ? null : rawAsset;
    filters.push({ networkId, assetId });
  }
  return filters;
}

function matchesAssetFilter(row: ListingSummaryRow, filters: AssetFilter[]): boolean {
  if (!filters.length) return true;
  return filters.some((filter) => {
    if (filter.networkId !== row.network_id) return false;
    if (filter.assetId === null) {
      return row.asset_id === null;
    }
    return (row.asset_id ?? "").toLowerCase() === filter.assetId.toLowerCase();
  });
}

function normalizeListingSummaries(rows: UntypedJson): ListingSummaryRow[] {
  if (!Array.isArray(rows)) return [];
  const normalized: ListingSummaryRow[] = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const raw = item as ListingSummaryRowRaw;

    if (typeof raw.agent_id !== "string" || typeof raw.listing_id !== "string") continue;
    if (!ALLOWED_LISTING_TYPES.has(raw.listing_type)) continue;
    if (typeof raw.network_id !== "string" || raw.network_id.trim().length === 0) continue;
    if (raw.price_base_units === null || raw.price_base_units === undefined) continue;

    const currencyDecimalsRaw = raw.currency_decimals;
    const currencyDecimals =
      typeof currencyDecimalsRaw === "string" ? Number(currencyDecimalsRaw) : currencyDecimalsRaw;
    if (
      typeof currencyDecimals !== "number" ||
      !Number.isFinite(currencyDecimals) ||
      !Number.isInteger(currencyDecimals) ||
      currencyDecimals < 0
    ) {
      continue;
    }

    normalized.push({
      agent_id: raw.agent_id,
      listing_id: raw.listing_id,
      listing_type: raw.listing_type as ListingSummaryRow["listing_type"],
      network_id: raw.network_id,
      asset_id: raw.asset_id ?? null,
      price_base_units: String(raw.price_base_units),
      currency_symbol: raw.currency_symbol ?? null,
      currency_decimals: currencyDecimals,
    });
  }

  return normalized;
}
