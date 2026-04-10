import { describe, expect, it } from "vitest";

import { getIconCandidates, PLACEHOLDER_ICON } from "@/lib/token-icons";

describe("getIconCandidates", () => {
  it("prefers an explicit remote asset logo but keeps local fallbacks behind it", () => {
    const candidates = getIconCandidates({
      symbol: "eth",
      name: "Ethereum",
      iconOverride: "https://assets.example.com/eth.png",
      kind: "token",
    });

    expect(candidates[0]).toBe("https://assets.example.com/eth.png");
    expect(candidates).toContain(PLACEHOLDER_ICON);
    expect(candidates.some((candidate) => candidate !== PLACEHOLDER_ICON && candidate !== "https://assets.example.com/eth.png")).toBe(true);
  });
});
