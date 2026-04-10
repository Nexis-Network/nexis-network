// ---------------------------------------------------------------------------
// Nex Wallet types & chain configuration helpers
// ---------------------------------------------------------------------------

import { formatDisplayBalance } from "@/lib/cdp/cdp-balance-format";
import { getDefaultCdpEvmCapability } from "@/lib/networks/capabilities";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

export type CdpWalletDetailCardProps = {
  chain: "evm" | "solana";
  address: string | null;
  label?: string | null;
};

export function getChainConfig(chain: "evm" | "solana") {
  if (chain === "solana") {
    return {
      name: "Solana",
      symbol: "SOL",
      icon: LIQUID_GLASS_LOGOS.solana,
      explorerUrl: (addr: string) => `https://solscan.io/account/${addr}`,
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      defaultChainId: undefined,
    };
  }
  const defaultEvmCapability = getDefaultCdpEvmCapability();
  return {
    name: defaultEvmCapability.shortLabel,
    symbol: defaultEvmCapability.nativeSymbol,
    icon: defaultEvmCapability.icon,
    explorerUrl: (addr: string) =>
      `${defaultEvmCapability.explorerUrl?.replace(/\/+$/, "") ?? "https://basescan.org"}/address/${addr}`,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    defaultChainId: defaultEvmCapability.chainId,
  };
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBalance(balance: string, decimals = 18): string {
  return formatDisplayBalance(balance, decimals);
}
