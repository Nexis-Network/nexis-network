import { describe, expect, it } from "vitest";

import type { WalletSummaryEnvelope } from "@/modules/wallets/profile";
import { normalizeWalletSummaryPayload } from "@/lib/hooks/wallets/profile/use-wallet-summaries";

const sampleEnvelope: WalletSummaryEnvelope = {
  wallets: [
    {
      id: "wallet-1",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      provider: "safe",
      label: "Safe Wallet",
      customLabel: null,
      type: "agent_generated",
      chains: [],
      tokens: [],
      nfts: [],
      totals: {
        tokenCount: 0,
        nftCount: 0,
        estimatedValueUsd: 100,
        nativeValueUsd: null,
        totalPnlUsd: null,
        totalPnlPercent: null,
      },
      metadata: null,
    },
  ],
  aggregated: {
    totalWallets: 1,
    estimatedValueUsd: 100,
  },
  fetchedAt: "2026-01-01T00:00:00.000Z",
};

describe("normalizeWalletSummaryPayload", () => {
  it("supports wrapped API responses", () => {
    const result = normalizeWalletSummaryPayload({
      success: true,
      data: sampleEnvelope,
    });

    expect(result).toEqual(sampleEnvelope);
  });

  it("supports raw wallet summary payloads", () => {
    const result = normalizeWalletSummaryPayload(sampleEnvelope);
    expect(result).toEqual(sampleEnvelope);
  });

  it("returns an empty summary for malformed payloads", () => {
    const result = normalizeWalletSummaryPayload({ success: true, data: { wallets: "invalid" } });
    expect(result.wallets).toEqual([]);
    expect(result.aggregated.totalWallets).toBe(0);
  });
});
