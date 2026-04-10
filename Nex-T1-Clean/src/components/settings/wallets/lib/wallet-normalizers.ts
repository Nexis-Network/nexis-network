import type { WalletPortfolio, WalletAnalyticsPosition } from "@/lib/user/profile";
import { getDefaultWalletIcon, getWalletIcon } from "@/lib/wallet-icons";
import { normalizeNexWalletLabel } from "@/lib/cdp/cdp-wallet-labels";
import {
  isNonZeroEVMAddress,
  isValidSolanaAddress,
  isValidStellarAddress,
} from "@/lib/utils/token-utils";
import { deriveWalletCategory, getWalletCategoryLabel } from "../wallet-type-badge";

import type { ChainDisplay, HoldingsCount, WalletRow } from "./wallet-table-types";
import { resolveChainIcon, normalizeIconPath } from "./wallet-formatters";
import { truncateAddress } from "./wallet-formatters";

/* ─── Record helpers ──────────────────────────────── */

export function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pickString(record: Record<string, UntypedJson> | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function coerceNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/* ─── Address validation ──────────────────────────── */

export function isAddressUsable(
  address: string,
  platform: WalletRow["platform"],
): boolean {
  if (platform === "solana") return isValidSolanaAddress(address);
  if (platform === "stellar") return isValidStellarAddress(address);
  if (platform === "hyperliquid") return Boolean(address.trim());
  return isNonZeroEVMAddress(address);
}

/* ─── Metadata balance extraction ─────────────────── */

export function resolveMetadataBalances(metadata: Record<string, UntypedJson> | null) {
  const rawBalances = metadata?.balances;
  const balances = isRecord(rawBalances) ? (rawBalances as Record<string, UntypedJson>) : null;
  return {
    nativeUsd: coerceNumber(balances?.nativeUsd ?? balances?.native_usd),
    tokenUsd: coerceNumber(balances?.tokenUsd ?? balances?.token_usd),
    nftUsd: coerceNumber(balances?.nftUsd ?? balances?.nft_usd),
    totalUsd: coerceNumber(balances?.totalUsd ?? balances?.total_usd),
  };
}

/* ─── Holdings count from analytics ───────────────── */

export function deriveHoldingsCount(positions?: WalletAnalyticsPosition[] | null): HoldingsCount {
  if (!Array.isArray(positions)) return { tokens: null, nfts: null };
  let tokens = 0;
  let nfts = 0;
  positions.forEach((position) => {
    const type = typeof position.assetType === "string" ? position.assetType.toLowerCase() : "";
    if (!type) return;
    if (type === "native" || type === "erc20" || type === "spl" || type === "other") {
      tokens += 1;
    } else if (type === "erc721" || type === "erc1155" || type === "spl_nft") {
      nfts += 1;
    }
  });
  return { tokens, nfts };
}

/* ─── Platform resolution ─────────────────────────── */

export function resolvePlatform(wallet: WalletPortfolio): "evm" | "solana" | "stellar" | "hyperliquid" {
  const metadata = isRecord(wallet.metadata) ? wallet.metadata : null;
  const kind = typeof metadata?.kind === "string" ? metadata.kind.toLowerCase() : "";
  if (kind === "solana") return "solana";
  if (kind === "stellar") return "stellar";
  if (kind === "hyperliquid") return "hyperliquid";
  const chainNames = resolveChains(wallet).map((c) => c.name.toLowerCase());
  if (chainNames.some((c) => c.includes("solana"))) return "solana";
  if (chainNames.some((c) => c.includes("stellar"))) return "stellar";
  if (chainNames.some((c) => c.includes("hyperliquid"))) return "hyperliquid";
  return "evm";
}

/* ─── Wallet label resolution ─────────────────────── */

export function resolveWalletLabel(wallet: WalletPortfolio): string {
  const metadata = isRecord(wallet.metadata) ? wallet.metadata : null;
  const label =
    (typeof wallet.customLabel === "string" && wallet.customLabel.trim().length > 0
      ? wallet.customLabel.trim()
      : null) ??
    (typeof wallet.label === "string" && wallet.label.trim().length > 0
      ? wallet.label.trim()
      : null) ??
    pickString(metadata, ["label", "name", "title", "walletLabel"]) ??
    (typeof wallet.providerName === "string" && wallet.providerName.trim().length > 0
      ? wallet.providerName.trim()
      : null);
  if (label) return normalizeNexWalletLabel(label) ?? label;
  if (wallet.address) return truncateAddress(wallet.address);
  return truncateAddress(wallet.walletId);
}

/* ─── Chain resolution ────────────────────────────── */

export function resolveChains(wallet: WalletPortfolio): ChainDisplay[] {
  const chains: ChainDisplay[] = [];
  const appendChain = (name: string, icon?: string | null) => {
    if (!name) return;
    chains.push({ name, icon: resolveChainIcon(name, icon) });
  };

  const rawChains = Array.isArray(wallet.topChains) ? wallet.topChains : [];
  rawChains.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, UntypedJson>;
    const name = pickString(record, ["name", "chain", "network", "label"]);
    if (!name) return;
    appendChain(name, typeof record.icon === "string" ? record.icon : pickString(record, ["logo", "iconUrl"]));
  });

  if (chains.length === 0) {
    const metadata = isRecord(wallet.metadata) ? wallet.metadata : null;
    const metadataChains = metadata?.chains;
    if (Array.isArray(metadataChains)) {
      metadataChains.forEach((entry) => {
        if (typeof entry === "string") {
          appendChain(entry);
        } else if (isRecord(entry)) {
          const name = pickString(entry, ["name", "chain", "network", "label"]);
          if (name) appendChain(name, pickString(entry, ["icon", "logo"]));
        }
      });
    } else if (typeof metadataChains === "string") {
      metadataChains.split(",").map((v) => v.trim()).filter(Boolean).forEach((v) => appendChain(v));
    }
  }

  return chains;
}

