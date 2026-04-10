import { AgentListItem, type AgentListingType } from "@/lib/agents/types";

// Helper for consistent dates
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

type AgentScenario = {
  name: string;
  description: string;
  category: string;
  price: string;
  pnl: number;
  winRate: number;
  volume: number;
  colors: [string, string];
  type: AgentListingType | "subscription";
};

// Realistic Agent Scenarios
const AGENT_SCENARIOS: AgentScenario[] = [
  {
    name: "Sentiment Sentinel",
    description:
      "AI-driven social sentiment analyzer that predicts memecoin volatility by monitoring Twitter/X and Reddit firehoses in real-time.",
    category: "Analysis",
    price: "0.5",
    pnl: 125000,
    winRate: 68.5,
    volume: 4500000,
    colors: ["#ec4899", "#8b5cf6"],
    type: "sale",
  },
  {
    name: "Quantum Arbiter",
    description:
      "High-frequency arbitrage bot identifying price discrepancies across 14 EVM chains. Zero-risk execution with flash loan integration.",
    category: "Arbitrage",
    price: "2.5",
    pnl: 850000,
    winRate: 98.2,
    volume: 12500000,
    colors: ["#3b82f6", "#06b6d4"],
    type: "rent",
  },
  {
    name: "Yield Harvester Pro",
    description:
      "Automated liquidity provision manager for Uniswap V3. Optimizes tick ranges to maximize fees while minimizing impermanent loss.",
    category: "Yield Farming",
    price: "0.8",
    pnl: 45000,
    winRate: 75.0,
    volume: 1200000,
    colors: ["#10b981", "#34d399"],
    type: "usage",
  },
  {
    name: "Nexus Governance",
    description:
      "Delegated voting assistant that analyzes DAO proposals and votes based on your pre-configured alignment settings (Profit, ESG, Decentralization).",
    category: "Governance",
    price: "0.1",
    pnl: 0,
    winRate: 100,
    volume: 5000,
    colors: ["#6366f1", "#818cf8"],
    type: "sale",
  },
  {
    name: "MEV Shield",
    description:
      "Private transaction executor that routes your orders through private mempools to protect against front-running and sandwich attacks.",
    category: "Security",
    price: "0.25",
    pnl: 15000,
    winRate: 99.9,
    volume: 800000,
    colors: ["#ef4444", "#f87171"],
    type: "usage",
  },
  {
    name: "StableGuard",
    description:
      "Peg-stability monitor that instantly swaps out of stablecoins showing signs of de-pegging based on on-chain liquidity depth analysis.",
    category: "Risk Management",
    price: "1.0",
    pnl: 250000,
    winRate: 100,
    volume: 25000000,
    colors: ["#64748b", "#94a3b8"],
    type: "rent",
  },
  {
    name: "Whale Watcher X",
    description:
      "Copies trades from a curated list of top-performing wallet addresses with customizable filters for token cap and liquidity.",
    category: "Copy Trading",
    price: "1.5",
    pnl: 320000,
    winRate: 62.4,
    volume: 6500000,
    colors: ["#f59e0b", "#fbbf24"],
    type: "sale",
  },
  {
    name: "Sniper OMNI",
    description:
      "Multi-chain token sniper that detects and buys new liquidity pairs within the first block. Includes honeypot detection simulation.",
    category: "Trading",
    price: "5.0",
    pnl: 650000,
    winRate: 45.8,
    volume: 3200000,
    colors: ["#d946ef", "#f0abfc"],
    type: "sale",
  },
  {
    name: "L2 Bridge Optimizer",
    description:
      "Automatically moves assets between Layer 2 networks to farm bridge incentives and find the lowest fees for cross-chain swaps.",
    category: "Utility",
    price: "0.05",
    pnl: 12000,
    winRate: 88.5,
    volume: 450000,
    colors: ["#8b5cf6", "#a78bfa"],
    type: "rent",
  },
  {
    name: "Macro Trend Spy",
    description:
      "Trades based on macroeconomic news events (CPI, FOMC) by parsing news feeds and executing long/short positions instantly.",
    category: "Analysis",
    price: "1.2",
    pnl: 180000,
    winRate: 58.2,
    volume: 1500000,
    colors: ["#14b8a6", "#2dd4bf"],
    type: "usage",
  },
  {
    name: "Delta Neutral Farmer",
    description:
      "Executes delta-neutral strategies by longing spot and shorting perps to harvest funding rates without exposure to price movements.",
    category: "Yield Farming",
    price: "1.8",
    pnl: 95000,
    winRate: 95.0,
    volume: 2100000,
    colors: ["#84cc16", "#a3e635"],
    type: "rent",
  },
  {
    name: "NFT Floor Sweeper",
    description:
      "Algorithms to sweep NFT floors when they dip below calculated fair value based on rarity and historical sales data.",
    category: "NFT",
    price: "0.6",
    pnl: 45000,
    winRate: 52.3,
    volume: 800000,
    colors: ["#f43f5e", "#fb7185"],
    type: "sale",
  },
  {
    name: "Grid Master Classic",
    description:
      "Classic grid trading bot authorized for highly volatile sideways markets. Automatically buy low and sell high within set ranges.",
    category: "Trading",
    price: "0.1",
    pnl: 25000,
    winRate: 72.1,
    volume: 600000,
    colors: ["#0ea5e9", "#7dd3fc"],
    type: "sale",
  },
  {
    name: "Perp Hedger",
    description:
      "Automatically hedges your portfolio tailored to your specific holdings. dynamicaly adjusts hedge ratio based on market volatility.",
    category: "Risk Management",
    price: "0.75",
    pnl: 0, // Hedging implies protecting value, not necessarily profit
    winRate: 92.0,
    volume: 1500000,
    colors: ["#6b7280", "#9ca3af"],
    type: "usage",
  },
  {
    name: "Blue Chip Accumulator",
    description:
      "DCA agent specifically tuned for blue-chip assets. Buys more during dips (RSI < 30) and less during peaks.",
    category: "Investing",
    price: "0.0", // Free tool
    pnl: 150000,
    winRate: 100.0, // Long term
    volume: 5000000,
    colors: ["#3b82f6", "#60a5fa"],
    type: "sale",
  },
  {
    name: "Impermanent Loss Guard",
    description:
      "Monitors LP positions and withdraws liquidity if IL exceeds earned fees, protecting your principal.",
    category: "Yield Farming",
    price: "0.4",
    pnl: 10000,
    winRate: 85.4,
    volume: 300000,
    colors: ["#ef4444", "#fca5a5"],
    type: "rent",
  },
  {
    name: "Rarity Sniper",
    description:
      "Scans mempools for NFT reveals to snipe rare traits before they list on OpenSea.",
    category: "NFT",
    price: "1.2",
    pnl: 65000,
    winRate: 35.0,
    volume: 120000,
    colors: ["#a855f7", "#c084fc"],
    type: "sale",
  },
  {
    name: "Metaverse Appraiser",
    description:
      "Estimates the value of virtual land in Sandbox and Decentraland using neighbor pricing and location heatmaps.",
    category: "NFT",
    price: "0.3",
    pnl: 12000,
    winRate: 60.0,
    volume: 150000,
    colors: ["#ec4899", "#f472b6"],
    type: "sale",
  },
  {
    name: "Gaming Token Indexer",
    description:
      "Maintains a balanced index of top 10 gaming tokens, rebalancing weekly based on active player counts.",
    category: "Investing",
    price: "0.5",
    pnl: 45000,
    winRate: 55.5,
    volume: 750000,
    colors: ["#10b981", "#6ee7b7"],
    type: "usage",
  },
  {
    name: "Volatility Harvester",
    description:
      "Uses options vaults to harvest volatility premium during sideways markets on ETH and BTC.",
    category: "Yield Farming",
    price: "2.0",
    pnl: 110000,
    winRate: 82.3,
    volume: 2500000,
    colors: ["#f97316", "#fdba74"],
    type: "rent",
  },
  {
    name: "Funding Rate Arb",
    description:
      "Captures the spread between spot and perpetual futures prices when funding rates are extremely positive or negative.",
    category: "Arbitrage",
    price: "1.5",
    pnl: 75000,
    winRate: 94.0,
    volume: 3500000,
    colors: ["#6366f1", "#a5b4fc"],
    type: "sale",
  },
  {
    name: "Renko Chart Bot",
    description:
      "Trading bot based on Renko bricks, filtering out market noise and trading only on significant price movements.",
    category: "Trading",
    price: "0.33",
    pnl: 22000,
    winRate: 61.2,
    volume: 450000,
    colors: ["#06b6d4", "#67e8f9"],
    type: "rent",
  },
  {
    name: "VWAP Executor",
    description:
      "Large order execution algorithm that minimizes price impact by trading closely to the Volume Weighted Average Price.",
    category: "Execution",
    price: "5.0",
    pnl: 5000, // Cost saving rather than PnL
    winRate: 99.0,
    volume: 55000000,
    colors: ["#1e293b", "#475569"],
    type: "usage",
  },
  {
    name: "TWAP Executor",
    description:
      "Time Weighted Average Price execution for gradual position building or unwinding over set timeframes.",
    category: "Execution",
    price: "3.5",
    pnl: 4000,
    winRate: 99.0,
    volume: 40000000,
    colors: ["#334155", "#64748b"],
    type: "usage",
  },
  {
    name: "OBV Divergence Bot",
    description:
      "Detects divergences between price and On-Balance Volume to predict trend reversals before they happen.",
    category: "Analysis",
    price: "0.45",
    pnl: 38000,
    winRate: 59.8,
    volume: 950000,
    colors: ["#8b5cf6", "#d8b4fe"],
    type: "sale",
  },
  {
    name: "RSI Divergence Bot",
    description:
      "Classic technical analysis bot detecting RSI bullish/bearish divergences on 4h and Daily timeframes.",
    category: "Trading",
    price: "0.2",
    pnl: 18000,
    winRate: 54.0,
    volume: 600000,
    colors: ["#14b8a6", "#5eead4"],
    type: "sale",
  },
  {
    name: "Liquidity Commander",
    description:
      "JIT Liquidity provisioning for long-tail assets, capturing high fees during volatility spikes.",
    category: "Yield Farming",
    price: "3.0",
    pnl: 155000,
    winRate: 67.5,
    volume: 5500000,
    colors: ["#f59e0b", "#fcd34d"],
    type: "rent",
  },
  {
    name: "Gas Optimizer",
    description:
      "Predicts gas prices using mempool analysis to submit transactions during troughs, saving up to 40% on fees.",
    category: "Utility",
    price: "0.1",
    pnl: 1500, // Savings
    winRate: 95.0,
    volume: 120000,
    colors: ["#64748b", "#cbd5e1"],
    type: "sale",
  },
  {
    name: "Copy Trader Pro",
    description:
      "Advanced copy trading with anti-frontrun protection and dynamic slippage adjustment.",
    category: "Copy Trading",
    price: "1.0",
    pnl: 85000,
    winRate: 60.0,
    volume: 2200000,
    colors: ["#d946ef", "#e879f9"],
    type: "rent",
  },
  {
    name: "Flash Loan Master",
    description:
      "Scans for uncollateralized loan arbitrage opportunities across Aave, Compound, and dYdX.",
    category: "Arbitrage",
    price: "4.0",
    pnl: 350000,
    winRate: 89.0,
    volume: 15000000,
    colors: ["#3b82f6", "#93c5fd"],
    type: "subscription",
  },
];

