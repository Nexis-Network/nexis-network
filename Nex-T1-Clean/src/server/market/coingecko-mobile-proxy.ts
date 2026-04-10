import {
  isCoingeckoDemoKeyMismatchError,
  isCoingeckoProKeyMismatchError,
} from "@/server/market/coingecko-base";

const CG_FREE_BASE = "https://api.coingecko.com/api/v3";
const CG_PRO_BASE = "https://pro-api.coingecko.com/api/v3";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const COINGECKO_ASSET_PLATFORM_BY_CHAIN_ID = Object.freeze({
  1: "ethereum",
  10: "optimistic-ethereum",
  56: "binance-smart-chain",
  130: "unichain",
  137: "polygon-pos",
  8453: "base",
  42161: "arbitrum-one",
  43114: "avalanche",
  42220: "celo",
});

export const COINGECKO_ONCHAIN_NETWORK_BY_CHAIN_ID = Object.freeze({
  1: "eth",
  10: "optimism",
  56: "bsc",
  130: "unichain",
  137: "polygon_pos",
  8453: "base",
  42161: "arbitrum",
  43114: "avax",
  42220: "celo",
});

type CoinGeckoIntegrationRoute =
  | {
      ok: true;
      kind: "single";
      endpoint: string;
      query: URLSearchParams;
      requiresApiKey: boolean;
    }
  | {
      ok: true;
      kind: "token-pools";
      address: string;
      network: string;
      tokenEndpoint: string;
      poolsEndpoint: string;
      poolsQuery: URLSearchParams;
      requiresApiKey: true;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function normalizeAddress(value: string | null): string {
  const trimmed = String(value ?? "").trim();
  if (!ADDRESS_REGEX.test(trimmed)) {
    return "";
  }
  return trimmed.toLowerCase();
}

function normalizeTokenAddressParam(value: string | null): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}

function parseChainId(value: string | null): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function buildUpstreamUrl(base: string, endpoint: string, query: URLSearchParams): URL {
  const upstreamUrl = new URL(`${base}${endpoint}`);
  for (const [key, value] of query.entries()) {
    upstreamUrl.searchParams.set(key, value);
  }
  return upstreamUrl;
}

function parseJsonSafe(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, fallbackText: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as {
      error?: unknown;
      message?: unknown;
      status?: {
        error_message?: unknown;
      };
    };
    if (typeof record.error === "string") return record.error;
    if (typeof record.message === "string") return record.message;
    if (typeof record.status?.error_message === "string") {
      return record.status.error_message;
    }
  }

  return fallbackText;
}

function isPlanOrAuthorizationFailure(status: number, payload: unknown, text: string): boolean {
  if (status === 401 || status === 403) {
    return true;
  }

  const message = extractErrorMessage(payload, text).toLowerCase();
  return (
    message.includes("without api key") ||
    message.includes("not allowed for this endpoint") ||
    message.includes("api key") ||
    message.includes("plan")
  );
}

type CoinGeckoUpstreamConfig = {
  base: string;
  headers: HeadersInit;
};

