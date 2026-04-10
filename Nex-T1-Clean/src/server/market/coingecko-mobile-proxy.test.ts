import { describe, expect, it } from "vitest";

import { resolveCoinGeckoIntegrationRoute } from "@/server/market/coingecko-mobile-proxy";

describe("resolveCoinGeckoIntegrationRoute", () => {
  it("resolves category list requests to CoinGecko categories/list", () => {
    const request = resolveCoinGeckoIntegrationRoute(
      "/api/integrations/coingecko/categories-list",
      new URLSearchParams(),
    );

    expect(request).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/coins/categories/list",
      requiresApiKey: false,
    });
  });

  it("uses /market_chart when a days param is present", () => {
    const request = resolveCoinGeckoIntegrationRoute(
      "/api/integrations/coingecko/market-chart",
      new URLSearchParams({
        id: "bitcoin",
        days: "7",
      }),
    );

    expect(request).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/coins/bitcoin/market_chart",
      requiresApiKey: false,
    });
  });

  it("resolves CoinGecko ticker requests", () => {
    const request = resolveCoinGeckoIntegrationRoute(
      "/api/integrations/coingecko/tickers",
      new URLSearchParams({
        id: "ethereum",
        page: "2",
      }),
    );

    expect(request).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/coins/ethereum/tickers",
      requiresApiKey: false,
    });
  });

  it("resolves onchain token info and pools requests", () => {
    const tokenInfoRequest = resolveCoinGeckoIntegrationRoute(
      "/api/integrations/coingecko/onchain-token-info",
      new URLSearchParams({
        network: "base",
        token_address: "0x4200000000000000000000000000000000000006",
      }),
    );

    expect(tokenInfoRequest).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/base/tokens/0x4200000000000000000000000000000000000006/info",
      requiresApiKey: true,
    });

    const tokenPoolsRequest = resolveCoinGeckoIntegrationRoute(
      "/api/integrations/coingecko/onchain-token-pools",
      new URLSearchParams({
        network: "base",
        token_address: "0x4200000000000000000000000000000000000006",
      }),
    );

    expect(tokenPoolsRequest).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/base/tokens/0x4200000000000000000000000000000000000006/pools",
      requiresApiKey: true,
    });
  });

  it("resolves trending pools, new pools, and asset platforms", () => {
    expect(
      resolveCoinGeckoIntegrationRoute(
        "/api/integrations/coingecko/trending-pools",
        new URLSearchParams(),
      ),
    ).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/trending_pools",
      requiresApiKey: true,
    });

    expect(
      resolveCoinGeckoIntegrationRoute(
        "/api/integrations/coingecko/new-pools",
        new URLSearchParams(),
      ),
    ).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/onchain/networks/new_pools",
      requiresApiKey: true,
    });

    expect(
      resolveCoinGeckoIntegrationRoute(
        "/api/integrations/coingecko/asset-platforms",
        new URLSearchParams(),
      ),
    ).toMatchObject({
      ok: true,
      kind: "single",
      endpoint: "/asset_platforms",
      requiresApiKey: false,
    });
  });
});
