import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { resolveCdpEmbeddedEvmSelectionPresentation } from "@/lib/cdp/cdp-wallet-selection";
import type { WalletPortfolio } from "@/lib/user/profile";
import {
  buildCdpEvmWalletSelection,
  buildCdpSolanaWalletSelection,
  normalizeSelectedWalletAddress,
} from "../../../hooks/wallets/use-selected-wallet.helpers";
import type { SelectedWalletSelection } from "../../../hooks/wallets/use-selected-wallet.types";

export type ChatEmbeddedWalletLane = {
  id: "embedded-evm" | "embedded-solana";
  platform: "evm" | "solana";
  label: string;
  address: string | null;
  chainIcon: string;
  chainName: string;
  details: string;
  disabled: boolean;
  selection: SelectedWalletSelection | null;
};

const EMBEDDED_EVM_LABEL = "Embedded EVM";
const EMBEDDED_SOLANA_LABEL = "Embedded Solana";
const UNAVAILABLE_LABEL = "Not available";

export function truncateEmbeddedWalletAddress(
  address: string | null | undefined,
): string {
  if (!address) return UNAVAILABLE_LABEL;
  return address.startsWith("0x")
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function buildChatEmbeddedWalletLanes(args: {
  evmAddress: string | null;
  solanaAddress: string | null;
  selectedWallet: SelectedWalletSelection | null;
  wallets: WalletPortfolio[];
}): ChatEmbeddedWalletLane[] {
  const selectedEvmChainId =
    args.selectedWallet?.kind === "cdp_evm_smart" &&
    normalizeSelectedWalletAddress(args.selectedWallet.address) ===
      normalizeSelectedWalletAddress(args.evmAddress) &&
    typeof args.selectedWallet.chainId === "number" &&
    Number.isFinite(args.selectedWallet.chainId)
      ? args.selectedWallet.chainId
      : null;

  const evmPresentation = args.evmAddress
    ? resolveCdpEmbeddedEvmSelectionPresentation({
        address: args.evmAddress,
        preferredChainId: selectedEvmChainId,
        wallets: args.wallets,
      })
    : null;

  return [
    {
      id: "embedded-evm",
      platform: "evm",
      label: EMBEDDED_EVM_LABEL,
      address: args.evmAddress,
      chainIcon: evmPresentation?.icon ?? LIQUID_GLASS_LOGOS.ethereum,
      chainName: evmPresentation?.name ?? "EVM",
      details: args.evmAddress
        ? `${evmPresentation?.name ?? "EVM"} · ${truncateEmbeddedWalletAddress(args.evmAddress)}`
        : UNAVAILABLE_LABEL,
      disabled: !args.evmAddress,
      selection: args.evmAddress
        ? buildCdpEvmWalletSelection({
            address: args.evmAddress,
            label: EMBEDDED_EVM_LABEL,
            preferredChainId: selectedEvmChainId,
            wallets: args.wallets,
          })
        : null,
    },
    {
      id: "embedded-solana",
      platform: "solana",
      label: EMBEDDED_SOLANA_LABEL,
      address: args.solanaAddress,
      chainIcon: LIQUID_GLASS_LOGOS.solana,
      chainName: "Solana",
      details: args.solanaAddress
        ? `Solana · ${truncateEmbeddedWalletAddress(args.solanaAddress)}`
        : UNAVAILABLE_LABEL,
      disabled: !args.solanaAddress,
      selection: args.solanaAddress
        ? buildCdpSolanaWalletSelection({
            address: args.solanaAddress,
            label: EMBEDDED_SOLANA_LABEL,
          })
        : null,
    },
  ];
}

export function resolveActiveChatEmbeddedWalletLane(
  lanes: ChatEmbeddedWalletLane[],
  selectedWallet: SelectedWalletSelection | null,
): ChatEmbeddedWalletLane | null {
  const selectedAddress = normalizeSelectedWalletAddress(selectedWallet?.address);
  const selectedKind = selectedWallet?.kind ?? null;

  const selectedLane = lanes.find((lane) => {
    if (lane.disabled || !selectedAddress) return false;
    if (
      (lane.platform === "evm" && selectedKind !== "cdp_evm_smart") ||
      (lane.platform === "solana" && selectedKind !== "cdp_solana_embedded")
    ) {
      return false;
    }
    return normalizeSelectedWalletAddress(lane.address) === selectedAddress;
  });

  return selectedLane ?? lanes.find((lane) => !lane.disabled) ?? lanes[0] ?? null;
}
