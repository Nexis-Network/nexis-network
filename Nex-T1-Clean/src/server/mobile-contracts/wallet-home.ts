import "server-only";

import type { AggregatedPortfolio } from "@/server/services/portfolio-service";

type WalletHomeTimeframe = "1D" | "1W" | "1M" | "6M" | "1Y";

type WalletHomeRequest = {
  evmAddress?: string | null;
  solanaAddress?: string | null;
  weeklyDepositUsd?: number;
  ytdReturnHintPercent?: number;
  targetYear?: number;
  timeframe?: WalletHomeTimeframe;
};

const STABLECOIN_SYMBOLS = new Set(["USDC", "USDT", "DAI", "USDE", "FDUSD", "PYUSD"]);
const TIMEFRAME_TO_MS: Record<WalletHomeTimeframe, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "6M": 180 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function resolveTimeframe(value: unknown): WalletHomeTimeframe {
  return value === "1D" ||
    value === "1W" ||
    value === "1M" ||
    value === "6M" ||
    value === "1Y"
    ? value
    : "1D";
}

function resolveChainLabel(params: {
  namespace: string;
  chainId: unknown;
}): string {
  if (params.namespace === "solana") {
    return "solana";
  }

  const chainId = typeof params.chainId === "number" ? params.chainId : Number(params.chainId);
  if (chainId === 8453) return "base";
  if (chainId === 1) return "eth";
  if (chainId === 42161) return "arbitrum";
  if (chainId === 10) return "optimism";
  return "evm";
}

function buildProjection(params: {
  principalUsd: number;
  weeklyDepositUsd: number;
  ytdReturnPercent: number;
  targetYear: number;
}) {
  const startYear = new Date().getUTCFullYear();
  const targetYear = Math.max(startYear + 1, params.targetYear);
  const annualRate = params.ytdReturnPercent / 100;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const monthlyContribution = params.weeklyDepositUsd * (52 / 12);
  const totalMonths = (targetYear - startYear) * 12;
  const totalBars = 52;

  const bars = Array.from({ length: totalBars }, (_, index) => {
    const t = index / (totalBars - 1);
    const monthCount = Math.round(totalMonths * t);
    const growth = Math.pow(1 + monthlyRate, monthCount);
    const contribution =
      Math.abs(monthlyRate) < 1e-6
        ? monthlyContribution * monthCount
        : monthlyContribution * ((growth - 1) / monthlyRate);

    return {
      index,
      year: Math.round(startYear + (targetYear - startYear) * t),
      valueUsd: round(Math.max(0, params.principalUsd * growth + contribution)),
    };
  });

  return {
    startYear,
    targetYear,
    bars,
    milestones: [
      { label: "TODAY", index: 0, year: startYear },
      { label: String(Math.min(startYear + 9, targetYear)), index: 16, year: Math.min(startYear + 9, targetYear) },
      { label: String(Math.min(startYear + 19, targetYear)), index: 34, year: Math.min(startYear + 19, targetYear) },
      { label: String(targetYear), index: totalBars - 1, year: targetYear },
    ],
  };
}

