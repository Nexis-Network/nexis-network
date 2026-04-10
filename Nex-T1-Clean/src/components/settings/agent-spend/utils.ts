// Domain: wallets (CDP V2)
// Responsibility: UI helpers for Agent Spend surfaces.

export function chainLabel(chainId: number | null) {
  if (chainId === 8453) return "Base";
  if (chainId === 10) return "Optimism";
  if (chainId === 56) return "BNB Chain";
  if (chainId === 42161) return "Arbitrum";
  if (chainId === 1) return "Ethereum";
  return chainId ? `Chain ${chainId}` : "—";
}

export function explorerAddressUrl(chainId: number | null, address: string | null): string | null {
  const addr = address?.trim();
  if (!addr) return null;
  if (chainId === 8453) return `https://basescan.org/address/${addr}`;
  if (chainId === 10) return `https://optimistic.etherscan.io/address/${addr}`;
  if (chainId === 56) return `https://bscscan.com/address/${addr}`;
  if (chainId === 42161) return `https://arbiscan.io/address/${addr}`;
  if (chainId === 1) return `https://etherscan.io/address/${addr}`;
  return null;
}

export function truncateHex(value: string, prefix = 8, suffix = 6): string {
  const trimmed = value.trim();
  if (trimmed.length <= prefix + suffix + 3) return trimmed;
  return `${trimmed.slice(0, prefix)}…${trimmed.slice(-suffix)}`;
}
