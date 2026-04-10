"use client";

import dynamic from "next/dynamic";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

// ─── Dynamic imports for heavy panel components (code-split) ────
const MarketMoversBar = dynamic(
  () =>
    import("@/components/defi/swap-panels/market-movers-bar").then(
      (m) => m.MarketMoversBar,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[44px] w-full animate-pulse bg-background" />
    ),
  },
);

const MarketOverviewPanel = dynamic(
  () =>
    import("@/components/defi/swap-panels/market-overview-panel").then(
      (m) => m.MarketOverviewPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] w-full animate-pulse rounded-xl border border-border bg-muted dark:bg-[#0F0F10]" />
    ),
  },
);

const TokenExchangePanel = dynamic(
  () =>
    import("@/components/defi/swap-panels/token-exchange-panel").then(
      (m) => m.TokenExchangePanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-xl border border-border bg-muted dark:bg-[#0F0F10]" />
    ),
  },
);

const PortfolioValuePanel = dynamic(
  () =>
    import("@/components/defi/swap-panels/portfolio-value-panel").then(
      (m) => m.PortfolioValuePanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full animate-pulse rounded-xl border border-border bg-muted dark:bg-[#0F0F10]" />
    ),
  },
);

const OrdersTradesSection = dynamic(
  () =>
    import("@/components/defi/swap-panels/orders-trades-section").then(
      (m) => m.OrdersTradesSection,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full animate-pulse rounded-xl border border-border bg-muted dark:bg-[#0F0F10]" />
    ),
  },
);

/**
 * /defi/swap page layout:
 *
 * Desktop (lg+):
 * ┌──────────────────────────────────────────────────────────┐
 * │  Market Movers Ticker Bar (full width)                   │
 * ├──────────────────────────┬───────────────────────────────┤
 * │                          │  Token Exchange               │
 * │  Market Overview Chart   │  (Swap Widget only)           │
 * │  (2/3 width)             ├───────────────────────────────┤
 * ├──────────────────────────┤  Portfolio Value              │
 * │  [Active Orders |        │  (380px, resized)             │
 * │   Recent Trades |        │                               │
 * │   Asset Performance]     │                               │
 * │  (full chart width, tabs)│                               │
 * └──────────────────────────┴───────────────────────────────┘
 *
 * Mobile / Tablet (< lg):
 * ┌──────────────────────────┐
 * │  Market Movers Ticker    │
 * ├──────────────────────────┤
 * │  Token Exchange (swap)   │  ← promoted to top
 * ├──────────────────────────┤
 * │  Market Overview Chart   │
 * ├──────────────────────────┤
 * │  Portfolio Value          │
 * ├──────────────────────────┤
 * │  Orders / Trades / Perf  │
 * └──────────────────────────┘
 */
export default function SwapPageClient() {
  return (
    <SettingsSurfaceShell
      width="wide"
      className="h-full"
      includeFooterSpacer={false}
      topSlot={<MarketMoversBar />}
    >
      <div className="flex w-full flex-1 flex-col gap-3 pb-4 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3">
          {/* Left column: Chart + tabbed section (appears second on mobile via order) */}
          <div className="order-2 lg:order-1 flex flex-col gap-3">
            <MarketOverviewPanel />
            <OrdersTradesSection />
          </div>

          {/* Right column: Swap widget + Portfolio value (appears first on mobile) */}
          <div className="order-1 lg:order-2 flex flex-col gap-3">
            <TokenExchangePanel />
            <PortfolioValuePanel />
          </div>
        </div>
      </div>
    </SettingsSurfaceShell>
  );
}
