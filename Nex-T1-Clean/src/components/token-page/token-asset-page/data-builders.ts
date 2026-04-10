import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime } from "@/modules/prices/market-overview/formatters";
import type { AssetSnapshot, PriceMovementEntry, TokenTheme } from "@/types/token-page";
import type { FundamentalsField } from "../fundamentals-card";
import type { MetricMatrix } from "../metrics-grid";

export type PriceSummary = ReturnType<typeof buildPriceSummary>;

export function buildPriceSummary(snapshot: AssetSnapshot | null) {
  if (!snapshot) {
    return null;
  }
  if (snapshot.kind === "token") {
    const price = snapshot.marketData.priceUsd ?? null;
    const percent = snapshot.marketData.priceChangePercent24h ?? null;
    const absolute = price != null && percent != null ? (price * percent) / 100 : null;
    const lastUpdated = snapshot.marketData.lastUpdated ?? null;
    const secondaryLabel = `24h volume ${formatCurrency(snapshot.marketData.totalVolumeUsd, { currency: "USD", compact: true })}`;
    return {
      price,
      percent,
      absolute,
      periodLabel: "24H",
      lastUpdated,
      secondaryLabel,
      baseCurrency: "USD",
    };
  }

  const price = snapshot.floorPriceUsd ?? snapshot.floorPriceNative ?? null;
  return {
    price,
    percent: null,
    absolute: null,
    periodLabel: "floor",
    lastUpdated: snapshot.lastUpdated ?? null,
    secondaryLabel: snapshot.floorPriceUsd
      ? `USD floor ${formatCurrency(snapshot.floorPriceUsd, { currency: "USD" })}`
      : "Floor price snapshot",
    baseCurrency: snapshot.floorPriceUsd ? "USD" : snapshot.blockchains[0] ?? "NATIVE",
  };
}

function formatSupplyDisplay(value: number | null | undefined, symbol: string) {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }

  const useCompact = value >= 1_000_000;
  const formatted = formatNumber(value, {
    compact: useCompact,
    maximumFractionDigits: 2,
    minimumFractionDigits: useCompact ? 2 : undefined,
  });

  return `${formatted} ${symbol.toUpperCase()}`;
}

export function buildMetricsMatrix(snapshot: AssetSnapshot | null): MetricMatrix {
  if (!snapshot) return [];
  if (snapshot.kind === "token") {
    return [
      [
        {
          label: "Market Cap",
          value: formatCurrency(snapshot.marketData.marketCapUsd, { currency: "USD", compact: true }),
        },
        {
          label: "FDV",
          value: formatCurrency(snapshot.marketData.fullyDilutedValuationUsd, { currency: "USD", compact: true }),
        },
        {
          label: "Rank",
          value: snapshot.rank != null ? `#${snapshot.rank}` : "--",
        },
      ],
      [
        {
          label: "Circulating",
          value: formatSupplyDisplay(snapshot.marketData.circulatingSupply, snapshot.symbol),
        },
        {
          label: "Total Supply",
          value: formatSupplyDisplay(snapshot.marketData.totalSupply, snapshot.symbol),
        },
        {
          label: "Max Supply",
          value: formatSupplyDisplay(snapshot.marketData.maxSupply, snapshot.symbol),
        },
      ],
      [
        {
          label: "24h Volume",
          value: formatCurrency(snapshot.marketData.totalVolumeUsd, { currency: "USD", compact: true }),
        },
        {
          label: "Day Range",
          value:
            snapshot.marketData.low24hUsd != null && snapshot.marketData.high24hUsd != null
              ? `${formatCurrency(snapshot.marketData.low24hUsd, { currency: "USD" })} – ${formatCurrency(snapshot.marketData.high24hUsd, { currency: "USD" })}`
              : "--",
        },
        {
          label: "TVL",
          value: formatCurrency(snapshot.messariMetrics?.tvlUsd ?? snapshot.defiLlama?.tvlUsd, {
            currency: "USD",
            compact: true,
          }),
        },
      ],
    ];
  }

  return [
    [
      {
        label: "Floor Price",
        value: snapshot.floorPriceUsd != null
          ? formatCurrency(snapshot.floorPriceUsd, { currency: "USD" })
          : snapshot.floorPriceNative != null
            ? formatNumber(snapshot.floorPriceNative)
            : "--",
      },
      {
        label: "Market Cap",
        value: formatCurrency(snapshot.marketCapUsd, { currency: "USD", compact: true }),
      },
      {
        label: "24h Volume",
        value: formatCurrency(snapshot.volume24hUsd, { currency: "USD", compact: true }),
      },
    ],
    [
      {
        label: "24h Sales",
        value: snapshot.oneDaySales != null ? formatNumber(snapshot.oneDaySales) : "--",
      },
      {
        label: "Avg Sale",
        value: snapshot.oneDayAveragePriceUsd != null
          ? formatCurrency(snapshot.oneDayAveragePriceUsd, { currency: "USD" })
          : "--",
      },
      {
        label: "Owners",
        value: snapshot.ownersCount != null ? formatNumber(snapshot.ownersCount) : "--",
      },
    ],
    [
      {
        label: "Total Items",
        value: snapshot.numberOfTokens != null ? formatNumber(snapshot.numberOfTokens) : "--",
      },
      {
        label: "Contract",
        value: snapshot.contractAddress ?? "--",
      },
      {
        label: "Last Updated",
        value: snapshot.lastUpdated ? formatRelativeTime(snapshot.lastUpdated) : "--",
      },
    ],
  ];
}

