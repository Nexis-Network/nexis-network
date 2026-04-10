import { describe, expect, it } from "vitest";

import type { WalletPortfolio } from "@/lib/user/profile";

import { resolveWalletLabel } from "./wallet-normalizers";

function createWallet(
  overrides: Partial<WalletPortfolio> = {},
): WalletPortfolio {
  return {
    walletId: overrides.walletId ?? "wallet-1",
    walletType: overrides.walletType ?? "embedded",
    providerName: overrides.providerName ?? "Nex Wallet (EVM)",
    label: overrides.label ?? null,
    customLabel: overrides.customLabel ?? null,
    address: overrides.address ?? "0x1111111111111111111111111111111111111111",
    topAssets: overrides.topAssets ?? [],
    topChains: overrides.topChains ?? [],
    netWorthUsd: overrides.netWorthUsd ?? null,
    change24hPercent: overrides.change24hPercent ?? null,
    gainLoss24hUsd: overrides.gainLoss24hUsd ?? null,
    walletTypeIcon: overrides.walletTypeIcon ?? null,
    status: overrides.status ?? "active",
    metadata: overrides.metadata ?? null,
    analytics: overrides.analytics ?? null,
  };
}

describe("resolveWalletLabel", () => {
  it("prefers a custom label over provider metadata", () => {
    const wallet = createWallet({
      customLabel: "Treasury Smart Wallet",
      label: "Nex Wallet",
      metadata: { label: "Metadata Label" },
    });

    expect(resolveWalletLabel(wallet)).toBe("Treasury Smart Wallet");
  });

  it("falls back to the persisted wallet label before provider name", () => {
    const wallet = createWallet({
      customLabel: null,
      label: "Research Sol Wallet",
      providerName: "Nex Wallet (SOL)",
      metadata: { label: "Metadata Label" },
    });

    expect(resolveWalletLabel(wallet)).toBe("Research Sol Wallet");
  });

  it("normalizes legacy CDP wallet labels to the new Nex Smart Account name", () => {
    const wallet = createWallet({
      customLabel: null,
      label: "Nex Wallet",
      providerName: "Nex Wallet",
    });

    expect(resolveWalletLabel(wallet)).toBe("Nex Smart Account");
  });
});
