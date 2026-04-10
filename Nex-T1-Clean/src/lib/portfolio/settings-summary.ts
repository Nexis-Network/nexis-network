import { LSD_SYMBOLS, isLpOrDefiToken } from "@/modules/wallets/profile/asset-classification";

export const SETTINGS_PORTFOLIO_RANGES = ["day", "week", "month", "year"] as const;
export const SETTINGS_TRACKED_ASSET_SYMBOLS = ["USDT", "USDC", "ETH", "SOL"] as const;
export const SETTINGS_MAX_TRACKED_ASSETS = 8;

export type SettingsPortfolioRange = (typeof SETTINGS_PORTFOLIO_RANGES)[number];
export type SettingsCoreTrackedAssetSymbol = (typeof SETTINGS_TRACKED_ASSET_SYMBOLS)[number];
export type SettingsTrackedAssetSymbol = string;
export type SettingsPortfolioCategory = "investment" | "stablecoin";
export type SettingsPortfolioSliceLabel = "Investments" | "Stablecoins";
export type SettingsPortfolioWalletSource = "cdp-embedded-evm" | "cdp-embedded-solana";
export type SettingsPortfolioWalletFilter = SettingsPortfolioWalletSource | "all";
export type SettingsPortfolioStatus = "ready" | "empty" | "partial";
export type SettingsPortfolioEmptyReason = "no-wallets" | "no-holdings" | null;
export type SettingsPortfolioRiskPosture = "defensive" | "balanced" | "deployed";

export type SettingsPortfolioSeriesPoint = {
  timestamp: number;
  valueUsd: number;
  color: string;
  empty: boolean;
  volumeUsd?: number;
  buyVolumeUsd?: number;
  sellVolumeUsd?: number;
  buyCount?: number;
  sellCount?: number;
};

export type SettingsPortfolioHolding = {
  symbol: string;
  name: string;
  chain: string;
  chainIcon: string | null;
  category: SettingsPortfolioCategory;
  valueUsd: number;
  quantity?: number;
  priceUsd?: number;
  changePct24h?: number | null;
  walletSource: SettingsPortfolioWalletSource;
  address?: string | null;
  color: string;
};

export type SettingsTrackedAsset = {
  id: string;
  symbol: SettingsTrackedAssetSymbol;
  name: string;
  totalUsd: number;
  quantity: number;
  priceUsd: number | null;
  changePct24h: number | null;
  color: string;
  series: SettingsPortfolioSeriesPoint[];
  isCore: boolean;
  coreSymbol: SettingsCoreTrackedAssetSymbol | null;
};

export type PortfolioSlice = {
  label: SettingsPortfolioSliceLabel;
  totalUsd: number;
  changePct?: number | null;
  allocationPct: number;
  series: SettingsPortfolioSeriesPoint[];
  holdings: SettingsPortfolioHolding[];
};

export type SettingsPortfolioChainBreakdown = {
  chain: string;
  chainIcon: string | null;
  totalUsd: number;
  allocationPct: number;
};

export type SettingsPortfolioWalletSummary = {
  hasWallets: boolean;
  evmAddress: string | null;
  solanaAddress: string | null;
  evmCount: number;
  solanaCount: number;
};

export type SettingsPortfolioSummary = {
  status: SettingsPortfolioStatus;
  emptyReason: SettingsPortfolioEmptyReason;
  range: SettingsPortfolioRange;
  generatedAt: string;
  totalPortfolioUsd: number;
  totalDeltaPct: number | null;
  activeChainsCount: number;
  largestAsset: SettingsPortfolioHolding | null;
  riskPosture: SettingsPortfolioRiskPosture;
  subtitle: string;
  message: string | null;
  wallets: SettingsPortfolioWalletSummary;
  chains: SettingsPortfolioChainBreakdown[];
  trackedAssets: SettingsTrackedAsset[];
  slices: {
    investments: PortfolioSlice;
    stablecoins: PortfolioSlice;
  };
};

export type SettingsPortfolioRangeConfig = {
  durationMs: number;
  points: number;
};

export const SETTINGS_PORTFOLIO_RANGE_CONFIG: Record<SettingsPortfolioRange, SettingsPortfolioRangeConfig> = {
  day: {
    durationMs: 24 * 60 * 60 * 1000,
    points: 12,
  },
  week: {
    durationMs: 7 * 24 * 60 * 60 * 1000,
    points: 14,
  },
  month: {
    durationMs: 30 * 24 * 60 * 60 * 1000,
    points: 16,
  },
  year: {
    durationMs: 365 * 24 * 60 * 60 * 1000,
    points: 12,
  },
};