export function buildTimelineEntries(snapshot: AssetSnapshot | null): PriceMovementEntry[] {
  if (!snapshot || snapshot.kind !== "token") {
    return [];
  }
  const entries: PriceMovementEntry[] = [];
  const nowLabel = snapshot.marketData.lastUpdated ?? new Date().toISOString();
  const price = snapshot.marketData.priceUsd ?? null;
  const volume = snapshot.marketData.totalVolumeUsd ?? snapshot.messariMetrics?.volume24hUsd ?? null;

  entries.push({
    id: "today",
    title: "Today",
    price,
    deltaPercent: snapshot.marketData.priceChangePercent24h ?? null,
    timestamp: nowLabel,
    relativeTime: formatRelativeTime(nowLabel),
    narrative: buildNarrative({
      price,
      deltaPercent: snapshot.marketData.priceChangePercent24h ?? null,
      volume,
      context: "24h",
      transactions: snapshot.messariMetrics?.transactions24h,
    }),
    tags: ["spot", volume ? "flow" : ""].filter(Boolean),
  });

  if (snapshot.marketData.priceChangePercent7d != null) {
    entries.push({
      id: "week",
      title: "7D",
      price,
      deltaPercent: snapshot.marketData.priceChangePercent7d,
      timestamp: nowLabel,
      relativeTime: "Past week",
      narrative: buildNarrative({
        price,
        deltaPercent: snapshot.marketData.priceChangePercent7d,
        tvl: snapshot.messariMetrics?.tvlUsd ?? snapshot.defiLlama?.tvlUsd,
        context: "7d",
      }),
      tags: [snapshot.defiLlama?.tvlUsd ? "tvl" : ""].filter(Boolean),
    });
  }

  if (snapshot.marketData.priceChangePercent30d != null) {
    entries.push({
      id: "month",
      title: "30D",
      price,
      deltaPercent: snapshot.marketData.priceChangePercent30d,
      timestamp: nowLabel,
      relativeTime: "Past month",
      narrative: buildNarrative({
        price,
        deltaPercent: snapshot.marketData.priceChangePercent30d,
        context: "30d",
        supplyGap: snapshot.marketData.maxSupply && snapshot.marketData.circulatingSupply
          ? snapshot.marketData.maxSupply - snapshot.marketData.circulatingSupply
          : null,
      }),
      tags: ["macro"],
    });
  }

  return entries;
}

function buildNarrative(params: {
  price: number | null;
  deltaPercent: number | null;
  volume?: number | null;
  transactions?: number | null;
  tvl?: number | null;
  context: string;
  supplyGap?: number | null;
}) {
  const { price, deltaPercent, volume, transactions, tvl, context, supplyGap } = params;
  const direction = deltaPercent != null ? (deltaPercent >= 0 ? "rose" : "slipped") : "traded";
  const priceLabel = price != null ? formatCurrency(price, { currency: "USD" }) : "--";
  const changeLabel = deltaPercent != null ? formatPercentage(deltaPercent, { sign: true }) : "flat";

  const parts: string[] = [`${context} move ${direction} to ${priceLabel} (${changeLabel}).`];
  if (volume != null) {
    parts.push(`Spot volume ~${formatCurrency(volume, { currency: "USD", compact: true })}.`);
  }
  if (transactions != null) {
    parts.push(`${formatNumber(transactions)} on-chain txns/24h.`);
  }
  if (tvl != null) {
    parts.push(`DeFi TVL ${formatCurrency(tvl, { currency: "USD", compact: true })}.`);
  }
  if (supplyGap != null && Number.isFinite(supplyGap) && supplyGap > 0) {
    parts.push(`~${formatNumber(supplyGap)} tokens locked, potential unlock supply.`);
  }
  return parts.join(" ");
}

