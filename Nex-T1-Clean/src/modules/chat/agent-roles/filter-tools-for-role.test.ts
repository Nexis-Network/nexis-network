import { describe, it, expect, vi, afterEach } from "vitest";
import { filterToolIdsForRole } from "./filter-tools-for-role";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/modules/chat/tool-approval-policy", () => ({
  getToolCategory: vi.fn((name: string) => {
    if (name.startsWith("market_")) return "market";
    if (name.startsWith("wallet_")) return "wallet";
    if (name.startsWith("defi_")) return "defi";
    if (name.startsWith("research_")) return "research";
    if (name.startsWith("sol_")) return "solana";
    if (name.startsWith("onchain_")) return "onchain";
    return "unknown";
  }),
}));

const ALL_IDS = [
  "market_screener",
  "market_chart",
  "wallet_send",
  "wallet_balance",
  "defi_swap",
  "research_lookup",
  "sol_stake",
  "onchain_query",
  "misc_tool",
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("filterToolIdsForRole", () => {
  it("returns all tools when role scoping is disabled", () => {
    vi.stubEnv("NEX_ROLE_SCOPING_ENABLED", "");
    const result = filterToolIdsForRole(ALL_IDS, "market_analyst");
    expect(result).toEqual(ALL_IDS);
  });

  it('returns all tools for "general" role', () => {
    vi.stubEnv("NEX_ROLE_SCOPING_ENABLED", "true");
    const result = filterToolIdsForRole(ALL_IDS, "general");
    expect(result).toEqual(ALL_IDS);
  });

  it('filters to only market + research tools for "market_analyst" role', () => {
    vi.stubEnv("NEX_ROLE_SCOPING_ENABLED", "true");
    const result = filterToolIdsForRole(ALL_IDS, "market_analyst");
    expect(result).toContain("market_screener");
    expect(result).toContain("market_chart");
    expect(result).toContain("research_lookup");
    expect(result).not.toContain("wallet_send");
    expect(result).not.toContain("defi_swap");
    expect(result).not.toContain("misc_tool");
  });

  it("respects additionalAllowlist parameter", () => {
    vi.stubEnv("NEX_ROLE_SCOPING_ENABLED", "true");
    const result = filterToolIdsForRole(ALL_IDS, "market_analyst", ["misc_tool"]);
    expect(result).toContain("market_screener");
    expect(result).toContain("research_lookup");
    expect(result).toContain("misc_tool"); // allowed via allowlist
    expect(result).not.toContain("wallet_send");
  });

  it('filters to only wallet + onchain tools for "wallet_operator" role', () => {
    vi.stubEnv("NEX_ROLE_SCOPING_ENABLED", "true");
    const result = filterToolIdsForRole(ALL_IDS, "wallet_operator");
    expect(result).toContain("wallet_send");
    expect(result).toContain("wallet_balance");
    expect(result).toContain("onchain_query");
    expect(result).not.toContain("market_screener");
    expect(result).not.toContain("defi_swap");
    expect(result).not.toContain("research_lookup");
  });
});
