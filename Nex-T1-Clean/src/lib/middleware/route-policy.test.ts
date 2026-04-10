import { describe, expect, it } from "vitest";

import { isPublicApiRoute } from "@/lib/middleware/route-policy";

describe("isPublicApiRoute", () => {
  it("allows public CoinGecko mobile integration routes", () => {
    expect(isPublicApiRoute("/api/integrations/coingecko/markets")).toBe(true);
    expect(isPublicApiRoute("/api/integrations/coingecko/categories-list")).toBe(true);
    expect(isPublicApiRoute("/api/integrations/coingecko/tickers")).toBe(true);
  });

  it("keeps protected portfolio routes gated", () => {
    expect(isPublicApiRoute("/api/portfolio/aggregated")).toBe(false);
  });
});