export function buildKeyThemes(snapshot: AssetSnapshot | null): TokenTheme[] {
  if (!snapshot || snapshot.kind !== "token") {
    return [];
  }

  const themes: TokenTheme[] = [];
  const tvlLabel = snapshot.messariMetrics?.tvlUsd ?? snapshot.defiLlama?.tvlUsd;
  const volumeLabel = snapshot.marketData.totalVolumeUsd ?? snapshot.messariMetrics?.volume24hUsd;
  const supplyLabel = snapshot.marketData.maxSupply && snapshot.marketData.circulatingSupply
    ? snapshot.marketData.maxSupply - snapshot.marketData.circulatingSupply
    : null;

  themes.push({
    id: "liquidity",
    title: "Liquidity depth",
    bullish: {
      summary: tvlLabel
        ? `Protocols secured ${formatCurrency(tvlLabel, { currency: "USD", compact: true })} in TVL, supporting leverage.`
        : "Dex pools retain sufficient liquidity across majors.",
      sources: ["DeFiLlama", "Messari"],
    },
    bearish: {
      summary:
        volumeLabel && volumeLabel < 10_000_000
          ? `24h volume only ${formatCurrency(volumeLabel, { currency: "USD", compact: true })}, so slippage risk remains elevated.`
          : "Liquidity concentrates in a handful of pools and could unwind quickly if incentives drop.",
      sources: ["CoinGecko", "Dexscreener"],
    },
  });

  themes.push({
    id: "supply",
    title: "Supply schedule",
    bullish: {
      summary:
        supplyLabel != null && supplyLabel <= 0
          ? "No additional supply unlocks expected; emissions fully live."
          : "Unlock cadence remains predictable with gradual dilution only.",
      sources: ["CoinGecko"],
    },
    bearish: {
      summary:
        supplyLabel != null && supplyLabel > 0
          ? `${formatNumber(supplyLabel)} tokens remain off-market and could pressure price on release.`
          : "Incomplete disclosures on unlock schedule leave dilution risks uncertain.",
      sources: ["CoinGecko"],
    },
  });

  themes.push({
    id: "adoption",
    title: "Network adoption",
    bullish: {
      summary:
        snapshot.messariMetrics?.transactions24h
          ? `${formatNumber(snapshot.messariMetrics.transactions24h)} daily txns signal active user flow.`
          : "Stable usage coupled with consistent developer activity supports revenue stickiness.",
      sources: ["Messari"],
    },
    bearish: {
      summary:
        snapshot.messariMetrics?.transactions24h
          ? `Throughput plateaued near ${formatNumber(snapshot.messariMetrics.transactions24h)} tx/day; catalysts needed to re-accelerate adoption.`
          : "Sparse telemetry makes it hard to validate organic demand beyond price action.",
      sources: ["Messari"],
    },
  });

  return themes;
}

export function buildFundamentalsFields(snapshot: AssetSnapshot | null): { fields: FundamentalsField[]; description: string } {
  if (!snapshot) {
    return { fields: [], description: "" };
  }

  if (snapshot.kind === "token") {
    const networks = snapshot.networks.slice(0, 3).map((network) => {
      const address = network.contractAddress ? shortenHash(network.contractAddress) : "native";
      return `${network.chain}${address ? ` · ${address}` : ""}`;
    });
    const contractNetworks = snapshot.networks
      .filter((network) => Boolean(network.contractAddress))
      .map((network) => ({ chain: network.chain, address: network.contractAddress ?? null }));

    const description = sanitizeDescription(snapshot.description ?? "");
    const sentimentPercent = snapshot.sentiment?.upPercent ?? null;
    const sentimentTone: FundamentalsField["tone"] =
      sentimentPercent == null
        ? undefined
        : sentimentPercent >= 0.55
          ? "positive"
          : sentimentPercent <= 0.45
            ? "negative"
            : "default";

    return {
      fields: [
        { label: "Symbol", value: snapshot.symbol.toUpperCase() },
        { label: "Category", value: snapshot.categories[0] ?? "--" },
        { label: "Primary Chain", value: networks[0] ?? "--" },
        {
          label: "Smart Contract",
          value: snapshot.networks[0]?.contractAddress ?? "--",
          align: "start",
          isMono: Boolean(snapshot.networks[0]?.contractAddress),
          contracts: contractNetworks,
        },
        { label: "Launch", value: snapshot.genesisDate ?? "--" },
        {
          label: "Sentiment",
          value:
            sentimentPercent != null
              ? `${formatPercentage(sentimentPercent, { maximumFractionDigits: 0 })} ▲`
              : "--",
          tone: sentimentTone,
        },
      ],
      description,
    };
  }

  return {
    fields: [
      { label: "Symbol", value: snapshot.symbol },
      { label: "Primary Chain", value: snapshot.blockchains[0] ?? "--" },
      {
        label: "Contract",
        value: snapshot.contractAddress ?? "--",
        align: "start",
        isMono: Boolean(snapshot.contractAddress),
        contracts: snapshot.contractAddress
          ? [
            {
              chain: snapshot.blockchains[0] ?? "Primary",
              address: snapshot.contractAddress,
            },
          ]
          : undefined,
      },
      { label: "Items", value: snapshot.numberOfTokens != null ? formatNumber(snapshot.numberOfTokens) : "--" },
      { label: "Owners", value: snapshot.ownersCount != null ? formatNumber(snapshot.ownersCount) : "--" },
    ],
    description: sanitizeDescription(snapshot.description ?? ""),
  };
}

function sanitizeDescription(value: string) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, "").slice(0, 420);
}

function shortenHash(value?: string | null) {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatDexSource(source: string) {
  switch (source) {
    case "dexscreener":
      return "DexScreener";
    case "dextools":
      return "DexTools";
    case "moralis":
      return "Moralis";
    case "mixed":
      return "DexTools + DexScreener";
    default:
      return "Dex feeds";
  }
}

export function tokenPageErrorMessage(error: UntypedJson) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected error";
  }
}
