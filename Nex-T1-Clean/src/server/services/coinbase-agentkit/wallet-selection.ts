import "server-only";

import { getDefaultCdpEvmCapability, getNetworkCapabilityByChainId } from "@/lib/networks/capabilities";
import { detectWalletKind } from "@/server/wallets/detect-kind";
import { resolveUserWallets } from "@/server/wallets/user-wallets";

type WalletPortfolio = Awaited<ReturnType<typeof resolveUserWallets>>[number];

export type CoinbaseAgentKitWalletSelection = {
  address: `0x${string}`;
  chainId: number;
  walletId: string;
  label: string;
};

function isCdpEvmWallet(wallet: WalletPortfolio): boolean {
  if (detectWalletKind(wallet) !== "evm") {
    return false;
  }

  const provider =
    typeof wallet.metadata?.provider === "string" ? wallet.metadata.provider.trim().toLowerCase() : "";
  const source =
    typeof wallet.metadata?.source === "string" ? wallet.metadata.source.trim().toLowerCase() : "";
  const walletType =
    typeof wallet.metadata?.walletType === "string"
      ? wallet.metadata.walletType.trim().toLowerCase()
      : wallet.walletType.trim().toLowerCase();

  return provider === "cdp" || source === "cdp" || source === "cdp_v2" || walletType.includes("cdp");
}

function normalizeAddress(value: string | null | undefined): `0x${string}` | null {
  const trimmed = value?.trim();
  if (!trimmed?.startsWith("0x")) {
    return null;
  }

  return trimmed.toLowerCase() as `0x${string}`;
}

function resolveWalletChainId(wallet: WalletPortfolio): number {
  const metadataChainId =
    typeof wallet.metadata?.chainId === "number"
      ? wallet.metadata.chainId
      : typeof wallet.metadata?.chainId === "string"
        ? Number.parseInt(wallet.metadata.chainId, 10)
        : null;

  if (metadataChainId && Number.isFinite(metadataChainId)) {
    return metadataChainId;
  }

  const defaultCapability = getDefaultCdpEvmCapability();
  return defaultCapability.chainId;
}

export async function resolveDefaultUserCoinbaseAgentKitWalletAddress(
  userId: string,
): Promise<string | null> {
  const selection = await resolveUserCoinbaseAgentKitWallet({ userId });
  return selection?.address ?? null;
}

export async function resolveUserCoinbaseAgentKitWallet(args: {
  userId: string;
  walletAddress?: string | null;
  chainId?: number | null;
}): Promise<CoinbaseAgentKitWalletSelection | null> {
  const wallets = await resolveUserWallets(args.userId);
  const requestedAddress = normalizeAddress(args.walletAddress);

  const evmWallets = wallets.filter((wallet) => detectWalletKind(wallet) === "evm");
  const cdpWallets = evmWallets.filter((wallet) => isCdpEvmWallet(wallet));
  const orderedWallets = cdpWallets.length > 0 ? cdpWallets : evmWallets;

  const selected =
    orderedWallets.find((wallet) => normalizeAddress(wallet.address) === requestedAddress) ??
    orderedWallets[0];

  const address = normalizeAddress(selected?.address);
  if (!selected || !address) {
    return null;
  }

  const chainId = args.chainId ?? resolveWalletChainId(selected);
  const capability = getNetworkCapabilityByChainId(chainId) ?? getDefaultCdpEvmCapability();

  return {
    address,
    chainId: capability.chainId,
    walletId: selected.walletId,
    label: selected.label?.trim() || "Embedded EVM Wallet",
  };
}