const CATEGORY_IMAGES: Record<string, string> = {
  Analysis:
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=500", // AI Brain
  Arbitrage:
    "https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=500", // Chart
  "Yield Farming":
    "https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&q=80&w=500", // Network
  Governance:
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=500", // Lock/Security
  Security:
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=500",
  "Risk Management":
    "https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=500",
  "Copy Trading":
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=500",
  Trading:
    "https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=500",
  Utility:
    "https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&q=80&w=500",
  NFT: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=500",
  Investing:
    "https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=500",
  Execution:
    "https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&q=80&w=500",
};

function generateMockAgents(): AgentListItem[] {
  return AGENT_SCENARIOS.map((scenario, i) => {
    const listingType: AgentListingType =
      scenario.type === "subscription" ? "usage" : scenario.type;
    // Generate valid listing summary
    const listingSummary = [
      {
        listingId: `list_${i}`,
        listingType,
        networkId: "1",
        assetId: null,
        priceBaseUnits: (
          BigInt(Number(scenario.price) * 100) * BigInt(10 ** 16)
        ).toString(),
        currencySymbol: "ETH",
        currencyDecimals: 18,
      },
    ];

    // Adjust listing type to match union type if needed (assuming string is fine or strict type)
    // types.ts says AgentListingType = AgentListingSummaryRaw["listing_type"] which is typically 'sale' | 'rent' | ...

    return {
      id: `agent-mock-${i}`,
      orgId: "org_mock",
      slug: scenario.name.toLowerCase().replace(/\s+/g, "-"),
      name: scenario.name,
      description: scenario.description,
      visibility: "public",
      createdAt: daysAgo(Math.floor(Math.random() * 300)), // Random last year
      updatedAt: daysAgo(Math.floor(Math.random() * 10)),
      ownerUserId: "user_mock_nexis",
      avatarUrl:
        CATEGORY_IMAGES[scenario.category] ||
        `orb:${scenario.colors[0]},${scenario.colors[1]}`, // Use Theme Image or Orb fallback
      listingSummary: listingSummary, // Cast to any to avoid strict union issues with mock strings if they vary
      supply: Math.floor(Math.random() * 1000) + 1,
      numOwners: Math.floor(Math.random() * 200),
      performance: {
        realizedPnlUsd: scenario.pnl,
        volumeUsd: scenario.volume,
        winRatePercent: scenario.winRate,
        totalTrades: Math.floor(scenario.volume / 1000), // Approx
        wins: Math.floor((scenario.volume / 1000) * (scenario.winRate / 100)),
        losses: Math.floor(
          (scenario.volume / 1000) * ((100 - scenario.winRate) / 100),
        ),
        averageReturnPercent: Math.random() * 40 - 5, // Random return
      },
    };
  });
}

export const MOCK_AGENTS = generateMockAgents();
