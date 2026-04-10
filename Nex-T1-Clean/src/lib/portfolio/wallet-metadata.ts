import { asJsonObject, getJsonNumber, getJsonString } from "@/lib/json";
import { toPortfolioRequestChainId } from "@/lib/portfolio/chain-filter";
import type { JsonObject } from "@/types/json";

type WalletMetadataCarrier = {
  metadata?: unknown;
  walletType?: string | null;
  providerName?: string | null;
  type?: string | null;
  provider?: string | null;
  status?: string | null;
};

export function getWalletMetadata(wallet: { metadata?: unknown } | null | undefined): JsonObject | null {
  return asJsonObject(wallet?.metadata);
}

export function getWalletChainHint(metadata: JsonObject | null): string | number | null {
  return (
    getJsonString(metadata, "chainId") ??
    getJsonNumber(metadata, "chainId") ??
    getJsonString(metadata, "chain_id") ??
    getJsonNumber(metadata, "chain_id") ??
    getJsonString(metadata, "network") ??
    getJsonString(metadata, "chain")
  );
}

export function resolveWalletRequestChainId(
  wallet: WalletMetadataCarrier | null | undefined,
): number | "solana" | null {
  const metadata = getWalletMetadata(wallet);
  return toPortfolioRequestChainId(getWalletChainHint(metadata), {
    walletType: wallet?.walletType ?? wallet?.type ?? null,
    providerName: wallet?.providerName ?? wallet?.provider ?? null,
    metadata,
  });
}

export function resolveWalletStatus(
  wallet: WalletMetadataCarrier | null | undefined,
  fallback = "active",
): string {
  const metadata = getWalletMetadata(wallet);
  return getJsonString(metadata, "status") ?? wallet?.status ?? fallback;
}
