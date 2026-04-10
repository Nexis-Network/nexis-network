import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { detectWalletKind } from "@/server/wallets/detect-kind";
import type { WalletPortfolio } from "@/lib/user/profile";

export type SwapGuardOptions = {
  userId: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  chainHint?: string | null;
};

/**
 * Ensures swaps only execute between wallets the current user controls and that the wallet type matches
 * the requested chain namespace.
 */
export async function ensureSwapWalletGuards(options: SwapGuardOptions): Promise<void> {
  const { userId, fromAddress, toAddress, chainHint } = options;

  if (!fromAddress || fromAddress.trim().length === 0) {
    throw new Error("Source wallet address is required for swap execution.");
  }

  const wallets = await resolveUserWallets(userId);
  if (!wallets || wallets.length === 0) {
    throw new Error("No wallets are linked to this account. Link a wallet before trading.");
  }

  const normalizedSource = normalizeAddressForComparison(fromAddress);
  const namespace = inferChainNamespace(chainHint);
  const lookup = buildWalletLookup(wallets);
  const sourceWallet = lookup.get(normalizedSource);

  if (!sourceWallet) {
    throw new Error("Source wallet must match one of your registered addresses.");
  }

  if (!walletSupportsNamespace(sourceWallet, namespace)) {
    throw new Error(
      namespace === "solana"
        ? "Source wallet is not approved for Solana swaps."
        : "Source wallet is not approved for EVM swaps.",
    );
  }

  if (toAddress) {
    const normalizedRecipient = normalizeAddressForComparison(toAddress);
    if (!lookup.has(normalizedRecipient)) {
      throw new Error("Recipient wallet must be one of your verified addresses.");
    }
  }
}

const buildWalletLookup = (wallets: WalletPortfolio[]) => {
  const map = new Map<string, WalletPortfolio>();
  for (const wallet of wallets) {
    const key = normalizeAddressForComparison(wallet.address);
    if (key) {
      map.set(key, wallet);
    }
  }
  return map;
};

export const normalizeAddressForComparison = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
};

export const inferChainNamespace = (value?: string | null): "evm" | "solana" | "unknown" => {
  if (!value) {
    return "unknown";
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("sol")) {
    return "solana";
  }
  return "evm";
};

const walletSupportsNamespace = (wallet: WalletPortfolio, namespace: "evm" | "solana" | "unknown") => {
  const kind = detectWalletKind(wallet);
  if (namespace === "unknown") {
    // If we can't infer a namespace from the input, still ensure we only allow known swap-capable wallets.
    // This prevents unknown address types (e.g. Stellar) from being treated as EVM by default.
    return kind === "evm" || kind === "hyperliquid" || kind === "solana";
  }
  if (namespace === "solana") return kind === "solana";
  // For EVM swaps, allow only EVM-compatible wallets.
  return kind === "evm" || kind === "hyperliquid";
};
