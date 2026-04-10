import { normalizeNexWalletLabel } from "@/lib/cdp/cdp-wallet-labels";
import type { WalletPortfolio } from "@/lib/user/profile";
import { normalizeSelectedWalletAddress } from "@/hooks/wallets/use-selected-wallet.helpers";
import type { SelectedWalletSelection } from "@/hooks/wallets/use-selected-wallet";

export function resolveEmbeddedWalletLabel(
  wallets: WalletPortfolio[],
  address: string,
  fallback: string,
): string {
  const target = normalizeSelectedWalletAddress(address);
  if (!target) {
    return fallback;
  }

  for (const wallet of wallets) {
    const directAddress = normalizeSelectedWalletAddress(wallet.address);
    const smartAccountAddress = getSmartAccountAddress(wallet);

    if (target === directAddress || target === smartAccountAddress) {
      const label = normalizeNexWalletLabel(wallet.customLabel?.trim() || wallet.label?.trim());
      if (label) {
        return label;
      }
    }
  }

  return normalizeNexWalletLabel(fallback) ?? fallback;
}

export function getSelectedEmbeddedWalletChainId(
  selectedWallet: SelectedWalletSelection | null,
  address: string,
): number | null {
  return selectedWallet?.kind === "cdp_evm_smart" &&
    normalizeSelectedWalletAddress(selectedWallet.address) ===
      normalizeSelectedWalletAddress(address) &&
    typeof selectedWallet.chainId === "number" &&
    Number.isFinite(selectedWallet.chainId)
    ? selectedWallet.chainId
    : null;
}

function getSmartAccountAddress(wallet: WalletPortfolio): string | null {
  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? wallet.metadata
      : null;

  return typeof metadata?.smartAccountAddress === "string"
    ? normalizeSelectedWalletAddress(metadata.smartAccountAddress)
    : null;
}
