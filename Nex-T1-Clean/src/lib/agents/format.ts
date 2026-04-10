import { findSupportedChain } from "@/lib/chains";
import type { AgentListingSummary } from "@/lib/agents/types";

const NETWORK_LABEL_OVERRIDES: Record<string, string> = {
  "eip155:1": "Ethereum",
  "eip155:10": "Optimism",
  "eip155:8453": "Base",
  "eip155:42161": "Arbitrum",
  "eip155:137": "Polygon",
  "solana:101": "Solana",
  "solana:103": "Solana (Devnet)",
};

export function formatBaseUnits(value: string, decimals: number): string {
  if (!/^\d+$/.test(value)) {
    return value;
  }
  if (decimals <= 0) {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const padded = value.padStart(decimals + 1, "0");
  const integer = padded.slice(0, -decimals);
  const fractionRaw = padded.slice(-decimals);
  const fraction = fractionRaw.replace(/0+$/, "");
  const integerWithGroup = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction.length > 0 ? `${integerWithGroup}.${fraction}` : integerWithGroup;
}

export function humanizeNetwork(networkId: string | null | undefined): string {
  if (!networkId) return "Unknown network";
  const normalized = networkId.toLowerCase();
  if (NETWORK_LABEL_OVERRIDES[normalized]) {
    return NETWORK_LABEL_OVERRIDES[normalized];
  }

  if (normalized.startsWith("eip155:")) {
    const [, rawId] = normalized.split(":");
    const chainId = Number.parseInt(rawId ?? "", 10);
    if (Number.isFinite(chainId)) {
      const chain = findSupportedChain(chainId);
      if (chain) {
        return chain.name;
      }
      return `Chain ${chainId}`;
    }
  }

  if (normalized.startsWith("solana:")) {
    const [, reference] = normalized.split(":");
    if (reference === "101") return "Solana";
    if (reference === "102") return "Solana (Testnet)";
    if (reference === "103") return "Solana (Devnet)";
    return `Solana (${reference ?? "unknown"})`;
  }

  return networkId;
}

export function deriveAssetSymbol(summary: AgentListingSummary): string {
  if (summary.currencySymbol && summary.currencySymbol.trim().length > 0) {
    return summary.currencySymbol.trim().toUpperCase();
  }
  if (!summary.assetId) {
    return "NATIVE";
  }
  const [, assetPart] = summary.assetId.split("/");
  if (!assetPart) {
    return summary.assetId.toUpperCase();
  }
  const [, reference] = assetPart.split(":");
  if (reference) {
    return reference.toUpperCase();
  }
  return assetPart.toUpperCase();
}

export function formatListingPrice(summary: AgentListingSummary): string {
  const amount = formatBaseUnits(summary.priceBaseUnits, summary.currencyDecimals);
  const symbol = deriveAssetSymbol(summary);
  if (symbol) {
    return `${amount} ${symbol}`;
  }
  return amount;
}

export function humanizeListingType(type: AgentListingSummary["listingType"]): string {
  switch (type) {
    case "sale":
      return "Buy";
    case "rent":
      return "Rent";
    case "usage":
      return "Usage";
    default:
      return type;
  }
}
