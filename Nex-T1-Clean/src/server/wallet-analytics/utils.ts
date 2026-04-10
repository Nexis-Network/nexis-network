import type { WalletPortfolio } from "@/lib/user/profile";

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getWalletMetadata(wallet: WalletPortfolio): Record<string, UntypedJson> | null {
  const metadata = wallet.metadata;
  return isRecord(metadata) ? metadata : null;
}

export function getWalletChainId(wallet: WalletPortfolio): number | null {
  const metadata = getWalletMetadata(wallet);
  const candidates: Array<UntypedJson> = [
    metadata?.chainId,
    metadata?.chain_id,
    metadata?.chain,
    metadata?.networkId,
    metadata?.network_id,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? Number.parseInt(candidate, 10) : candidate;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function resolveSignerAddress(wallet: WalletPortfolio): string | null {
  const metadata = getWalletMetadata(wallet);
  const candidates: Array<UntypedJson> = [
    metadata?.signerAddress,
    metadata?.signer_address,
    metadata?.address,
    metadata?.walletAddress,
    metadata?.wallet_address,
    wallet.address,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function resolveSmartAccountAddress(wallet: WalletPortfolio): string | null {
  const metadata = getWalletMetadata(wallet);
  const candidates: Array<UntypedJson> = [
    metadata?.smartAccountAddress,
    metadata?.smart_account_address,
    metadata?.engineSmartAccountAddress,
    metadata?.engine_smart_account_address,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function resolveEffectiveWalletAddress(wallet: WalletPortfolio): string | null {
  return resolveSmartAccountAddress(wallet) ?? resolveSignerAddress(wallet);
}

export function getWalletLabel(wallet: WalletPortfolio): string {
  const metadata = getWalletMetadata(wallet);
  const candidates: Array<UntypedJson> = [
    metadata?.label,
    metadata?.name,
    metadata?.title,
    wallet.providerName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  const address = resolveEffectiveWalletAddress(wallet) ?? wallet.address;
  if (typeof address === "string" && address.length > 8) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  return wallet.walletId;
}

export function inferWalletProvider(wallet: WalletPortfolio): string | null {
  if (typeof wallet.providerName === "string" && wallet.providerName.trim()) {
    return wallet.providerName.trim();
  }
  const metadata = getWalletMetadata(wallet);
  const provider = metadata?.provider ?? metadata?.providerName ?? metadata?.provider_name;
  return typeof provider === "string" && provider.trim() ? provider.trim() : null;
}
