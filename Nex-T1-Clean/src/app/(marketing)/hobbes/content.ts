export type HobbesHeroIntegrationLogo = {
  src: string;
  hoverSrc: string;
  alt: string;
};

export const HOBBES_HERO_INTEGRATION_LOGOS = [
  {
    src: "/assets/integrations/aave-logo.svg",
    hoverSrc: "/assets/integrations/aave-logo-hover.svg",
    alt: "Aave",
  },
  {
    src: "/assets/integrations/axiom-logo.svg",
    hoverSrc: "/assets/integrations/axiom-logo-hover.svg",
    alt: "Axiom",
  },
  {
    src: "/assets/integrations/uniswap-logo.svg",
    hoverSrc: "/assets/integrations/uniswap-logo-hover.svg",
    alt: "Uniswap",
  },
  {
    src: "/assets/integrations/polymarket-logo.svg",
    hoverSrc: "/assets/integrations/polymarket-logo-hover.svg",
    alt: "Polymarket",
  },
  {
    src: "/assets/integrations/coinbase-logo.svg",
    hoverSrc: "/assets/integrations/coinbase-logo-hover.svg",
    alt: "Coinbase",
  },
  {
    src: "/assets/integrations/coinbase-wallet-logo.svg",
    hoverSrc: "/assets/integrations/coinbase-wallet-logo-hover.svg",
    alt: "Coinbase Wallet",
  },
  {
    src: "/assets/integrations/binance-logo.svg",
    hoverSrc: "/assets/integrations/binance-logo-hover.svg",
    alt: "Binance",
  },
  {
    src: "/assets/integrations/bybit-logo.svg",
    hoverSrc: "/assets/integrations/bybit-logo-hover.svg",
    alt: "Bybit",
  },
  {
    src: "/assets/integrations/OKX-logo.svg",
    hoverSrc: "/assets/integrations/OKX-logo-hover.svg",
    alt: "OKX",
  },
  {
    src: "/assets/integrations/kucoin-logo.svg",
    hoverSrc: "/assets/integrations/kucoin-logo-hover.svg",
    alt: "KuCoin",
  },
] as const satisfies readonly HobbesHeroIntegrationLogo[];

export const HOBBES_PROBLEM_HEADLINE =
  "DeFi teams need answers, actions, and auditability in one place. Operations need speed without sacrificing approvals. They need to move from intent to execution across chains and wallets with clear policy controls, human checkpoints, and a verifiable record of every decision.";

export const HOBBES_PROBLEM_SUPPORTING_TEXT =
  "Tool sprawl creates blind spots across chains and wallets. Nex Copilot brings execution, context, and control together.";

export const FEATURE_IMAGE_ASSET = "https://www.figma.com/api/mcp/asset/dfc677bd-1f51-4ea4-ab67-279c01115ed7";

export const TESTIMONIAL_AVATAR_1 = "https://www.figma.com/api/mcp/asset/ae935360-acb4-4676-8172-f7c695915dc0";
export const TESTIMONIAL_AVATAR_2 = "https://www.figma.com/api/mcp/asset/c857b42a-65c7-45e4-a022-ae376d6950d1";

export const OUTCOME_ASSETS = ["/new-landing/predict.webp", "/new-landing/nft.webp", "/new-landing/chains_uozgew.webp"] as const;

export const HOW_IT_WORKS_ASSET = "https://www.figma.com/api/mcp/asset/865783b0-0b29-4df4-a900-ee8a57bf0662";

export const USE_CASES = [
  {
    icon: "/assets/portfolio/swap.svg",
    label: "Trading",
    title: "Automate Strategy Execution",
    body: "Run swaps, rebalances, and signal-based actions with HITL checks and live market integrations across major chains.",
  },
  {
    icon: "/assets/portfolio/send.svg",
    label: "Treasury",
    title: "Manage Wallet Ops Safely",
    body: "Use Safe-compatible controls, scoped session keys, and policy approvals to move funds only when governance allows.",
  },
  {
    icon: "/assets/portfolio/buy.svg",
    label: "Research",
    title: "Unify Onchain + Market Intel",
    body: "Combine MCP data from Moralis, The Graph, Dexscreener, CCXT, and more to turn questions into actionable steps.",
  },
] as const;