export function buildWalletHomeAggregate(params: {
  portfolio: AggregatedPortfolio;
  request: WalletHomeRequest;
}) {
  const timeframe = resolveTimeframe(params.request.timeframe);
  const weeklyDepositUsd = round(toNumber(params.request.weeklyDepositUsd, 500));
  const ytdReturnPercent = round(toNumber(params.request.ytdReturnHintPercent, 10));
  const targetYear = Math.round(toNumber(params.request.targetYear, 2055));

  const selectedWallets = params.portfolio.wallets.filter((wallet) => {
    if (wallet.namespace === "evm" && params.request.evmAddress) {
      return wallet.address.toLowerCase() === params.request.evmAddress.toLowerCase();
    }
    if (wallet.namespace === "solana" && params.request.solanaAddress) {
      return wallet.address === params.request.solanaAddress;
    }
    return !params.request.evmAddress && !params.request.solanaAddress;
  });

  const effectiveWallets =
    selectedWallets.length > 0 ? selectedWallets : params.portfolio.wallets;

  const portfolioAssets = effectiveWallets
    .flatMap((wallet) =>
      wallet.tokens.map((token) => {
        const symbol =
          typeof token.symbol === "string" && token.symbol.trim().length > 0
            ? token.symbol.trim()
            : "TOKEN";
        const isStablecoin = STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
        const chainId =
          typeof wallet.metadata?.chainId === "number" || typeof wallet.metadata?.chainId === "string"
            ? wallet.metadata.chainId
            : wallet.namespace === "solana"
              ? "solana"
              : null;

        return {
          id: token.id,
          chain: resolveChainLabel({
            namespace: wallet.namespace,
            chainId,
          }),
          chainId,
          chainType: wallet.namespace === "solana" ? "solana" : "evm",
          assetType: "token" as const,
          bucket: isStablecoin ? "cash" as const : "investments" as const,
          isStablecoin,
          tokenAddress: token.address,
          symbol,
          name: token.name,
          logoUrl: token.logoUrl ?? null,
          coingeckoId: null,
          decimals:
            typeof token.decimals === "number" && Number.isFinite(token.decimals)
              ? token.decimals
              : null,
          balanceRaw: token.balance,
          balance: round(toNumber(token.balanceFormatted, 0), 8),
          balanceUsd: round(toNumber(token.valueUsd, 0)),
          priceUsd:
            typeof token.priceUsd === "number" && Number.isFinite(token.priceUsd)
              ? round(token.priceUsd, 6)
              : null,
          priceChange24hPercent:
            typeof token.change24hPercent === "number" &&
            Number.isFinite(token.change24hPercent)
              ? round(token.change24hPercent, 4)
              : null,
          change24hUsd: null,
        };
      }),
    )
    .sort((left, right) => right.balanceUsd - left.balanceUsd);

  const assets = portfolioAssets.map((asset) => ({
    chain: asset.chain,
    chainId: asset.chainId,
    chainType: asset.chainType,
    tokenAddress: asset.tokenAddress,
    symbol: asset.symbol,
    name: asset.name,
    logoUrl: asset.logoUrl,
    coingeckoId: asset.coingeckoId,
    decimals: asset.decimals,
    balanceRaw: asset.balanceRaw,
    balance: asset.balance,
    balanceUsd: asset.balanceUsd,
    priceUsd: asset.priceUsd,
    priceChange24hPercent: asset.priceChange24hPercent,
  }));

  const cashAssets = portfolioAssets.filter((asset) => asset.bucket === "cash");
  const investmentAssets = portfolioAssets.filter((asset) => asset.bucket === "investments");

  const evmNetWorthUsd = round(
    effectiveWallets
      .filter((wallet) => wallet.namespace !== "solana")
      .reduce((sum, wallet) => sum + toNumber(wallet.netWorthUsd, 0), 0),
  );
  const solanaNetWorthUsd = round(
    effectiveWallets
      .filter((wallet) => wallet.namespace === "solana")
      .reduce((sum, wallet) => sum + toNumber(wallet.netWorthUsd, 0), 0),
  );
  const netWorthUsd = round(evmNetWorthUsd + solanaNetWorthUsd);

  const now = Date.now();
  const windowMs = TIMEFRAME_TO_MS[timeframe];
  const timelinePoints = Array.from({ length: 52 }, (_, index) => {
    const progress = index / 51;
    return {
      timestamp: new Date(now - windowMs + windowMs * progress).toISOString(),
      evmNetWorthUsd,
      solanaNetWorthUsd,
      totalNetWorthUsd: netWorthUsd,
    };
  });

  return {
    fetchedAt: params.portfolio.lastRefreshed,
    wallets: {
      evmAddress:
        params.request.evmAddress ??
        effectiveWallets.find((wallet) => wallet.namespace !== "solana")?.address ??
        null,
      solanaAddress:
        params.request.solanaAddress ??
        effectiveWallets.find((wallet) => wallet.namespace === "solana")?.address ??
        null,
    },
    netWorthUsd,
    autonomousIndexUsd: Math.max(125_000, round(Math.max(netWorthUsd * 0.1, 0), 0)),
    weeklyDepositUsd,
    ytdReturnPercent,
    externalAccountsCount: effectiveWallets.length,
    walletNetWorthUsd: {
      evm: evmNetWorthUsd,
      solana: solanaNetWorthUsd,
      total: netWorthUsd,
    },
    timeline: {
      timeframe,
      from: timelinePoints[0]?.timestamp ?? new Date(now - windowMs).toISOString(),
      to: timelinePoints[timelinePoints.length - 1]?.timestamp ?? new Date(now).toISOString(),
      points: timelinePoints,
      walletTypeSeries: {
        evm: timelinePoints.map((point) => ({
          timestamp: point.timestamp,
          valueUsd: evmNetWorthUsd,
        })),
        solana: timelinePoints.map((point) => ({
          timestamp: point.timestamp,
          valueUsd: solanaNetWorthUsd,
        })),
      },
    },
    projection: buildProjection({
      principalUsd: netWorthUsd,
      weeklyDepositUsd,
      ytdReturnPercent,
      targetYear,
    }),
    assets,
    portfolioAssets,
    portfolioBreakdown: {
      cash: {
        balanceUsd: round(cashAssets.reduce((sum, asset) => sum + asset.balanceUsd, 0)),
        assetCount: cashAssets.length,
        primaryAsset: cashAssets[0] ?? null,
        otherAssets: cashAssets.slice(1),
        assets: cashAssets,
      },
      investments: {
        balanceUsd: round(investmentAssets.reduce((sum, asset) => sum + asset.balanceUsd, 0)),
        assetCount: investmentAssets.length,
        tokenAssets: investmentAssets,
        nfts: [],
      },
    },
    sources: {
      moralis: effectiveWallets.length > 0,
      coingecko: false,
    },
  };
}
