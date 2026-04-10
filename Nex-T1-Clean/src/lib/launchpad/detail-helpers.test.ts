import { describe, expect, it } from "vitest";

import {
  aggregateParticipants,
  computeCampaignProgressBps,
  computeSpotPriceBaseUnits,
  deriveCampaignSaleRound,
  pickPreferredWallet,
  sortTeamMembersByRole,
} from "@/lib/launchpad/detail-helpers";

describe("deriveCampaignSaleRound", () => {
  it("returns Whitelist while whitelist window is active", () => {
    const now = Date.parse("2026-02-12T10:00:00.000Z");
    const saleRound = deriveCampaignSaleRound(
      "active",
      {
        whitelistEnabled: true,
        whitelistOnlyUntilTs: "2026-02-12T12:00:00.000Z",
      },
      now,
    );
    expect(saleRound).toBe("Whitelist");
  });

  it("returns Public when whitelist window elapsed", () => {
    const now = Date.parse("2026-02-12T14:00:00.000Z");
    const saleRound = deriveCampaignSaleRound(
      "active",
      {
        whitelistEnabled: true,
        whitelistOnlyUntilTs: "2026-02-12T12:00:00.000Z",
      },
      now,
    );
    expect(saleRound).toBe("Public");
  });

  it("returns Closed for finalized campaigns", () => {
    expect(deriveCampaignSaleRound("finalized", { whitelistEnabled: true })).toBe("Closed");
  });
});

describe("aggregateParticipants", () => {
  it("aggregates contribution totals and keeps latest tx hash", () => {
    const results = aggregateParticipants([
      {
        contributorUserId: "u1",
        amountBaseUnits: "100",
        sharesMintedBaseUnits: "50",
        txHash: "0xabc",
        createdAt: "2026-02-12T08:00:00.000Z",
      },
      {
        contributorUserId: "u2",
        amountBaseUnits: "80",
        sharesMintedBaseUnits: "40",
        txHash: "0xdef",
        createdAt: "2026-02-12T08:05:00.000Z",
      },
      {
        contributorUserId: "u1",
        amountBaseUnits: "25",
        sharesMintedBaseUnits: "10",
        txHash: "0xghi",
        createdAt: "2026-02-12T08:10:00.000Z",
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      userId: "u1",
      contributionCount: 2,
      totalContributedBaseUnits: "125",
      totalSharesBaseUnits: "60",
      lastTxHash: "0xghi",
    });
    expect(results[1]).toMatchObject({
      userId: "u2",
      contributionCount: 1,
      totalContributedBaseUnits: "80",
      totalSharesBaseUnits: "40",
    });
  });
});

describe("computeCampaignProgressBps", () => {
  it("clamps progress to 10000 bps", () => {
    expect(computeCampaignProgressBps("1200", "1000")).toBe(10000);
  });
});

describe("pickPreferredWallet", () => {
  it("prefers namespace matching campaign chain family", () => {
    const selected = pickPreferredWallet(
      [
        { namespace: "eip155", address: "0x1234", verifiedAt: "2026-02-10T00:00:00.000Z" },
        { namespace: "solana", address: "So11111111111111111111111111111111111111112", verifiedAt: "2026-02-11T00:00:00.000Z" },
      ],
      "solana",
    );

    expect(selected?.namespace).toBe("solana");
  });
});

describe("sortTeamMembersByRole", () => {
  it("orders owner/admin/manager/viewer by role weight", () => {
    const sorted = sortTeamMembersByRole([
      { role: "viewer", createdAt: "2026-02-10T00:00:00.000Z" },
      { role: "manager", createdAt: "2026-02-09T00:00:00.000Z" },
      { role: "owner", createdAt: "2026-02-08T00:00:00.000Z" },
      { role: "admin", createdAt: "2026-02-07T00:00:00.000Z" },
    ]);

    expect(sorted.map((entry) => entry.role)).toEqual(["owner", "admin", "manager", "viewer"]);
  });
});

describe("computeSpotPriceBaseUnits", () => {
  it("returns null without shares", () => {
    expect(computeSpotPriceBaseUnits("1000", "0")).toBeNull();
  });

  it("computes decimal spot price", () => {
    expect(computeSpotPriceBaseUnits("1000", "3", 6)).toBe("333.333333");
  });
});
