import "server-only";

import { detectWalletKind } from "@/server/wallets/detect-kind";
import { resolveUserWallets } from "@/server/wallets/user-wallets";

function normalizeWalletAddress(address: string | null | undefined): string | null {
  const value = address?.trim();
  return value && value.length > 0 ? value : null;
}

function isCdpSolanaWallet(wallet: Awaited<ReturnType<typeof resolveUserWallets>>[number]): boolean {
  if (detectWalletKind(wallet) !== "solana") {
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
  const walletId =
    typeof wallet.walletId === "string" ? wallet.walletId.trim().toLowerCase() : "";

  return (
    provider === "cdp" ||
    source === "cdp" ||
    source === "cdp_v2" ||
    walletType.includes("cdp") ||
    walletId.startsWith("cdp:")
  );
}

export async function resolveDefaultUserSolanaWalletAddress(
  userId: string,
): Promise<string | null> {
  const wallets = await resolveUserWallets(userId);

  const cdpWallet =
    wallets.find((wallet) => isCdpSolanaWallet(wallet)) ??
    wallets.find((wallet) => detectWalletKind(wallet) === "solana");

  return normalizeWalletAddress(cdpWallet?.address ?? null);
}
