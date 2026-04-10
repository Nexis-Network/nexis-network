import type {
  CdpWalletDescriptor,
  WalletBalanceResult,
} from "@/lib/hooks/cdp/use-cdp-balance";
import type { PortfolioDashboardWallet } from "./portfolio-dashboard.types";

type BuildSyntheticCdpWalletEntriesArgs = {
  existingWallets: PortfolioDashboardWallet[];
  balances: WalletBalanceResult[];
  evmAddress: string | null;
  evmChainId: number;
  solanaAddress: string | null;
};

export function buildCdpWalletDescriptors(args: {
  evmAddress: string | null;
  evmChainId: number;
  solanaAddress: string | null;
}): CdpWalletDescriptor[] {
  const descriptors: CdpWalletDescriptor[] = [];

  if (args.evmAddress) {
    descriptors.push({
      address: args.evmAddress,
      platform: "evm",
      chainId: args.evmChainId,
    });
  }

  if (args.solanaAddress) {
    descriptors.push({
      address: args.solanaAddress,
      platform: "solana",
    });
  }

  return descriptors;
}

export function buildSyntheticCdpWalletEntries(
  args: BuildSyntheticCdpWalletEntriesArgs,
): PortfolioDashboardWallet[] {
  const existingAddresses = getExistingAddresses(args.existingWallets);
  const entries = [
    buildEvmWalletEntry(args, existingAddresses),
    buildSolanaWalletEntry(args, existingAddresses),
  ];

  return entries.filter(
    (entry): entry is PortfolioDashboardWallet => entry != null,
  );
}

function getExistingAddresses(
  wallets: PortfolioDashboardWallet[],
): Set<string> {
  return new Set(wallets.map((wallet) => wallet.address.toLowerCase()));
}

function buildEvmWalletEntry(
  args: BuildSyntheticCdpWalletEntriesArgs,
  existingAddresses: Set<string>,
): PortfolioDashboardWallet | null {
  if (!args.evmAddress || existingAddresses.has(args.evmAddress.toLowerCase())) {
    return null;
  }

  return {
    walletId: `cdp-evm-${args.evmAddress}`,
    address: args.evmAddress,
    providerName: "Nex Wallet (EVM)",
    tokens: [],
    netWorthUsd: findWalletNetWorth(args.balances, args.evmAddress),
    namespace: "evm",
    lastUpdated: new Date().toISOString(),
    metadata: {
      walletType: "cdp",
      provider: "cdp",
      kind: "evm",
      chainId: args.evmChainId,
    },
  };
}

function buildSolanaWalletEntry(
  args: BuildSyntheticCdpWalletEntriesArgs,
  existingAddresses: Set<string>,
): PortfolioDashboardWallet | null {
  if (
    !args.solanaAddress ||
    existingAddresses.has(args.solanaAddress.toLowerCase())
  ) {
    return null;
  }

  return {
    walletId: `cdp-sol-${args.solanaAddress}`,
    address: args.solanaAddress,
    providerName: "Nex Wallet (SOL)",
    tokens: [],
    netWorthUsd: findWalletNetWorth(args.balances, args.solanaAddress),
    namespace: "solana",
    lastUpdated: new Date().toISOString(),
    metadata: {
      walletType: "cdp",
      provider: "cdp",
      kind: "solana",
    },
  };
}

function findWalletNetWorth(
  balances: WalletBalanceResult[],
  address: string,
): number {
  return (
    balances.find((balance) => balance.address.toLowerCase() === address.toLowerCase())
      ?.totalUsdValue ?? 0
  );
}
