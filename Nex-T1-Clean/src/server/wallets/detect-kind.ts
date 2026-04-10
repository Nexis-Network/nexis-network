import type { WalletPortfolio, WalletChainSummary } from "@/lib/user/profile";

export type WalletKind = "evm" | "solana" | "stellar" | "hyperliquid" | "unknown";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const STELLAR_CLASSIC_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;
const STELLAR_MUXED_ADDRESS_REGEX = /^M[A-Z2-7]{68}$/;

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractKindFromMetadata(metadata: Record<string, UntypedJson> | null): WalletKind | null {
  const raw = typeof metadata?.kind === "string" ? metadata.kind.trim().toLowerCase() : "";
  if (raw === "evm" || raw === "solana" || raw === "stellar" || raw === "hyperliquid") {
    return raw;
  }
  const source = typeof metadata?.source === "string" ? metadata.source.trim().toLowerCase() : "";
  if (source.includes("solana")) return "solana";
  if (source.includes("evm")) return "evm";
  if (source.includes("stellar")) return "stellar";
  if (source.includes("hyperliquid")) return "hyperliquid";
  return null;
}

function extractKindFromChains(chains: WalletChainSummary[] | undefined | null): WalletKind | null {
  if (!Array.isArray(chains)) {
    return null;
  }
  const match = chains
    .map((chain) => (typeof chain?.name === "string" ? chain.name.toLowerCase() : ""))
    .find((name) => name.includes("solana") || name.includes("stellar") || name.includes("hyperliquid") || name.includes("eth") || name.includes("evm"));
  if (!match) {
    return null;
  }
  if (match.includes("solana")) return "solana";
  if (match.includes("stellar")) return "stellar";
  if (match.includes("hyperliquid")) return "hyperliquid";
  return "evm";
}

export function isEvmAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return address.startsWith("0x") && address.length === 42;
}

export function isSolanaAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return SOLANA_ADDRESS_REGEX.test(address);
}

export function isStellarAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const trimmed = address.trim();
  return STELLAR_CLASSIC_ADDRESS_REGEX.test(trimmed) || STELLAR_MUXED_ADDRESS_REGEX.test(trimmed);
}

export function detectWalletKind(wallet: WalletPortfolio): WalletKind {
  const metadata = isRecord(wallet.metadata) ? wallet.metadata : null;
  const metaKind = extractKindFromMetadata(metadata);
  if (metaKind) {
    return metaKind;
  }

  const chainKind = extractKindFromChains(wallet.topChains);
  if (chainKind) {
    return chainKind;
  }

  const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
  if (isEvmAddress(address)) {
    return "evm";
  }
  if (isSolanaAddress(address)) {
    return "solana";
  }
  if (isStellarAddress(address)) {
    return "stellar";
  }

  return "unknown";
}