function buildUpstreamConfigs(params: {
  cgProApiKey?: string | undefined;
  cgDemoApiKey?: string | undefined;
}): CoinGeckoUpstreamConfig[] {
  const proApiKey = params.cgProApiKey?.trim() || "";
  const demoApiKey = params.cgDemoApiKey?.trim() || "";
  const fallbackDemoKey = demoApiKey || proApiKey;
  const configs: CoinGeckoUpstreamConfig[] = [];

  if (proApiKey) {
    configs.push({
      base: CG_PRO_BASE,
      headers: { Accept: "application/json", "x-cg-pro-api-key": proApiKey },
    });
  }

  if (fallbackDemoKey) {
    configs.push({
      base: CG_FREE_BASE,
      headers: { Accept: "application/json", "x-cg-demo-api-key": fallbackDemoKey },
    });
  }

  configs.push({
    base: CG_FREE_BASE,
    headers: { Accept: "application/json" },
  });

  const seen = new Set<string>();
  return configs.filter((config) => {
    const signature = JSON.stringify([config.base, config.headers]);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function shouldFallbackUpstream(status: number, payload: unknown, text: string): boolean {
  if (status === 429 || status === 401 || status === 403) {
    return true;
  }
  if (status !== 400) {
    return false;
  }
  return (
    isCoingeckoDemoKeyMismatchError(payload) ||
    isCoingeckoProKeyMismatchError(payload) ||
    isCoingeckoDemoKeyMismatchError(text) ||
    isCoingeckoProKeyMismatchError(text)
  );
}

async function fetchCoinGeckoUpstream(params: {
  endpoint: string;
  query: URLSearchParams;
  fetchImpl: typeof fetch;
  configs: CoinGeckoUpstreamConfig[];
}): Promise<Response> {
  const { endpoint, query, fetchImpl, configs } = params;
  let lastResponse: Response | null = null;

  for (let index = 0; index < configs.length; index += 1) {
    const config = configs[index];
    const upstreamUrl = buildUpstreamUrl(config.base, endpoint, query);
    const upstream = await fetchImpl(upstreamUrl, { headers: config.headers });
    const bodyText = await upstream.text();
    const payload = parseJsonSafe(bodyText);

    if (upstream.ok) {
      return new Response(bodyText, {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        },
      });
    }

    lastResponse = new Response(bodyText, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });

    if (index < configs.length - 1 && shouldFallbackUpstream(upstream.status, payload, bodyText)) {
      continue;
    }

    return lastResponse;
  }

  return lastResponse ?? jsonResponse(502, { error: "CoinGecko upstream unavailable" });
}

function makeContractRequest(
  pathname: string,
  searchParams: URLSearchParams,
): CoinGeckoIntegrationRoute {
  const chainId = parseChainId(searchParams.get("chain_id"));
  if (chainId == null) {
    return {
      ok: false,
      status: 400,
      error: "Missing required query parameter: chain_id",
    };
  }

  const address = normalizeAddress(searchParams.get("address"));
  if (!address) {
    return {
      ok: false,
      status: 400,
      error: "Missing or invalid required query parameter: address",
    };
  }

  if (pathname === "/api/integrations/coingecko/token-contract") {
    const assetPlatform = COINGECKO_ASSET_PLATFORM_BY_CHAIN_ID[chainId as keyof typeof COINGECKO_ASSET_PLATFORM_BY_CHAIN_ID];
    if (!assetPlatform) {
      return {
        ok: false,
        status: 400,
        error: `Unsupported chain_id for CoinGecko contract lookup: ${chainId}`,
      };
    }

    const query = new URLSearchParams(searchParams);
    query.delete("chain_id");
    query.delete("address");

    return {
      ok: true,
      kind: "single",
      endpoint: `/coins/${encodeURIComponent(assetPlatform)}/contract/${address}`,
      query,
      requiresApiKey: false,
    };
  }

  const network = COINGECKO_ONCHAIN_NETWORK_BY_CHAIN_ID[chainId as keyof typeof COINGECKO_ONCHAIN_NETWORK_BY_CHAIN_ID];
  if (!network) {
    return {
      ok: false,
      status: 400,
      error: `Unsupported chain_id for CoinGecko onchain lookup: ${chainId}`,
    };
  }

  const poolsQuery = new URLSearchParams(searchParams);
  poolsQuery.delete("chain_id");
  poolsQuery.delete("address");

  return {
    ok: true,
    kind: "token-pools",
    address,
    network,
    tokenEndpoint: `/onchain/networks/${encodeURIComponent(network)}/tokens/${address}`,
    poolsEndpoint: `/onchain/networks/${encodeURIComponent(network)}/tokens/${address}/pools`,
    poolsQuery,
    requiresApiKey: true,
  };
}

function makeMarketChartRequest(searchParams: URLSearchParams): CoinGeckoIntegrationRoute {
  const id = String(searchParams.get("id") ?? "").trim().toLowerCase();
  const query = new URLSearchParams(searchParams);
  query.delete("id");
  const hasDays = query.get("days") != null && query.get("days") !== "";
  const endpointSuffix = hasDays ? "/market_chart" : "/market_chart/range";

  if (query.get("vs_currency") == null || query.get("vs_currency") === "") {
    query.set("vs_currency", "usd");
  }

  if (id) {
    return {
      ok: true,
      kind: "single",
      endpoint: `/coins/${encodeURIComponent(id)}${endpointSuffix}`,
      query,
      requiresApiKey: false,
    };
  }

  const contractRequest = makeContractRequest("/api/integrations/coingecko/token-contract", searchParams);
  if (!contractRequest.ok) {
    return contractRequest;
  }
  if (contractRequest.kind !== "single") {
    return {
      ok: false,
      status: 500,
      error: "CoinGecko contract market chart resolution failed",
    };
  }

  return {
    ok: true,
    kind: "single",
    endpoint: `${contractRequest.endpoint}${endpointSuffix}`,
    query,
    requiresApiKey: false,
  };
}

function makeTokenAddressNetworkRequest(
  pathname: string,
  searchParams: URLSearchParams,
): CoinGeckoIntegrationRoute {
  const network = String(searchParams.get("network") ?? "").trim().toLowerCase();
  const tokenAddress = normalizeTokenAddressParam(searchParams.get("token_address"));

  if (!network) {
    return {
      ok: false,
      status: 400,
      error: "Missing required query parameter: network",
    };
  }

  if (!tokenAddress) {
    return {
      ok: false,
      status: 400,
      error: "Missing or invalid required query parameter: token_address",
    };
  }

  const query = new URLSearchParams(searchParams);
  query.delete("network");
  query.delete("token_address");

  let endpoint = `/onchain/networks/${encodeURIComponent(network)}/tokens/${tokenAddress}`;
  if (pathname === "/api/integrations/coingecko/onchain-token-info") {
    endpoint = `${endpoint}/info`;
  }
  if (pathname === "/api/integrations/coingecko/onchain-token-pools") {
    endpoint = `${endpoint}/pools`;
  }

  return {
    ok: true,
    kind: "single",
    endpoint,
    query,
    requiresApiKey: true,
  };
}

export function resolveCoinGeckoIntegrationRoute(
  pathname: string,
  searchParams: URLSearchParams,
): CoinGeckoIntegrationRoute {
  if (pathname === "/api/integrations/coingecko/simple-price") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/simple/price",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/markets") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/coins/markets",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/categories") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/coins/categories",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/categories-list") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/coins/categories/list",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/trending") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/search/trending",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/coin") {
    const id = String(searchParams.get("id") ?? "").trim().toLowerCase();
    if (!id) {
      return {
        ok: false,
        status: 400,
        error: "Missing required query parameter: id",
      };
    }

    const query = new URLSearchParams(searchParams);
    query.delete("id");

    return {
      ok: true,
      kind: "single",
      endpoint: `/coins/${encodeURIComponent(id)}`,
      query,
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/market-chart") {
    return makeMarketChartRequest(searchParams);
  }

  if (pathname === "/api/integrations/coingecko/search") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/search",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/tickers") {
    const id = String(searchParams.get("id") ?? "").trim().toLowerCase();
    if (!id) {
      return {
        ok: false,
        status: 400,
        error: "Missing required query parameter: id",
      };
    }

    const query = new URLSearchParams(searchParams);
    query.delete("id");

    return {
      ok: true,
      kind: "single",
      endpoint: `/coins/${encodeURIComponent(id)}/tickers`,
      query,
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/asset-platforms") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/asset_platforms",
      query: new URLSearchParams(searchParams),
      requiresApiKey: false,
    };
  }

  if (pathname === "/api/integrations/coingecko/trending-pools") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/trending_pools",
      query: new URLSearchParams(searchParams),
      requiresApiKey: true,
    };
  }

  if (pathname === "/api/integrations/coingecko/new-pools") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/new_pools",
      query: new URLSearchParams(searchParams),
      requiresApiKey: true,
    };
  }

  if (
    pathname === "/api/integrations/coingecko/onchain-token" ||
    pathname === "/api/integrations/coingecko/onchain-token-info" ||
    pathname === "/api/integrations/coingecko/onchain-token-pools"
  ) {
    return makeTokenAddressNetworkRequest(pathname, searchParams);
  }

  if (pathname === "/api/integrations/coingecko/onchain-pools-megafilter") {
    return {
      ok: true,
      kind: "single",
      endpoint: "/onchain/pools/megafilter",
      query: new URLSearchParams(searchParams),
      requiresApiKey: true,
    };
  }

  if (
    pathname === "/api/integrations/coingecko/token-contract" ||
    pathname === "/api/integrations/coingecko/token-pools"
  ) {
    return makeContractRequest(pathname, searchParams);
  }

  return {
    ok: false,
    status: 404,
    error: "Unsupported CoinGecko proxy route",
  };
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function buildCoinGeckoIntegrationResponse(params: {
  pathname: string;
  searchParams: URLSearchParams;
  fetchImpl?: typeof fetch;
  cgProApiKey?: string | undefined;
  cgDemoApiKey?: string | undefined;
}): Promise<Response> {
  const {
    pathname,
    searchParams,
    fetchImpl = fetch,
    cgProApiKey,
    cgDemoApiKey,
  } = params;

  const resolved = resolveCoinGeckoIntegrationRoute(pathname, searchParams);
  if (!resolved.ok) {
    return jsonResponse(resolved.status, { error: resolved.error });
  }

  const upstreamConfigs = buildUpstreamConfigs({ cgProApiKey, cgDemoApiKey });
  const hasAuthenticatedConfig = upstreamConfigs.some((config) =>
    Object.keys(config.headers as Record<string, string>).some((key) => key.startsWith("x-cg-")),
  );

  if (resolved.kind === "token-pools" && !hasAuthenticatedConfig) {
    return jsonResponse(200, {
      degraded: true,
      reason: "COINGECKO_API_KEY_REQUIRED",
      network: resolved.network,
      address: resolved.address,
      token: null,
      pools: [],
    });
  }

  if (resolved.kind === "single") {
    return fetchCoinGeckoUpstream({
      endpoint: resolved.endpoint,
      query: resolved.query,
      fetchImpl,
      configs: upstreamConfigs,
    });
  }

  const tokenResponse = await fetchCoinGeckoUpstream({
    endpoint: resolved.tokenEndpoint,
    query: new URLSearchParams(),
    fetchImpl,
    configs: upstreamConfigs,
  });
  const tokenText = await tokenResponse.text();
  const tokenPayload = parseJsonSafe(tokenText);

  if (!tokenResponse.ok) {
    if (isPlanOrAuthorizationFailure(tokenResponse.status, tokenPayload, tokenText)) {
      return jsonResponse(200, {
        degraded: true,
        reason: "COINGECKO_PLAN_LIMIT_OR_UNAUTHORIZED",
        network: resolved.network,
        address: resolved.address,
        token: null,
        pools: [],
      });
    }

    return new Response(tokenText, {
      status: tokenResponse.status,
      headers: {
        "content-type":
          tokenResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });
  }

  const poolsResponse = await fetchCoinGeckoUpstream({
    endpoint: resolved.poolsEndpoint,
    query: resolved.poolsQuery,
    fetchImpl,
    configs: upstreamConfigs,
  });
  const poolsText = await poolsResponse.text();
  const poolsPayload = parseJsonSafe(poolsText);
  const tokenData =
    tokenPayload && typeof tokenPayload === "object" && "data" in tokenPayload
      ? (tokenPayload as { data?: unknown }).data ?? null
      : tokenPayload ?? null;

  if (!poolsResponse.ok) {
    if (isPlanOrAuthorizationFailure(poolsResponse.status, poolsPayload, poolsText)) {
      return jsonResponse(200, {
        degraded: true,
        reason: "COINGECKO_PLAN_LIMIT_OR_UNAUTHORIZED",
        network: resolved.network,
        address: resolved.address,
        token: tokenPayload,
        pools: [],
      });
    }

    return new Response(poolsText, {
      status: poolsResponse.status,
      headers: {
        "content-type":
          poolsResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });
  }

  return jsonResponse(200, {
    degraded: false,
    network: resolved.network,
    address: resolved.address,
    token: tokenData,
    pools: Array.isArray((poolsPayload as { data?: unknown[] } | null)?.data)
      ? (poolsPayload as { data: unknown[] }).data
      : [],
    included: Array.isArray((poolsPayload as { included?: unknown[] } | null)?.included)
      ? (poolsPayload as { included: unknown[] }).included
      : [],
    raw: {
      token: tokenPayload,
      pools: poolsPayload,
    },
  });
}