export const SETTINGS_TRACKED_ASSET_ACTIVITY_POINTS: Record<SettingsPortfolioRange, number> = {
  day: 24,
  week: 7,
  month: 30,
  year: 12,
};

export function isSettingsPortfolioWalletFilter(
  value: string | null | undefined,
): value is SettingsPortfolioWalletFilter {
  return value === "all" || value === "cdp-embedded-evm" || value === "cdp-embedded-solana";
}

export const SETTINGS_PORTFOLIO_COLORS = {
  investment: "#39B7FF",
  stablecoin: "#F4B65A",
  empty: "#E7E7E7",
} as const;

const KNOWN_ASSET_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  WBTC: "#F7931A",
  ETH: "#627EEA",
  WETH: "#627EEA",
  SOL: "#14F195",
  WSOL: "#14F195",
  MATIC: "#8247E5",
  POL: "#8247E5",
  AVAX: "#E84142",
  OP: "#FF0420",
  ARB: "#28A0F0",
  LINK: "#2A5ADA",
  USDC: "#2775CA",
  USDCE: "#2775CA",
  USDT: "#26A17B",
  USDTE: "#26A17B",
  DAI: "#F5AC37",
  USDE: "#6B7280",
  PYUSD: "#2563EB",
  EURC: "#3B82F6",
};

const SETTINGS_TRACKED_ASSET_CONFIG: Record<
  SettingsCoreTrackedAssetSymbol,
  {
    aliases: string[];
    color: string;
    name: string;
  }
> = {
  USDT: {
    aliases: ["USDT", "USDTE", "USDT0", "USDTB"],
    color: "#50AF95",
    name: "Tether USD",
  },
  USDC: {
    aliases: ["USDC", "USDCE"],
    color: "#2775C9",
    name: "USD Coin",
  },
  ETH: {
    aliases: ["ETH", "WETH"],
    color: "#EDF0F4",
    name: "Ethereum",
  },
  SOL: {
    aliases: ["SOL", "WSOL"],
    color: "#8F6DF3",
    name: "Solana",
  },
};

function createEmptySettingsPortfolioSeries(range: SettingsPortfolioRange): SettingsPortfolioSeriesPoint[] {
  const config = SETTINGS_PORTFOLIO_RANGE_CONFIG[range];
  const now = Date.now();
  const step = config.points > 1 ? config.durationMs / (config.points - 1) : config.durationMs;

  return Array.from({ length: config.points }, (_, index) => ({
    timestamp: Math.round(now - config.durationMs + index * step),
    valueUsd: 0,
    color: SETTINGS_PORTFOLIO_COLORS.empty,
    empty: true,
  }));
}

function createEmptyTrackedAssetActivitySeries(
  range: SettingsPortfolioRange,
  color: string,
  now = Date.now(),
): SettingsPortfolioSeriesPoint[] {
  const durationMs = SETTINGS_PORTFOLIO_RANGE_CONFIG[range].durationMs;
  const points = SETTINGS_TRACKED_ASSET_ACTIVITY_POINTS[range];
  const step = durationMs / points;
  const start = now - durationMs;

  return Array.from({ length: points }, (_value, index) => ({
    timestamp: Math.round(start + step * (index + 1)),
    valueUsd: 0,
    volumeUsd: 0,
    buyVolumeUsd: 0,
    sellVolumeUsd: 0,
    buyCount: 0,
    sellCount: 0,
    color,
    empty: true,
  }));
}

