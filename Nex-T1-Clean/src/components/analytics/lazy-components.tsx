"use client";

import dynamic from "next/dynamic";

const DrawerFallback = () => (
  <div className="h-64 w-full animate-pulse rounded-2xl border border-border/40 bg-muted/30" />
);

const SparklineFallback = () => (
  <div className="h-12 w-full animate-pulse rounded bg-muted/40" />
);

export const Sparkline = dynamic(() => import("@/components/market-overview/sparkline").then((mod) => ({
  default: mod.Sparkline,
})), {
  ssr: false,
  loading: SparklineFallback,
});

export const CoinDrawer = dynamic(() => import("@/components/market-overview/coin-drawer").then((mod) => ({
  default: mod.CoinDrawer,
})), {
  ssr: false,
  loading: () => <DrawerFallback />,
});

export const NftDrawer = dynamic(() => import("@/components/market-overview/nft-drawer").then((mod) => ({
  default: mod.NftDrawer,
})), {
  ssr: false,
  loading: () => <DrawerFallback />,
});

export const PoolDrawer = dynamic(() => import("@/components/market-overview/pool-drawer").then((mod) => ({
  default: mod.PoolDrawer,
})), {
  ssr: false,
  loading: () => <DrawerFallback />,
});
