import type { WalletPortfolio } from "@/lib/user/profile";
import { getNexSmartAccountLabel } from "@/lib/cdp/cdp-wallet-labels";
import { resolveCdpEmbeddedEvmSelectionChainId } from "@/lib/cdp/cdp-wallet-selection";
import type { SelectedWalletKind, SelectedWalletPlatform, SelectedWalletSelection } from "./use-selected-wallet.types";

export const DEFAULT_EVM_CHAIN_ID = 8453;

export function normalizeSelectedWalletAddress(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

export function isEvmAddress(value: string): boolean {
  return value.startsWith("0x");
}

export function isCdpKind(kind: SelectedWalletKind): boolean {
  return kind === "cdp_evm_smart" || kind === "cdp_solana_embedded";
}

export function buildEoaWalletSelection(args: {
  address: string;
  chainId?: number | null;
}): SelectedWalletSelection {
  const platform = resolveWalletPlatform(args.chainId, args.address);

  return {
    id: `eoa-${args.address}`,
    kind: "eoa",
    platform,
    address: args.address,
    label: platform === "solana" ? "EOA (Solana)" : "EOA (EVM)",
    chainId: platform === "evm" ? (args.chainId ?? DEFAULT_EVM_CHAIN_ID) : null,
    source: "chat_composer",
  };
}

export function buildCdpEvmWalletSelection(args: {
  address: string;
  label?: string;
  preferredChainId?: number | null;
  wallets?: WalletPortfolio[] | null;
}): SelectedWalletSelection {
  return {
    id: "cdp-v2-evm",
    kind: "cdp_evm_smart",
    platform: "evm",
    address: args.address,
    label: args.label ?? getNexSmartAccountLabel(),
    chainId: resolveCdpEmbeddedEvmSelectionChainId({
      address: args.address,
      preferredChainId: args.preferredChainId,
      wallets: args.wallets,
    }),
    source: "chat_composer",
  };
}

export function buildCdpSolanaWalletSelection(args: {
  address: string;
  label?: string;
}): SelectedWalletSelection {
  return {
    id: "cdp-v2-solana",
    kind: "cdp_solana_embedded",
    platform: "solana",
    address: args.address,
    label: args.label ?? getNexSmartAccountLabel(),
    chainId: null,
    source: "chat_composer",
  };
}

export function buildManualWalletSelection(address: string): SelectedWalletSelection {
  return {
    id: `manual-${address}`,
    kind: "eoa",
    platform: isEvmAddress(address) ? "evm" : "solana",
    address,
    label: isEvmAddress(address) ? "EOA (EVM)" : "EOA (Solana)",
    chainId: isEvmAddress(address) ? DEFAULT_EVM_CHAIN_ID : null,
    source: "chat_composer",
  };
}

export function toKnownWalletSelection(args: {
  value: string;
  eoaAddress?: string;
  eoaChainId?: number;
  cdpEvmAddress?: string | null;
  cdpSolanaAddress?: string | null;
  currentWallet?: SelectedWalletSelection | null;
  wallets?: WalletPortfolio[] | null;
}): SelectedWalletSelection | null {
  const normalizedValue = normalizeSelectedWalletAddress(args.value);
  if (!normalizedValue) {
    return null;
  }

  const normalizedEoa = normalizeSelectedWalletAddress(args.eoaAddress);
  if (normalizedEoa && normalizedValue === normalizedEoa) {
    return buildEoaWalletSelection({
      address: args.value,
      chainId: args.eoaChainId,
    });
  }

  const normalizedCdpEvm = normalizeSelectedWalletAddress(args.cdpEvmAddress);
  if (normalizedCdpEvm && normalizedValue === normalizedCdpEvm) {
    const preferredChainId =
      args.currentWallet?.kind === "cdp_evm_smart" &&
      normalizeSelectedWalletAddress(args.currentWallet.address) === normalizedValue
        ? args.currentWallet.chainId
        : null;

    return buildCdpEvmWalletSelection({
      address: args.value,
      preferredChainId,
      wallets: args.wallets,
    });
  }

  const normalizedCdpSolana = normalizeSelectedWalletAddress(args.cdpSolanaAddress);
  if (normalizedCdpSolana && normalizedValue === normalizedCdpSolana) {
    return buildCdpSolanaWalletSelection({ address: args.value });
  }

  return null;
}

export function getDefaultSelection(args: {
  eoaAddress?: string;
  eoaChainId?: number;
  cdpEvmAddress?: string | null;
  cdpSolanaAddress?: string | null;
  currentWallet?: SelectedWalletSelection | null;
  wallets?: WalletPortfolio[] | null;
}): SelectedWalletSelection | null {
  const values = [args.eoaAddress, args.cdpEvmAddress, args.cdpSolanaAddress];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const selection = toKnownWalletSelection({
      value,
      eoaAddress: args.eoaAddress,
      eoaChainId: args.eoaChainId,
      cdpEvmAddress: args.cdpEvmAddress,
      cdpSolanaAddress: args.cdpSolanaAddress,
      currentWallet: args.currentWallet,
      wallets: args.wallets,
    });

    if (selection) {
      return selection;
    }
  }

  return null;
}

function resolveWalletPlatform(
  chainId: number | null | undefined,
  address: string,
): SelectedWalletPlatform {
  if ((chainId ?? DEFAULT_EVM_CHAIN_ID) === 900001) {
    return "solana";
  }

  return isEvmAddress(address) ? "evm" : "solana";
}