export const HOBBES_FEATURE_STEPS = [
  {
    id: "portfolio-context",
    title: "Understands Portfolio Context",
    description:
      "Nex Copilot maps balances, token positions, approvals, and profit/loss across chains so your team can act with full portfolio context instead of fragmented dashboards.",
  },
  {
    id: "persistent-runtime",
    title: "Executes In Persistent Runtime",
    description:
      "Persistent E2B sessions keep workflows running between prompts, enabling always-on monitoring, script execution, and reliable task continuation without losing operational state.",
  },
  {
    id: "smart-wallets",
    title: "Manages User Smart Wallets",
    description:
      "Nex Copilot orchestrates user smart wallets with policy rules, session keys, and approval checkpoints so teams can move quickly while preserving clear governance and control.",
  },
  {
    id: "integrations-chains",
    title: "Connects Integrations + Chains",
    description:
      "From protocols and exchanges to live data services, Nex Copilot connects your stack across chains so research, execution, and treasury operations run from one coordinated control layer.",
  },
] as const;

export const ENTERPRISE_ITEMS = [
  {
    title: "Supported Chains",
    body: "Ethereum, Base, Arbitrum, Optimism, Polygon, Solana, BNB Chain, Monad, HyperEVM, Linea, and Avalanche are supported.",
    logos: [
      { src: "/icons/chain-icons/ethereum.svg", alt: "Ethereum" },
      { src: "/icons/chain-icons/base.svg", alt: "Base" },
      { src: "/icons/chain-icons/arbitrum.svg", alt: "Arbitrum" },
      { src: "/icons/chain-icons/optimism.svg", alt: "Optimism" },
      { src: "/icons/chain-icons/polygon.svg", alt: "Polygon" },
      { src: "/icons/chain-icons/solana.svg", alt: "Solana" },
      { src: "/icons/chain-icons/bnb-chain.svg", alt: "BNB Chain" },
      { src: "/icons/chain-icons/monad.svg", alt: "Monad" },
      { src: "/icons/chain-icons/hyperliquid.svg", alt: "HyperEVM" },
      { src: "/icons/chain-icons/linea.svg", alt: "Linea" },
      { src: "/icons/chain-icons/avalanche.svg", alt: "Avalanche" },
    ],
  },
  {
    title: "Integrated Protocols",
    body: "Chainlink, Alchemy, Safe, DefiLlama, Etherscan, Uniswap, 1inch, Coingecko, Birdeye, Moralis, and CoinMarketCap are integrated.",
    logos: [
      { src: "/icons/web3-icons/chainlink.svg", alt: "Chainlink" },
      { src: "/icons/web3-icons/alchemy.svg", alt: "Alchemy" },
      { src: "/assets/wallet-logos/Safe-Wallet.svg", alt: "Safe" },
      { src: "/icons/web3-icons/defillama.svg", alt: "DefiLlama" },
      { src: "/icons/web3-icons/etherscan.svg", alt: "Etherscan" },
      { src: "/icons/web3-icons/uniswap.svg", alt: "Uniswap" },
      { src: "/icons/web3-icons/1inch.svg", alt: "1inch" },
      { src: "/icons/integrations/coingecko.png", alt: "Coingecko" },
      { src: "/icons/integrations/birdeye.ico", alt: "Birdeye" },
      { src: "/icons/integrations/moralis.ico", alt: "Moralis" },
      { src: "/icons/integrations/coinmarketcap.ico", alt: "CoinMarketCap" },
    ],
  },
  {
    title: "Centralized Exchanges",
    body: "Coinbase, Binance, OKX, ByBit, Kraken, BitFinex, Huobi, KuCoin, and Gemini are available through integrations.",
    logos: [
      { src: "/assets/wallet-logos/Coinbase.svg", alt: "Coinbase" },
      { src: "/assets/wallet-logos/Binance.svg", alt: "Binance" },
      { src: "/assets/wallet-logos/OKX.svg", alt: "OKX" },
      { src: "/icons/integrations/bybit.ico", alt: "ByBit" },
      { src: "/icons/integrations/kraken.svg", alt: "Kraken" },
      { src: "/icons/integrations/bitfinex.png", alt: "BitFinex" },
      { src: "/icons/integrations/huobi.ico", alt: "Huobi" },
      { src: "/assets/wallet-logos/KuCoin.svg", alt: "KuCoin" },
      { src: "/icons/integrations/gemini.ico", alt: "Gemini" },
    ],
  },
  {
    title: "Decentralized Exchanges",
    body: "Uniswap, PancakeSwap, SushiSwap, Curve, Raydium, Jupiter, Pump.fun / Pump.swap, and Aerodrome.finance are integrated today.",
    logos: [
      { src: "/assets/exchanges/uniswap.svg", alt: "Uniswap" },
      { src: "/assets/exchanges/pancakeswap.svg", alt: "PancakeSwap" },
      { src: "/assets/exchanges/sushiswap.svg", alt: "SushiSwap" },
      { src: "/assets/exchanges/curve-dex.webp", alt: "Curve" },
      { src: "/assets/exchanges/raydium.svg", alt: "Raydium" },
      { src: "/assets/exchanges/jupyter.svg", alt: "Jupiter" },
      { src: "/assets/exchanges/pumpswap.webp", alt: "Pump.fun / Pump.swap" },
      { src: "/assets/exchanges/aerodrome.webp", alt: "Aerodrome.finance" },
    ],
  },
] as const;

