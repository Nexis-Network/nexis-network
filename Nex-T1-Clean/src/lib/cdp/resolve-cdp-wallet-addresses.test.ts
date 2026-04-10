import { describe, expect, it } from "vitest";

import type { WalletPortfolio } from "@/lib/user/profile";

import {
  mergeResolvedCdpWalletAddresses,
  resolveCdpWalletAddresses,
} from "./resolve-cdp-wallet-addresses";

function createWallet(overrides: Partial<WalletPortfolio>): WalletPortfolio {
  return {
    walletId: overrides.walletId ?? "wallet-1",
    walletType: overrides.walletType ?? "embedded",
    walletTypeIcon: overrides.walletTypeIcon ?? null,
    providerName: overrides.providerName ?? null,
    label: overrides.label ?? null,
    customLabel: overrides.customLabel ?? null,
    change24hPercent: overrides.change24hPercent ?? null,
    gainLoss24hUsd: overrides.gainLoss24hUsd ?? null,
    topAssets: overrides.topAssets ?? [],
    topChains: overrides.topChains ?? [],
    netWorthUsd: overrides.netWorthUsd ?? null,
    address: overrides.address ?? null,
    status: overrides.status ?? null,
    metadata: overrides.metadata ?? null,
    analytics: overrides.analytics ?? null,
  };
}

describe("resolveCdpWalletAddresses", () => {
  it("detects CDP V2 wallets from metadata source", () => {
    const result = resolveCdpWalletAddresses([
      createWallet({
        walletId: "cdp-evm",
        address: "0xabc1230000000000000000000000000000000000",
        metadata: {
          source: "cdp_v2",
          kind: "evm",
        },
      }),
      createWallet({
        walletId: "cdp-sol",
        address: "SoL4na111111111111111111111111111111111111",
        metadata: {
          source: "cdp",
          kind: "solana",
        },
      }),
    ]);

    expect(result).toEqual({
      evmAddress: "0xabc1230000000000000000000000000000000000",
      solanaAddress: "SoL4na111111111111111111111111111111111111",
    });
  });

  it("detects Nex Wallets from metadata wallet type when provider labels are absent", () => {
    const result = resolveCdpWalletAddresses([
      createWallet({
        walletId: "cdp-typed",
        address: "0xdef4560000000000000000000000000000000000",
        providerName: "",
        metadata: {
          walletType: "cdp_smart_account",
        },
      }),
    ]);

    expect(result.evmAddress).toBe("0xdef4560000000000000000000000000000000000");
    expect(result.solanaAddress).toBeNull();
  });
});

describe("mergeResolvedCdpWalletAddresses", () => {
  it("prefers persisted CDP addresses when the live hook address is not a known wallet row", () => {
    const persistedWallets = [
      createWallet({
        walletId: "persisted-evm",
        address: "0xfeed000000000000000000000000000000000000",
        metadata: {
          source: "cdp",
          kind: "evm",
        },
      }),
      createWallet({
        walletId: "persisted-sol",
        address: "SolPersist1111111111111111111111111111111111",
        metadata: {
          source: "cdp",
          kind: "solana",
        },
      }),
    ];

    const result = mergeResolvedCdpWalletAddresses(
      {
        evmAddress: "0xlive000000000000000000000000000000000000",
      },
      persistedWallets,
    );

    expect(result).toEqual({
      evmAddress: "0xfeed000000000000000000000000000000000000",
      solanaAddress: "SolPersist1111111111111111111111111111111111",
    });
  });

  it("keeps the live provider address when it already matches a persisted CDP wallet", () => {
    const persistedWallets = [
      createWallet({
        walletId: "persisted-evm",
        address: "0xfeed000000000000000000000000000000000000",
        metadata: {
          source: "cdp",
          kind: "evm",
        },
      }),
    ];

    const result = mergeResolvedCdpWalletAddresses(
      {
        evmAddress: "0xfeed000000000000000000000000000000000000",
      },
      persistedWallets,
    );

    expect(result).toEqual({
      evmAddress: "0xfeed000000000000000000000000000000000000",
      solanaAddress: null,
    });
  });
});
