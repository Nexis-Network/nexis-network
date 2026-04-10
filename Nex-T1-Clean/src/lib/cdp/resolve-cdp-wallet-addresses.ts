import type { WalletPortfolio } from "@/lib/user/profile";

export type ResolvedCdpWalletAddresses = {
  evmAddress: string | null;
  solanaAddress: string | null;
};

const toLower = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isCdpWalletPortfolio = (wallet: WalletPortfolio): boolean => {
  const providerName = toLower(wallet.providerName);
  const metadata = wallet.metadata ?? {};
  const source = toLower(typeof metadata.source === "string" ? metadata.source : undefined);
  const provider = toLower(typeof metadata.provider === "string" ? metadata.provider : undefined);
  const walletType = toLower(typeof metadata.walletType === "string" ? metadata.walletType : undefined);

  if (source === "cdp" || source === "cdp_v2" || provider === "cdp") return true;
  if (walletType.includes("cdp")) return true;
  if (providerName.includes("cdp") || providerName.includes("coinbase")) return true;
  return false;
};

const inferPlatform = (wallet: WalletPortfolio, address: string): "evm" | "solana" => {
  const metadata = wallet.metadata ?? {};
  const kind = toLower(typeof metadata.kind === "string" ? metadata.kind : undefined);
  const platform = toLower(typeof metadata.platform === "string" ? metadata.platform : undefined);

  if (kind.includes("sol") || platform.includes("sol")) return "solana";
  if (kind.includes("evm") || platform.includes("evm")) return "evm";
  return address.startsWith("0x") ? "evm" : "solana";
};

/**
 * Resolve Nex Wallet addresses from wallet portfolio records.
 * Returns first discovered EVM and Solana addresses.
 */
export function resolveCdpWalletAddresses(
  wallets: WalletPortfolio[] | null | undefined,
): ResolvedCdpWalletAddresses {
  if (!Array.isArray(wallets) || wallets.length === 0) {
    return { evmAddress: null, solanaAddress: null };
  }

  let evmAddress: string | null = null;
  let solanaAddress: string | null = null;

  for (const wallet of wallets) {
    if (!wallet || !isCdpWalletPortfolio(wallet)) continue;

    const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
    if (!address) continue;

    const platform = inferPlatform(wallet, address);
    if (platform === "evm" && !evmAddress) {
      evmAddress = address;
    }
    if (platform === "solana" && !solanaAddress) {
      solanaAddress = address;
    }

    if (evmAddress && solanaAddress) break;
  }

  return { evmAddress, solanaAddress };
}

function normalizeResolvedAddress(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComparableAddress(value: string | null | undefined): string | null {
  const normalized = normalizeResolvedAddress(value);
  if (!normalized) return null;
  return normalized.startsWith("0x") ? normalized.toLowerCase() : normalized;
}

function walletSetContainsResolvedAddress(
  wallets: WalletPortfolio[] | null | undefined,
  address: string | null | undefined,
): boolean {
  const target = normalizeComparableAddress(address);
  if (!target || !Array.isArray(wallets)) {
    return false;
  }

  return wallets.some((wallet) => {
    if (!wallet || !isCdpWalletPortfolio(wallet)) {
      return false;
    }

    const directAddress = normalizeComparableAddress(wallet.address);
    if (directAddress === target) {
      return true;
    }

    const metadata = wallet.metadata ?? {};
    const smartAccountAddress =
      typeof metadata.smartAccountAddress === "string"
        ? normalizeComparableAddress(metadata.smartAccountAddress)
        : null;

    return smartAccountAddress === target;
  });
}

export function mergeResolvedCdpWalletAddresses(
  primary: Partial<ResolvedCdpWalletAddresses> | null | undefined,
  ...walletSets: Array<WalletPortfolio[] | null | undefined>
): ResolvedCdpWalletAddresses {
  const primaryEvmAddress = normalizeResolvedAddress(primary?.evmAddress);
  const primarySolanaAddress = normalizeResolvedAddress(primary?.solanaAddress);
  let resolvedEvmAddress: string | null = null;
  let resolvedSolanaAddress: string | null = null;

  for (const wallets of walletSets) {
    if (resolvedEvmAddress && resolvedSolanaAddress) break;

    const resolved = resolveCdpWalletAddresses(wallets);
    if (!resolvedEvmAddress) {
      resolvedEvmAddress = resolved.evmAddress;
    }
    if (!resolvedSolanaAddress) {
      resolvedSolanaAddress = resolved.solanaAddress;
    }
  }

  const primaryEvmKnown = walletSets.some((wallets) =>
    walletSetContainsResolvedAddress(wallets, primaryEvmAddress),
  );
  const primarySolanaKnown = walletSets.some((wallets) =>
    walletSetContainsResolvedAddress(wallets, primarySolanaAddress),
  );

  return {
    evmAddress:
      (primaryEvmKnown ? primaryEvmAddress : resolvedEvmAddress) ??
      primaryEvmAddress ??
      resolvedEvmAddress,
    solanaAddress:
      (primarySolanaKnown ? primarySolanaAddress : resolvedSolanaAddress) ??
      primarySolanaAddress ??
      resolvedSolanaAddress,
  };
}
