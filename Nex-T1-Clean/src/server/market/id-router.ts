/**
 * Distinguishes between global CoinGecko slugs and chain-prefixed addresses.
 */
export type MarketAssetType = "global" | "chain_address";

export function getMarketAssetType(id: string): MarketAssetType {
  // 1) Explicit chain prefix (e.g., solana:..., ethereum:...)
  if (id.includes(":")) {
    return "chain_address";
  }

  // 2) Solana address (Base58, roughly 32-44 chars)
  // Simple heuristic for common Solana addresses if missing prefix
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)) {
    return "chain_address";
  }

  // 3) EVM address (0x...)
  if (id.startsWith("0x") && id.length === 42) {
    return "chain_address";
  }

  // Everything else is treated as a global CoinGecko slug (e.g., "bitcoin", "solana")
  return "global";
}

export function parseMarketId(id: string): { chain: string; address: string } {
  if (id.includes(":")) {
    const [chain, ...rest] = id.split(":");
    return { chain, address: rest.join(":") };
  }
  
  // Heuristic for Solana if no prefix
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id)) {
    return { chain: "solana", address: id };
  }

  return { chain: "bitcoin", address: id }; // Fallback
}
