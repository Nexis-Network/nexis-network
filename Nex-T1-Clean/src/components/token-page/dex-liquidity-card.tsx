import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { UserPresenceAvatar } from "@/components/ui/user-presence-avatar";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/modules/prices/market-overview/formatters";
import type { DexPairSummary, DexTokenSummary } from "@/types/market";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS } from "./constants";

type DexLiquidityCardProps = {
  pairs: DexPairSummary[];
  source: string;
};

export function DexLiquidityCard({ pairs, source }: DexLiquidityCardProps) {
  const visiblePairs = pairs.slice(0, 6);
  const totalLiquidity = visiblePairs.reduce((acc, pair) => acc + (pair.liquidityUsd ?? 0), 0);
  const columnLayout = "grid w-full grid-cols-[1.05fr_1.25fr_0.9fr_0.85fr_0.75fr]";

  return (
    <section className={cn("space-y-3", TOKEN_PANEL_MAX_WIDTH_CLASS)}>
      <div className="flex flex-wrap items-center gap-3 text-foreground">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16px] text-muted-foreground">Dex liquidity</p>
          <h2 className="text-xl font-semibold leading-6">Active pairs</h2>
        </div>
        <span className="ml-auto rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.16px] text-muted-foreground/70">
          Source · {source}
        </span>
      </div>
      <Card className={cn(TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_MAX_WIDTH_CLASS, "text-foreground")}>
        <div className={cn(TOKEN_PANEL_INNER_CLASS, "rounded-[11px] bg-card")}>
          {visiblePairs.length ? (
            <div className="w-full overflow-x-auto">
              <div
                className={cn(
                  columnLayout,
                  "min-w-[800px] border-b border-border px-4 py-3 text-[12px] font-medium uppercase tracking-[0.16px] text-muted-foreground",
                )}
              >
                <span className="truncate">Exchange (dex/cex)</span>
                <span className="truncate">Liquidity pair</span>
                <span className="truncate">TVL / Liquidity (USD)</span>
                <span className="truncate">Vol. (24h)</span>
                <span className="truncate">Price (USD)</span>
              </div>
              {visiblePairs.map((pair) => (
                <div
                  key={pair.id}
                  className={cn(
                    columnLayout,
                    "min-w-[800px] items-center border-b border-border px-4 py-4 text-sm last:border-b-0",
                  )}
                >
                  <ExchangeCell pair={pair} />
                  <LiquidityPairCell pair={pair} />
                  <LiquidityCell pair={pair} totalLiquidity={totalLiquidity} />
                  <VolumeCell pair={pair} />
                  <PriceCell pair={pair} />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-sm text-muted-foreground">No live DEX pairs detected.</div>
          )}
        </div>
      </Card>
    </section>
  );
}

function ExchangeCell({ pair }: { pair: DexPairSummary }) {
  const label = pair.dexName ?? pair.dexId ?? pair.network ?? "DEX";
  const icon = getExchangeIcon(pair);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserPresenceAvatar icon={icon} name={label} size={28} className="border-border bg-muted/50" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[14px] font-normal leading-5 text-foreground">{label}</span>
        <span className="truncate text-[12px] leading-4 text-muted-foreground">{pair.network ?? "On-chain"}</span>
      </div>
    </div>
  );
}

function LiquidityPairCell({ pair }: { pair: DexPairSummary }) {
  const base = formatTokenSymbol(pair.baseToken);
  const quote = formatTokenSymbol(pair.quoteToken);
  const pairLabel = `${base}/${quote}`;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <TokenPairStack pair={pair} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[14px] font-normal leading-5 text-foreground">{pairLabel}</span>
        <span className="truncate text-[12px] text-muted-foreground">
          {pair.baseToken.name ?? base} · {pair.quoteToken.name ?? quote}
        </span>
      </div>
    </div>
  );
}

function LiquidityCell({ pair, totalLiquidity }: { pair: DexPairSummary; totalLiquidity: number }) {
  const liquidity = pair.liquidityUsd ?? 0;
  const dominance = totalLiquidity > 0 ? liquidity / totalLiquidity : null;

  return (
    <div className="flex min-w-0 flex-col text-left">
      <span className="text-[15px] font-normal leading-5 text-foreground">
        {formatCurrency(liquidity ?? null, { currency: "USD" })}
      </span>
      <span className="text-[12px] text-muted-foreground">
        {dominance != null && Number.isFinite(dominance)
          ? `${formatPercentage(dominance, { maximumFractionDigits: 1 })} · of tracked`
          : "Share unavailable"}
      </span>
    </div>
  );
}

function VolumeCell({ pair }: { pair: DexPairSummary }) {
  const volume = pair.volumeUsd24h ?? pair.volumeUsd6h ?? pair.volumeUsd1h ?? null;
  return (
    <div className="flex min-w-0 flex-col text-left">
      <span className="text-[15px] font-normal leading-5 text-foreground">
        {formatCurrency(volume, { currency: "USD", compact: true })}
      </span>
      <span className="text-[12px] text-muted-foreground">24h volume</span>
    </div>
  );
}