export const COMPARISON_HEADER_BG = "https://www.figma.com/api/mcp/asset/6cd205f0-0c98-44e9-a5b6-ea1ba79838b3";
export const COMPARISON_NOISE = "https://www.figma.com/api/mcp/asset/855d20c8-1a92-41a4-b451-5105b18fd67e";
export const COMPARISON_NEXIS_ICON = "https://www.figma.com/api/mcp/asset/d9f2fe1b-db00-417f-9b5b-f7413ae51dcc";

export const COMPARISON_COMPETITOR_ONE = "Banana Gun";
export const COMPARISON_COMPETITOR_TWO = "Maestro";

export type ComparisonStatus = "check" | "warn" | "dash";

export const COMPARISON_ROWS: {
  feature: string;
  hobbes: ComparisonStatus;
  competitorOne: ComparisonStatus;
  competitorTwo: ComparisonStatus;
}[] = [
  {
    feature: "24/7 Polymarket agentic trade execution",
    hobbes: "check",
    competitorOne: "warn",
    competitorTwo: "dash",
  },
  {
    feature: "HITL approvals for value-moving wallet actions",
    hobbes: "check",
    competitorOne: "dash",
    competitorTwo: "dash",
  },
  {
    feature: "Persistent runtime and memory context",
    hobbes: "check",
    competitorOne: "dash",
    competitorTwo: "dash",
  },
  {
    feature: "Live MCP + market/onchain tool integrations",
    hobbes: "check",
    competitorOne: "warn",
    competitorTwo: "dash",
  },
  {
    feature: "Multichain execution across EVM + Solana",
    hobbes: "check",
    competitorOne: "warn",
    competitorTwo: "dash",
  },
  {
    feature: "Session-key policies with Safe audit trails",
    hobbes: "check",
    competitorOne: "dash",
    competitorTwo: "dash",
  },
];

export const FOOTER_WORDMARK_ASSET = "https://www.figma.com/api/mcp/asset/19deb9a2-98a2-40dd-897c-2cdd8e50f14f";
