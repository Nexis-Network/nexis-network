import type { WalletSnapshot } from "@/modules/wallets/profile";
import { getDefaultCdpEvmCapability } from "@/lib/networks/capabilities";

export type WalletRuntimeAssetType = "evm" | "solana";
export type WalletRuntimeActivitySource = "moralis" | "cdp";

function toLower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function parseChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed, 16);
    return Number.isFinite(parsedHex) && parsedHex > 0 ? parsedHex : null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isCdpWalletSnapshot(wallet: WalletSnapshot): boolean {
  const metadata = wallet.metadata ?? {};
  const provider = toLower(wallet.provider);
  const metadataProvider = toLower(metadata.provider);
  const walletType = toLower(metadata.walletType);
  const source = toLower(metadata.source);

  return (
    provider.includes("cdp") ||
    metadataProvider.includes("cdp") ||
    walletType.includes("cdp") ||
    source === "cdp" ||
    source === "cdp_v2"
  );
}

export function resolveWalletAssetType(
  wallet: WalletSnapshot,
): WalletRuntimeAssetType {
  const metadata = wallet.metadata ?? {};
  const kind = toLower(metadata.kind);
  const provider = toLower(wallet.provider);
  const walletType = toLower(wallet.type);
  const address = typeof wallet.address === "string" ? wallet.address.trim() : "";

  const isSolana =
    kind.includes("sol") ||
    walletType.includes("solana") ||
    provider.includes("phantom") ||
    provider.includes("solflare") ||
    provider.includes("backpack") ||
    provider.includes("solana") ||
    (address.length > 0 && !address.startsWith("0x"));

  return isSolana ? "solana" : "evm";
}

export function resolveWalletChainId(wallet: WalletSnapshot): string {
  const type = resolveWalletAssetType(wallet);
  if (type === "solana") {
    return "solana";
  }

  const metadataChainId = parseChainId(wallet.metadata?.chainId);
  if (metadataChainId !== null) {
    return String(metadataChainId);
  }

  const tokenChainId = wallet.tokens.find((token) => token.chainId != null)?.chainId;
  const parsedTokenChainId = parseChainId(tokenChainId);
  if (parsedTokenChainId !== null) {
    return String(parsedTokenChainId);
  }

  if (isCdpWalletSnapshot(wallet)) {
    return String(getDefaultCdpEvmCapability().chainId);
  }

  return "1";
}

export function resolveWalletActivitySource(
  wallet: WalletSnapshot,
): WalletRuntimeActivitySource {
  const type = resolveWalletAssetType(wallet);
  return type === "evm" && isCdpWalletSnapshot(wallet) ? "cdp" : "moralis";
}

export function resolveWalletRuntimeContext(wallet: WalletSnapshot): {
  type: WalletRuntimeAssetType;
  chainId: string;
  source: WalletRuntimeActivitySource;
  isCdpWallet: boolean;
} {
  const type = resolveWalletAssetType(wallet);
  const chainId = resolveWalletChainId(wallet);
  const isCdpWallet = isCdpWalletSnapshot(wallet);
  const source = type === "evm" && isCdpWallet ? "cdp" : "moralis";

  return {
    type,
    chainId,
    source,
    isCdpWallet,
  };
}