function PriceCell({ pair }: { pair: DexPairSummary }) {
  const delta = pair.priceChangePercent24h ?? null;
  const tone = delta == null ? "text-muted-foreground" : delta >= 0 ? "text-sky-400" : "text-destructive";
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col text-left">
        <span className="text-[15px] font-normal leading-5 text-foreground">
          {formatCurrency(pair.priceUsd ?? null, { currency: "USD" })}
        </span>
        <span className={cn("text-[12px]", tone)}>
          {formatPercentage(delta, { sign: true })}
        </span>
      </div>
      {pair.url ? (
        <Link
          href={pair.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          aria-label="Open liquidity pair"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function formatTokenSymbol(token: DexTokenSummary) {
  return token.symbol?.toUpperCase() ?? token.name?.toUpperCase() ?? "ASSET";
}

function TokenPairStack({ pair }: { pair: DexPairSummary }) {
  const tokens = [
    { token: pair.quoteToken, key: "quote", leftClass: "left-3", z: "z-0" as const },
    { token: pair.baseToken, key: "base", leftClass: "left-0", z: "z-10" as const },
  ];

  return (
    <div className="relative h-6 w-11">
      {tokens.map(({ token, key, leftClass, z }) => (
        <UserPresenceAvatar
          key={`${pair.id}-${key}-${token.symbol ?? token.name ?? "asset"}`}
          icon={getTokenIcon(token)}
          name={token.name ?? token.symbol ?? "Asset"}
          size={22}
          className={cn("absolute border-border bg-muted/50 shadow-sm", leftClass, z)}
        />
      ))}
    </div>
  );
}

function getTokenIcon(token: DexTokenSummary) {
  if (token.logoUrl) {
    return token.logoUrl;
  }
  const symbol = token.symbol ?? token.name ?? "";
  const normalized = symbol.toLowerCase();
  const cleaned = normalized.replace(/[^a-z0-9]/g, "");
  return TOKEN_ICON_MAP[normalized] ?? TOKEN_ICON_MAP[cleaned] ?? null;
}

function getExchangeIcon(pair: DexPairSummary) {
  const candidates = [pair.dexId, pair.dexName, pair.network]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  for (const candidate of candidates) {
    for (const [match, icon] of Object.entries(LOCAL_DEX_ICON_MAP)) {
      if (candidate.includes(match)) {
        return icon;
      }
    }
    for (const matcher of REMOTE_DEX_ICON_MATCHERS) {
      if (matcher.matches(candidate)) {
        return matcher.icon;
      }
    }
  }
  return null;
}

const LOCAL_DEX_ICON_MAP: Record<string, string> = {
  uniswap: "/icons/web3-icons/uniswap.svg",
  curve: "/icons/web3-icons/curve.svg",
  gmx: "/icons/web3-icons/gmx.svg",
  pendle: "/icons/web3-icons/pendle.svg",
  "1inch": "/icons/web3-icons/1inch.svg",
  opensea: "/icons/web3-icons/opensea.svg",
};

const REMOTE_DEX_ICON_MATCHERS: Array<{ matches: (value: string) => boolean; icon: string }> = [
  {
    matches: (value) => value.includes("pancake"),
    icon: "https://pancakeswap.finance/logo.png",
  },
  {
    matches: (value) => value.includes("raydium"),
    icon: "https://raydium.io/logo.png",
  },
  {
    matches: (value) => value.includes("jupiter") || value.includes("jupyter"),
    icon: "https://jup.ag/svg/jupiter-logo.png",
  },
  {
    matches: (value) => value.includes("sushi"),
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B3595068778DD592e39A122f4f5a5cF09C90fE2/logo.png",
  },
  {
    matches: (value) => value.includes("binance"),
    icon: "/icons/wallet-icons/binance.svg",
  },
  {
    matches: (value) => value.includes("pump"),
    icon: "https://pump.fun/logo.png",
  },
];

const TOKEN_ICON_MAP: Record<string, string> = {
  eth: LIQUID_GLASS_LOGOS.ethereum,
  weth: LIQUID_GLASS_LOGOS.ethereum,
  wnative: LIQUID_GLASS_LOGOS.ethereum,
  wbtc: "/icons/chain-icons/wbtc.svg",
  btc: LIQUID_GLASS_LOGOS.bitcoin,
  usdc: LIQUID_GLASS_LOGOS.usdc,
  usdt: LIQUID_GLASS_LOGOS.tether,
  dai: "/icons/chain-icons/dai.svg",
  sol: LIQUID_GLASS_LOGOS.solana,
  wsol: LIQUID_GLASS_LOGOS.solana,
  bnb: LIQUID_GLASS_LOGOS.bnb,
  wbnb: LIQUID_GLASS_LOGOS.bnb,
  busd: LIQUID_GLASS_LOGOS.bnb,
  cake: "/icons/chain-icons/cake.svg",
  matic: "/icons/chain-icons/polygon.svg",
  wmatic: "/icons/chain-icons/polygon.svg",
  avax: "/icons/chain-icons/avax.svg",
  wavax: "/icons/chain-icons/avalanche.svg",
  arb: "/icons/chain-icons/arbitrum.svg",
  op: "/icons/chain-icons/optimism.svg",
  base: "/icons/chain-icons/base.svg",
  link: LIQUID_GLASS_LOGOS.chainlink,
  ada: LIQUID_GLASS_LOGOS.cardano,
  doge: LIQUID_GLASS_LOGOS.doge,
  shib: "/icons/chain-icons/shibainu.svg",
};
