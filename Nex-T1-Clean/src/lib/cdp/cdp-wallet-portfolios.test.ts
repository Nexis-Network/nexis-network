import { describe, expect, it } from "vitest";

import type { WalletPortfolio } from "@/lib/user/profile";
import { getNexSmartAccountLabel } from "@/lib/cdp/cdp-wallet-labels";

import {
  augmentWalletPortfoliosWithResolvedCdp,
  getPortfolioWalletKindLabel,
  isPortfolioSelectableWallet,
} from "./cdp-wallet-portfolios";

function createWallet(overrides: Partial<WalletPortfolio> = {}): WalletPortfolio {
  return {
    walletId: overrides.walletId ?? "wallet-1",
    walletType: overrides.walletType ?? "external_connected",
    walletTypeIcon: overrides.walletTypeIcon ?? null,
    providerName: overrides.providerName ?? "Connected Wallet",
    label: overrides.label ?? null,
    customLabel: overrides.customLabel ?? null,
    change24hPercent: overrides.change24hPercent ?? null,
    gainLoss24hUsd: overrides.gainLoss24hUsd ?? null,
    topAssets: overrides.topAssets ?? [],
    topChains: overrides.topChains ?? [],
    netWorthUsd: overrides.netWorthUsd ?? null,
    address: overrides.address ?? "0x1111111111111111111111111111111111111111",
    status: overrides.status ?? null,
    metadata: overrides.metadata ?? null,
    analytics: overrides.analytics ?? null,
  };
}

describe("augmentWalletPortfoliosWithResolvedCdp", () => {
  it("appends synthetic CDP EVM and Solana wallets when live addresses are present", () => {
    const augmented = augmentWalletPortfoliosWithResolvedCdp(
      [createWallet()],
      {
        evmAddress: "0x2222222222222222222222222222222222222222",
        solanaAddress: "So11111111111111111111111111111111111111112",
      },
    );

    expect(augmented).toHaveLength(3);
    expect(augmented[1]).toMatchObject({
      walletId: "cdp-evm-0x2222222222222222222222222222222222222222",
      walletType: "embedded",
      providerName: getNexSmartAccountLabel(),
      address: "0x2222222222222222222222222222222222222222",
      metadata: expect.objectContaining({
        provider: "cdp",
        source: "cdp_v2",
        kind: "evm",
        chainId: 8453,
        identityProvider: "cdp",
        executionProvider: "cdp",
        networkKey: "base-mainnet",
        capabilities: expect.objectContaining({
          cdpSignAndSend: true,
          cdpUserOp: true,
          cdpSwap: true,
          nativeSymbol: "ETH",
        }),
      }),
    });
    expect(augmented[2]).toMatchObject({
      walletId: "cdp-sol-So11111111111111111111111111111111111111112",
      walletType: "embedded",
      providerName: getNexSmartAccountLabel(),
      address: "So11111111111111111111111111111111111111112",
      metadata: expect.objectContaining({
        provider: "cdp",
        source: "cdp_v2",
        kind: "solana",
      }),
    });
  });

  it("does not duplicate an existing persisted Nex Wallet and preserves its label", () => {
    const augmented = augmentWalletPortfoliosWithResolvedCdp(
      [
        createWallet({
          walletId: "db-cdp-wallet",
          walletType: "embedded",
          providerName: "Nex Wallet (EVM)",
          label: "Treasury Smart Wallet",
          address: "0x3333333333333333333333333333333333333333",
          metadata: {
            provider: "cdp",
            source: "cdp",
            kind: "evm",
          },
        }),
      ],
      {
        evmAddress: "0x3333333333333333333333333333333333333333",
      },
    );

    expect(augmented).toHaveLength(1);
    expect(augmented[0]).toMatchObject({
      walletId: "db-cdp-wallet",
      walletType: "embedded",
      label: "Treasury Smart Wallet",
      providerName: "Nex Wallet (EVM)",
      metadata: expect.objectContaining({
        provider: "cdp",
        source: "cdp",
        kind: "evm",
      }),
    });
  });

  it("derives synthetic CDP EVM metadata from matching wallet chain metadata", () => {
    const augmented = augmentWalletPortfoliosWithResolvedCdp(
      [
        createWallet({
          walletId: "persisted-owner-wallet",
          walletType: "embedded",
          address: "0x4444444444444444444444444444444444444444",
          metadata: {
            provider: "cdp",
            walletType: "cdp",
            kind: "evm",
            smartAccountAddress: "0x5555555555555555555555555555555555555555",
            chainId: 42161,
          },
        }),
      ],
      {
        evmAddress: "0x5555555555555555555555555555555555555555",
      },
    );

    expect(augmented).toHaveLength(1);
    expect(augmented[0]).toMatchObject({
      walletId: "persisted-owner-wallet",
      address: "0x4444444444444444444444444444444444444444",
      metadata: expect.objectContaining({
        chainId: 42161,
        networkKey: "arbitrum-mainnet",
      }),
    });
  });
});

describe("isPortfolioSelectableWallet", () => {
  it("includes embedded Nex Wallets alongside safe and external wallets", () => {
    const safeWallet = createWallet({
      walletType: "agent_generated",
      providerName: "Safe Smart Account",
    });
    const cdpWallet = createWallet({
      walletType: "embedded",
      providerName: "Nex Wallet (SOL)",
      address: "So11111111111111111111111111111111111111112",
      metadata: {
        provider: "cdp",
        kind: "solana",
      },
    });
    const ledgerWallet = createWallet({
      walletId: "ledger-1",
      walletType: "ledger",
      providerName: "Ledger",
    });

    expect(isPortfolioSelectableWallet(safeWallet)).toBe(true);
    expect(isPortfolioSelectableWallet(cdpWallet)).toBe(true);
    expect(isPortfolioSelectableWallet(ledgerWallet)).toBe(false);
  });
});

describe("getPortfolioWalletKindLabel", () => {
  it("returns the shared Nex smart account label for embedded wallets", () => {
    const cdpEvm = createWallet({
      walletType: "embedded",
      providerName: "Nex Wallet (EVM)",
      metadata: { provider: "cdp", kind: "evm" },
    });
    const cdpSolana = createWallet({
      walletType: "embedded",
      providerName: "Nex Wallet (SOL)",
      address: "So11111111111111111111111111111111111111112",
      metadata: { provider: "cdp", kind: "solana" },
    });

    expect(getPortfolioWalletKindLabel(cdpEvm)).toBe(getNexSmartAccountLabel());
    expect(getPortfolioWalletKindLabel(cdpSolana)).toBe(getNexSmartAccountLabel());
  });
});