export function createEmptySettingsPortfolioSummary(
  range: SettingsPortfolioRange = "month",
): SettingsPortfolioSummary {
  const baseSeries = createEmptySettingsPortfolioSeries(range);

  return {
    status: "empty",
    emptyReason: "no-wallets",
    range,
    generatedAt: new Date().toISOString(),
    totalPortfolioUsd: 0,
    totalDeltaPct: null,
    activeChainsCount: 0,
    largestAsset: null,
    riskPosture: "defensive",
    subtitle: "No funded wallets yet",
    message: null,
    wallets: {
      hasWallets: false,
      evmAddress: null,
      solanaAddress: null,
      evmCount: 0,
      solanaCount: 0,
    },
    chains: [],
    trackedAssets: SETTINGS_TRACKED_ASSET_SYMBOLS.map((symbol) => ({
      id: symbol.toLowerCase(),
      symbol,
      name: SETTINGS_TRACKED_ASSET_CONFIG[symbol].name,
      totalUsd: 0,
      quantity: 0,
      priceUsd: null,
      changePct24h: null,
      color: SETTINGS_TRACKED_ASSET_CONFIG[symbol].color,
      series: createEmptyTrackedAssetActivitySeries(
        range,
        SETTINGS_TRACKED_ASSET_CONFIG[symbol].color,
      ),
      isCore: true,
      coreSymbol: symbol,
    })),
    slices: {
      investments: {
        label: "Investments",
        totalUsd: 0,
        changePct: null,
        allocationPct: 0,
        series: baseSeries,
        holdings: [],
      },
      stablecoins: {
        label: "Stablecoins",
        totalUsd: 0,
        changePct: null,
        allocationPct: 0,
        series: baseSeries,
        holdings: [],
      },
    },
  };
}

const TRACKED_ASSET_ALIAS_LOOKUP = new Map<string, SettingsCoreTrackedAssetSymbol>(
  Object.entries(SETTINGS_TRACKED_ASSET_CONFIG).flatMap(([symbol, config]) =>
    config.aliases.map((alias) => [normalizeAssetSymbol(alias), symbol as SettingsCoreTrackedAssetSymbol] as const),
  ),
);

const STABLECOIN_SYMBOLS = new Set(
  [
    "USDC",
    "USDT",
    "DAI",
    "USDE",
    "PYUSD",
    "USDG",
    "RLUSD",
    "USDD",
    "EURC",
    "TUSD",
    "MUSD",
    "CUSD",
    "BUSD",
    "USD1",
    "FDUSD",
    "USDS",
    "CRVUSD",
    "LUSD",
    "GUSD",
    "USDP",
    "FRAX",
    "USDB",
    "USDCE",
    "USDTE",
    "USDT0",
    "USDTB",
  ].map(normalizeAssetSymbol),
);

const EVM_STABLECOIN_ADDRESSES = new Set(
  [
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0x6b175474e89094c44da98b954eedeac495271d0f",
    "0x833589fcd6edb6e08f4c7c90b7aaa2a5da4a1328",
    "0x5db7144ed24730230c2c43dd4aafa09f22c470a",
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
  ].map((address) => address.toLowerCase()),
);

const SOLANA_STABLECOIN_ADDRESSES = new Set(
  [
    "epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v",
    "es9vmfrzacerjmjfrf4h2fyd4kconky11mcce8benwnyb",
  ],
);

function normalizeAddress(address: string | null | undefined): string {
  return typeof address === "string" ? address.trim().toLowerCase() : "";
}

