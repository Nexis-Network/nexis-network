import { CHAIN_ICON_BY_ID, DEFAULT_CHAIN_ICON } from "@/lib/chain-icons";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";
import type { WalletPortfolio } from "@/lib/user/profile";

export type CategoryKey = "inApp" | "smart" | "embedded" | "eoa" | "connected";

export type CategorySummary = {
  key: CategoryKey;
  label: string;
  icon: string;
  symbol: string;
  amount: number;
};

const CATEGORY_ORDER_INTERNAL: CategoryKey[] = ["inApp", "smart", "embedded", "eoa", "connected"];

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; defaultSymbol: string; defaultIcon: string }> = {
  inApp: {
    label: "In-app Wallets",
    defaultSymbol: "ETH",
    defaultIcon: LIQUID_GLASS_LOGOS.ethereum,
  },
  smart: {
    label: "Smart Wallets",
    defaultSymbol: "HYPE",
    defaultIcon: LIQUID_GLASS_LOGOS.hyperliquid,
  },
  embedded: {
    label: "Nex Wallets",
    defaultSymbol: "ETH",
    defaultIcon: "/icons/chain-icons/base.svg",
  },
  eoa: {
    label: "EOA Wallets",
    defaultSymbol: "ETH",
    defaultIcon: "/icons/chain-icons/optimism.svg",
  },
  connected: {
    label: "Connected Wallets",
    defaultSymbol: "ETH",
    defaultIcon: LIQUID_GLASS_LOGOS.bnb,
  },
};

const SYMBOL_ICON_MAP: Record<string, string> = {
  ETH: LIQUID_GLASS_LOGOS.ethereum,
  SOL: LIQUID_GLASS_LOGOS.solana,
  HYPE: LIQUID_GLASS_LOGOS.hyperliquid,
  OP: "/icons/chain-icons/optimism.svg",
  ARB: "/icons/chain-icons/arbitrum.svg",
  BNB: LIQUID_GLASS_LOGOS.bnb,
  SUI: "/icons/chain-icons/sui.svg",
};

export const CATEGORY_ORDER: readonly CategoryKey[] = CATEGORY_ORDER_INTERNAL;

function toLowerCaseSafe(value: UntypedJson): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function buildCategorySummaries(wallets: WalletPortfolio[]): CategorySummary[] {
  const buckets = CATEGORY_ORDER_INTERNAL.reduce<
    Record<CategoryKey, { amount: number; symbol: string; icon: string }>
  >((acc, key) => {
    acc[key] = {
      amount: 0,
      symbol: CATEGORY_CONFIG[key].defaultSymbol,
      icon: CATEGORY_CONFIG[key].defaultIcon,
    };
    return acc;
  }, {} as Record<CategoryKey, { amount: number; symbol: string; icon: string }>);

  wallets.forEach((wallet) => {
    const category = categorizeWallet(wallet);
    const value = extractNativeValue(wallet, category);
    if (!value) {
      return;
    }
    buckets[category].amount += value.amount;
    if (value.symbol) {
      buckets[category].symbol = value.symbol;
    }
    if (value.icon) {
      buckets[category].icon = value.icon;
    }
  });

  return CATEGORY_ORDER_INTERNAL.map((key) => ({
    key,
    label: CATEGORY_CONFIG[key].label,
    icon: buckets[key].icon,
    symbol: buckets[key].symbol,
    amount: buckets[key].amount,
  }));
}

export function categorizeWallet(wallet: WalletPortfolio): CategoryKey {
  const metadata = toRecord(wallet.metadata);
  const provider = (wallet.providerName ?? "").toLowerCase();
  const walletType = (wallet.walletType ?? "").toLowerCase();
  const metadataKind = toLowerCaseSafe(metadata?.kind);
  const metadataSource = toLowerCaseSafe(metadata?.source);
  const metadataTagsRaw = metadata?.tags;
  const metadataTags = Array.isArray(metadataTagsRaw)
    ? metadataTagsRaw.map((tag) => (typeof tag === "string" ? tag.toLowerCase() : ""))
    : [];

  if (metadata?.engineSmartAccountAddress || metadata?.engineAccountAddress || metadataKind === "hyperliquid") {
    return "smart";
  }

  if (
    metadataTags.some((tag) => tag.includes("embedded")) ||
    provider.includes("embedded") ||
    walletType.includes("embedded")
  ) {
    return "embedded";
  }

  if (
    metadataSource.includes("thirdweb") ||
    walletType.includes("in-app") ||
    walletType.includes("inapp") ||
    provider.includes("thirdweb")
  ) {
    return "inApp";
  }

  if (walletType === "external_connected" && provider) {
    return "connected";
  }

  if (walletType === "external_connected" || walletType === "ledger") {
    return "eoa";
  }

  return "inApp";
}

function extractNativeValue(wallet: WalletPortfolio, category: CategoryKey) {
  const metadata = toRecord(wallet.metadata);
  const amount =
    coerceNumber(metadata?.nativeAmount) ??
    coerceNumber((metadata?.balances as Record<string, UntypedJson> | undefined)?.nativeAmount) ??
    coerceNumber((metadata?.nativeBalance as Record<string, UntypedJson> | undefined)?.amount) ??
    coerceNumber(
      ((metadata?.balances as Record<string, UntypedJson> | undefined)?.native as Record<string, UntypedJson> | undefined)
        ?.amount,
    );

  if (amount == null || Number.isNaN(amount)) {
    return null;
  }

  const symbol = determineSymbol(wallet, metadata) ?? CATEGORY_CONFIG[category].defaultSymbol;
  const icon = determineIcon(wallet, metadata, symbol, category);

  return {
    amount,
    symbol,
    icon,
  };
}

function determineSymbol(wallet: WalletPortfolio, metadata: Record<string, UntypedJson> | null): string | null {
  const candidates = [
    metadata?.nativeCurrencySymbol,
    metadata?.nativeSymbol,
    metadata?.symbol,
    metadata?.currencySymbol,
    wallet.topAssets?.[0]?.symbol,
    wallet.topChains?.[0]?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = normalizeSymbol(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function determineIcon(
  wallet: WalletPortfolio,
  metadata: Record<string, UntypedJson> | null,
  symbol: string,
  category: CategoryKey,
): string {
  const symbolIcon = SYMBOL_ICON_MAP[symbol.toUpperCase()];
  if (symbolIcon) {
    return symbolIcon;
  }

  const metadataChainId = coerceNumber(metadata?.chainId);
  if (metadataChainId && CHAIN_ICON_BY_ID[metadataChainId]) {
    return CHAIN_ICON_BY_ID[metadataChainId];
  }

  const primaryChainIcon = wallet.topChains?.[0]?.icon;
  if (typeof primaryChainIcon === "string" && primaryChainIcon.trim().length > 0) {
    return primaryChainIcon;
  }

  return CATEGORY_CONFIG[category].defaultIcon ?? DEFAULT_CHAIN_ICON;
}

function normalizeSymbol(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const chainNameMap: Record<string, string> = {
    ethereum: "ETH",
    base: "ETH",
    solana: "SOL",
    hyperliquid: "HYPE",
    optimism: "OP",
    arbitrum: "ARB",
    "bnb chain": "BNB",
    bnb: "BNB",
    sui: "SUI",
  };
  if (chainNameMap[lower]) {
    return chainNameMap[lower];
  }
  return trimmed.length <= 6 ? trimmed.toUpperCase() : trimmed.slice(0, 6).toUpperCase();
}

function toRecord(value: UntypedJson): Record<string, UntypedJson> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, UntypedJson>;
}

function coerceNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