/* ─── Wallet icon resolution ──────────────────────── */

export function resolveWalletIcon(wallet: WalletPortfolio): string | null {
  const direct = normalizeIconPath(wallet.walletTypeIcon);
  if (direct) return direct;

  const icon = getWalletIcon(
    {
      provider: typeof wallet.providerName === "string" ? wallet.providerName : undefined,
      walletType: wallet.walletType,
    },
    { fallback: "" },
  );

  const normalized = normalizeIconPath(icon);
  if (normalized) return normalized;

  if (wallet.walletType === "agent_generated") return getDefaultWalletIcon();
  return null;
}

/* ─── Main normalizer ─────────────────────────────── */

export function normalizeWalletRows(wallets: WalletPortfolio[]): WalletRow[] {
  const all = Array.isArray(wallets) ? wallets : [];
  return all.map((wallet) => {
    const type = deriveWalletCategory(wallet);
    const metadata = isRecord(wallet.metadata) ? (wallet.metadata as Record<string, UntypedJson>) : null;
    const analytics = wallet.analytics ?? null;
    const totals = analytics?.totals ?? null;
    const smartAccountAddress =
      pickString(metadata, ["smartAccountAddress", "smart_account_address"]) ??
      pickString(metadata, ["engineSmartAccountAddress", "engine_smart_account_address"]);
    const signerAddress =
      pickString(metadata, ["signerAddress", "signer_address", "address", "walletAddress", "wallet_address"]) ??
      pickString(metadata, ["engineAccountAddress", "engine_account_address"]) ??
      (typeof wallet.address === "string" ? wallet.address : null);
    const engineServerWalletAddress = pickString(metadata, ["engineServerWalletAddress", "engine_server_wallet_address"]);
    const engineAccountAddress = pickString(metadata, ["engineAccountAddress", "engine_account_address"]);
    const balances = resolveMetadataBalances(metadata);
    const chainId = typeof metadata?.chainId === "number" ? (metadata.chainId as number) : null;
    const provider = typeof metadata?.provider === "string" ? String(metadata.provider).toLowerCase() : "";
    const isSmartAccount = provider === "safe" || provider === "cdp" || String(wallet.providerName ?? "").toLowerCase().includes("safe") || String(wallet.providerName ?? "").toLowerCase().includes("cdp");
    const provisioningStatus = typeof metadata?.status === "string" ? String(metadata.status) : null;
    const lastError = typeof metadata?.lastError === "string" ? String(metadata.lastError) : null;
    const change24hPercent = coerceNumber(totals?.change24hPercent ?? wallet.change24hPercent);
    const costBasisUsd = coerceNumber(totals?.costBasisUsd);
    const unrealizedPnlUsd = coerceNumber(totals?.unrealizedPnlUsd ?? wallet.gainLoss24hUsd);
    const tokenValueUsd = coerceNumber(totals?.tokenValueUsd) ?? balances.tokenUsd;
    const nftValueUsd = coerceNumber(totals?.nftValueUsd) ?? balances.nftUsd;
    return {
      id: wallet.walletId,
      label: resolveWalletLabel(wallet),
      provider: wallet.providerName ?? null,
      sourceProvider: provider || null,
      address: signerAddress,
      smartAccountAddress: smartAccountAddress ?? null,
      engineServerWalletAddress: engineServerWalletAddress ?? engineAccountAddress ?? null,
      chainId,
      isSmartAccount,
      provisioningStatus,
      lastError,
      chains: resolveChains(wallet),
      type,
      typeLabel: getWalletCategoryLabel(type),
      walletIcon: resolveWalletIcon(wallet),
      topAssets: Array.isArray(wallet.topAssets)
        ? wallet.topAssets.slice(0, 3).map((a) => ({ icon: a.icon ?? null, symbol: a.symbol ?? null }))
        : [],
      platform: resolvePlatform(wallet),
      totals: {
        netWorth: coerceNumber(totals?.valueUsd ?? wallet.netWorthUsd ?? balances.totalUsd),
        change24hPercent,
        costBasisUsd,
        unrealizedPnlUsd,
        tokenValueUsd,
        nftValueUsd,
      },
      analyticsPositions: analytics?.positions,
      holdingsCount: deriveHoldingsCount(analytics?.positions),
    };
  });
}