export function normalizeAssetSymbol(symbol: string | null | undefined): string {
  return typeof symbol === "string" ? symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

export function isSettingsPortfolioRange(value: string | null | undefined): value is SettingsPortfolioRange {
  return SETTINGS_PORTFOLIO_RANGES.includes((value ?? "") as SettingsPortfolioRange);
}

export function getAssetColor(symbol: string | null | undefined, category: SettingsPortfolioCategory): string {
  const normalized = normalizeAssetSymbol(symbol);
  return KNOWN_ASSET_COLORS[normalized] ?? SETTINGS_PORTFOLIO_COLORS[category];
}

export function isCoreTrackedAssetSymbol(symbol: string | null | undefined): symbol is SettingsCoreTrackedAssetSymbol {
  return SETTINGS_TRACKED_ASSET_SYMBOLS.includes((symbol ?? "") as SettingsCoreTrackedAssetSymbol);
}

export function resolveTrackedAssetSymbol(symbol: string | null | undefined): SettingsCoreTrackedAssetSymbol | null {
  const normalized = normalizeAssetSymbol(symbol);
  return TRACKED_ASSET_ALIAS_LOOKUP.get(normalized) ?? null;
}

export function getTrackedAssetPresentation(symbol: SettingsCoreTrackedAssetSymbol) {
  return SETTINGS_TRACKED_ASSET_CONFIG[symbol];
}

export function isStablecoinAsset(params: {
  symbol?: string | null;
  address?: string | null;
  walletSource?: SettingsPortfolioWalletSource;
}): boolean {
  const normalizedSymbol = normalizeAssetSymbol(params.symbol);
  if (normalizedSymbol && STABLECOIN_SYMBOLS.has(normalizedSymbol)) {
    return true;
  }

  const normalizedAddress = normalizeAddress(params.address);
  if (!normalizedAddress) {
    return false;
  }

  if (params.walletSource === "cdp-embedded-solana") {
    return SOLANA_STABLECOIN_ADDRESSES.has(normalizedAddress);
  }

  return EVM_STABLECOIN_ADDRESSES.has(normalizedAddress);
}

export function classifyPortfolioHolding(params: {
  symbol?: string | null;
  name?: string | null;
  address?: string | null;
  walletSource?: SettingsPortfolioWalletSource;
}): SettingsPortfolioCategory {
  if (
    isStablecoinAsset({
      symbol: params.symbol,
      address: params.address,
      walletSource: params.walletSource,
    })
  ) {
    return "stablecoin";
  }

  const normalizedSymbol = normalizeAssetSymbol(params.symbol);
  if (LSD_SYMBOLS.has(normalizedSymbol) || isLpOrDefiToken(params.symbol ?? null, params.name ?? null)) {
    return "investment";
  }

  return "investment";
}

export function getSliceColor(label: SettingsPortfolioSliceLabel): string {
  return label === "Stablecoins"
    ? SETTINGS_PORTFOLIO_COLORS.stablecoin
    : SETTINGS_PORTFOLIO_COLORS.investment;
}

export function roundTo(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function toPercent(value: number, total: number, precision = 1): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return roundTo((value / total) * 100, precision);
}

export function createEmptySeries(
  range: SettingsPortfolioRange,
  color: string = SETTINGS_PORTFOLIO_COLORS.empty,
  now = Date.now(),
): SettingsPortfolioSeriesPoint[] {
  const config = SETTINGS_PORTFOLIO_RANGE_CONFIG[range];
  const step = config.durationMs / config.points;
  const start = now - config.durationMs;

  return Array.from({ length: config.points }, (_value, index) => ({
    timestamp: Math.round(start + step * index),
    valueUsd: 0,
    color,
    empty: true,
  }));
}

export function deriveRiskPosture(stablecoinAllocationPct: number): SettingsPortfolioRiskPosture {
  if (stablecoinAllocationPct >= 55) return "defensive";
  if (stablecoinAllocationPct >= 30) return "balanced";
  return "deployed";
}

export function createEmptyTrackedAssets(
  range: SettingsPortfolioRange,
  now = Date.now(),
): SettingsTrackedAsset[] {
  return SETTINGS_TRACKED_ASSET_SYMBOLS.map((symbol) => {
    const presentation = getTrackedAssetPresentation(symbol);

    return {
      id: symbol,
      symbol,
      name: presentation.name,
      totalUsd: 0,
      quantity: 0,
      priceUsd: null,
      changePct24h: null,
      color: presentation.color,
      series: createEmptyTrackedAssetActivitySeries(range, presentation.color, now),
      isCore: true,
      coreSymbol: symbol,
    };
  });
}

export function createEmptyPortfolioSummary(params: {
  range: SettingsPortfolioRange;
  generatedAt?: string;
  emptyReason: SettingsPortfolioEmptyReason;
  message: string;
  wallets?: Partial<SettingsPortfolioWalletSummary>;
}): SettingsPortfolioSummary {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const now = Date.now();
  const investmentsColor = getSliceColor("Investments");
  const stablecoinsColor = getSliceColor("Stablecoins");

  return {
    status: "empty",
    emptyReason: params.emptyReason,
    range: params.range,
    generatedAt,
    totalPortfolioUsd: 0,
    totalDeltaPct: null,
    activeChainsCount: 0,
    largestAsset: null,
    riskPosture: "defensive",
    subtitle: "Monitor deployed positions versus liquid reserves across your embedded EVM and Solana wallets.",
    message: params.message,
    wallets: {
      hasWallets: false,
      evmAddress: null,
      solanaAddress: null,
      evmCount: 0,
      solanaCount: 0,
      ...params.wallets,
    },
    chains: [],
    trackedAssets: createEmptyTrackedAssets(params.range, now),
    slices: {
      investments: {
        label: "Investments",
        totalUsd: 0,
        changePct: null,
        allocationPct: 0,
        series: createEmptySeries(params.range, investmentsColor, now),
        holdings: [],
      },
      stablecoins: {
        label: "Stablecoins",
        totalUsd: 0,
        changePct: null,
        allocationPct: 0,
        series: createEmptySeries(params.range, stablecoinsColor, now),
        holdings: [],
      },
    },
  };
}
