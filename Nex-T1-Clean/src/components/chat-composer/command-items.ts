"use client";

import { PROMPTS, type PromptShortcutId } from "@/components/chat-composer/constants";
import type { CommandPaletteItem } from "@/components/chat-composer/types";

type CommandContext = {
  setPrompt: (prompt: string) => void;
  navigate: (path: string) => void;
  dispatchModelChange: (value: string) => void;
};

const PROMPT_LOOKUP = new Map<PromptShortcutId, string>(PROMPTS.map((entry) => [entry.id, entry.prompt]));

const resolvePrompt = (id: PromptShortcutId) => PROMPT_LOOKUP.get(id) ?? "";

const SIMPLE_COMMANDS: Array<{
  id: string;
  label: string;
  hint: string;
  promptId: PromptShortcutId;
  value: string;
}> = [
  {
    id: "cmd-send-eth",
    label: "Send 0.1 ETH",
    value: "send eth transfer 0.1 wallet payout",
    hint: "Stage a 0.1 ETH transfer with fee guidance.",
    promptId: "send-eth",
  },
  {
    id: "cmd-buy-eth-uniswap",
    label: "Buy ETH on Uniswap",
    value: "buy eth uniswap swap",
    hint: "Route a Uniswap swap with slippage controls.",
    promptId: "buy-eth-uniswap",
  },
  {
    id: "cmd-buy-eth-base",
    label: "Buy 0.01 ETH on Base",
    value: "buy eth base usdc 0.01",
    hint: "Swap 0.01 ETH using USDC liquidity on Base.",
    promptId: "buy-eth-base",
  },
  {
    id: "cmd-bridge-usdc",
    label: "Bridge 50 USDC",
    value: "bridge 50 usdc base solana debridge",
    hint: "Move funds between Base and Solana safely.",
    promptId: "bridge-usdc",
  },
  {
    id: "cmd-evm-wallet",
    label: "Create EVM Wallet",
    value: "create evm wallet agent",
    hint: "Provision a new agent wallet with encryption tips.",
    promptId: "evm-wallet",
  },
  {
    id: "cmd-sol-wallet",
    label: "Create Solana Wallet",
    value: "create solana wallet",
    hint: "Guide wallet creation/import via Settings (tools are read-only).",
    promptId: "sol-wallet",
  },
  {
    id: "cmd-pumpfun-launch",
    label: "Deploy Pump.fun Token",
    value: "deploy pumpfun token launch",
    hint: "Launch and seed a Pump.fun bonding curve.",
    promptId: "pumpfun",
  },
];

export function buildCommandItems(
  { setPrompt, navigate, dispatchModelChange }: CommandContext,
  _additionalItems: CommandPaletteItem[] = [],
): CommandPaletteItem[] {
  const items: CommandPaletteItem[] = [
    ...SIMPLE_COMMANDS.map((command) => ({
      id: command.id,
      label: command.label,
      value: command.value.toLowerCase(),
      hint: command.hint,
      perform: () => setPrompt(resolvePrompt(command.promptId)),
    })),
    {
      id: "wallet-generate",
      label: "Generate Agent Wallet",
      value: "wallet generate agent create cryptowallet evm",
      hint: "Create a wallet and store it securely (no keys in chat)",
      perform: () => {
        setPrompt(
          'Create an agent EVM wallet by calling `cryptowallet_evm` with `command: wallet_create_random` and providerURL "https://eth.llamarpc.com". Return the new address only (no mnemonic/private key in chat). Confirm it is stored under Settings → Wallets for audit logging and export.',
        );
      },
    },
    {
      id: "wallet-encrypt",
      label: "Create Encrypted Base Wallet",
      value: "wallet create base encrypted cryptowallet evm",
      hint: "Create wallet and use Settings export flow",
      perform: () => {
        setPrompt(
          'Create an agent EVM wallet on Base via `cryptowallet_evm` `command: wallet_create_random` with providerURL "https://base.drpc.org". Return the address only, then explain how to export/encrypt secrets safely via Settings → Wallets (do not request or display mnemonic/private key in chat).',
        );
      },
    },
    {
      id: "wallet-recover",
      label: "Recover Mnemonic & Check Balance",
      value: "wallet recover mnemonic balance cryptowallet evm",
      hint: "Guide secure import; then balance check",
      perform: () => {
        setPrompt(
          'I need to check an EVM wallet balance. If I need to import a mnemonic/private key, instruct me to do it via Settings → Wallets (never paste secrets into chat). Then, for the provided address, call `cryptowallet_evm` with `command: wallet_get_balance` and `command: wallet_get_transaction_count` to report balance and next nonce.',
        );
      },
    },
    {
      id: "wallet-balance",
      label: "Check Wallet Balance",
      value: "wallet balance monitor evm",
      hint: "Use cryptowallet_evm to audit balances",
      perform: () => {
        setPrompt(
          "List agent wallets via `agent_wallet_list`, then for each address call `cryptowallet_evm` with `command: wallet_get_balance`. Summarize balances concisely and flag any pending transactions (do not reveal secrets).",
        );
      },
    },
    {
      id: "sentiment-scan",
      label: "Run Sentiment Scan",
      value: "crypto sentiment analysis",
      hint: "Santiment social balance & dominance",
      perform: () => {
        setPrompt(
          "Use the crypto sentiment MCP to analyze social sentiment balance, dominance, and trending narratives for BTC, ETH, and SOL over the last 7 days. Summarize notable shifts.",
        );
      },
    },
    {
      id: "token-minter",
      label: "Deploy ERC-20 Token",
      value: "deploy erc20 token",
      hint: "Launch a token via MCP minter",
      perform: () => {
        setPrompt(
          "Deploy a new ERC-20 token named 'NexUtility' (symbol 'NEXU') on Base (chainId 8453) with 1,000,000 supply and 18 decimals using the token minter MCP. Return the deployment tx hash and follow-up checklist.",
        );
      },
    },
    {
      id: "poolspy-monitor",
      label: "Watch New Uniswap Pools",
      value: "uniswap pool monitor",
      hint: "Scan V3 pool creations",
      perform: () => {
        setPrompt(
          "Query the Uniswap Pool Spy MCP for new pools on Base in the last 15 minutes sorted by TVL. Highlight any pools with TVL > $250k and include token symbols.",
        );
      },
    },
    {
      id: "dexscreener-check",
      label: "Check DexScreener Pairs",
      value: "dexscreener pairs",
      hint: "Analyze boosted tokens & pairs",
      perform: () => {
        setPrompt(
          "Use the DexScreener MCP to fetch top boosted tokens, recent token profiles, and search for SOL pairs showing significant boosts on Solana.",
        );
      },
    },
    {
      id: "coingecko-metrics",
      label: "CoinGecko Metrics",
      value: "coingecko metrics fundamentals",
      hint: "Fundamentals & pricing via CoinGecko",
      perform: () => {
        setPrompt(
          "Use the coingecko_trending tool to build a fundamentals snapshot for ETH, SOL, and ARB. Highlight 24h price change, market cap, and volume metrics.",
        );
      },
    },
    {
      id: "market-movers",
      label: "Top Market Movers",
      value: "market movers gainers losers",
      hint: "Spot top movers from market data",
      perform: () => {
        setPrompt(
          "Use market_intelligence to find the leading gainers and losers in the last 24 hours (limit 5). Summarize price change %, market cap, and sector notes.",
        );
      },
    },
    {
      id: "token-security",
      label: "Token Security Scan",
      value: "token security scan risk",
      hint: "Assess token risk signals",
      perform: () => {
        setPrompt(
          "Use dexscreener and helius_solana to check token security for JUP, WIF, and BONK. Flag any security alerts, thin liquidity pools, or unusual volume spikes.",
        );
      },
    },
    {
      id: "chainlink-price",
      label: "Chainlink Price Check",
      value: "chainlink price feeds",
      hint: "Get oracle price",
      perform: () => {
        setPrompt(
          "Query Chainlink feeds for ETH/USD on Ethereum and SOL/USD on Base. Provide latest price, round ID, timestamp, and compare to Binance spot price.",
        );
      },
    },
    {
      id: "gas-playbook",
      label: "Estimate Gas Plan",
      value: "blocknative gas estimate",
      hint: "Confidence-based gas table",
      perform: () => {
        setPrompt(
          "Call the Blocknative MCP to predict gas prices on Ethereum (chainId 1) at 70%, 90%, and 99% confidence and estimate cost of a 120k gas swap.",
        );
      },
    },
    {
      id: "etherscan-audit",
      label: "Etherscan Wallet Audit",
      value: "etherscan wallet audit",
      hint: "Activity, gas, ENS",
      perform: () => {
        setPrompt(
          "Audit address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e using the Etherscan MCP. Include ETH balance, ENS name, last 5 transactions, and top token transfers.",
        );
      },
    },
    {
      id: "alchemy-nfts",
      label: "Fetch Wallet NFTs",
      value: "alchemy nft fetch",
      hint: "Alchemy NFT portfolio",
      perform: () => {
        setPrompt(
          "Use the Alchemy MCP to list NFTs owned by 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB, including metadata and floor prices when available.",
        );
      },
    },
    {
      id: "binance-stream",
      label: "Subscribe Binance Feed",
      value: "binance stream subscribe",
      hint: "Real-time market data",
      perform: () => {
        setPrompt(
          "Subscribe to Binance MCP trade and ticker streams for BTCUSDT (spot) and summarize live updates for the next minute.",
        );
      },
    },
    {
      id: "defillama-tvl",
      label: "DeFiLlama TVL Trend",
      value: "defillama tvl trend",
      hint: "Protocol & chain metrics",
      perform: () => {
        setPrompt(
          "Use the DeFiLlama MCP to compare Aave and Curve TVL over the past 30 days and highlight any significant chain-level shifts.",
        );
      },
    },
    {
      id: "helius-solana",
      label: "Solana Asset Sweep",
      value: "helius solana assets",
      hint: "Helius balance & NFTs",
      perform: () => {
        setPrompt(
          "Call the Helius MCP to fetch the SOL balance, token accounts, and recent transactions for wallet 5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8.",
        );
      },
    },
    {
      id: "open-wallet-settings",
      label: "Open Wallet Settings",
      value: "wallet settings page",
      hint: "Navigate to wallets management",
      perform: () => {
        navigate("/settings/wallets");
      },
    },
    {
      id: "pumpfun-launch",
      label: "Launch Pump.fun Token",
      value: "pumpfun create token",
      hint: "Use pump.fun SDK to create & seed a token",
      perform: () => {
        setPrompt(
          'Using the pumpfun_trader tool, create_and_buy a new Pump.fun token named "Nex Momentum" (symbol NEXM) on devnet. Use 0.35 SOL for the initial buy, limit slippage to 1%, and include recommended priority fees. Return the mint address, explorer link, bonding curve snapshot, and next steps for renouncing authority.',
        );
      },
    },
    {
      id: "pumpfun-trend",
      label: "Pump.fun Trend Radar",
      value: "pumpfun trend analysis",
      hint: "Combine pump.fun data + chat feeds",
      perform: () => {
        setPrompt(
          "Leverage pumpfun_data and pumpfun_chat tools to identify three trending Pump.fun coins by market cap growth and chat velocity over the past hour. Summarize trade volume, holder counts, top chat takeaways, and recommend a watchlist order.",
        );
      },
    },
    {
      id: "pumpfun-chat-monitor",
      label: "Monitor Pump.fun Chat Room",
      value: "pumpfun chat monitor",
      hint: "Subscribe to live chat messages",
      perform: () => {
        setPrompt(
          "Use pumpfun_chat to read the last 25 messages for mint HYPERpump123 and keep listening for 2 minutes. Flag whale callouts, influencer mentions, and sudden sentiment spikes. Provide actionable alerts.",
        );
      },
    },
    {
      id: "wallet-balance-check",
      label: "Wallet Balance Check",
      value: "wallet balance check",
      hint: "Check managed wallet balances",
      perform: () => {
        setPrompt(
          "Use cryptowallet_evm to fetch balances across Base and Polygon for my Nex managed wallets, then summarize holdings, fiat value, and recent movements. Highlight any low balances that may impact automations.",
        );
      },
    },
    {
      id: "wallet-session-sync",
      label: "Sync Wallet Sessions",
      value: "wallet session sync",
      hint: "Refresh wallet auth state",
      perform: () => {
        setPrompt(
          "Review connected wallets, verify session health, and surface any wallets that need re-linking. Provide a checklist for refreshing wallet sessions and reconnecting stale providers.",
        );
      },
    },
    {
      id: "switch-model-nex-t1-max",
      label: "Switch to Nex-T1 MAX",
      value: "switch model nex t1 max",
      hint: "Most advanced reasoning model",
      perform: () => {
        dispatchModelChange("nex-t1-max");
      },
    },
    {
      id: "market-prompt",
      label: "Cross-Chain Market Pulse",
      value: "market pulse prompt",
      hint: "Insert the cross-chain market overview prompt",
      perform: () => {
        setPrompt(
          'Run market_intelligence with asset "ETH", chain "base", metrics ["price", "liquidity", "tvl", "sentiment"], windowMinutes 60. Cross-check with defi_llama get_protocol_tvl for leading Base DEXs and uniswap_poolspy get_new_pools (time_range_seconds 3600). Summarize liquidity rotations, perp momentum, and call blocknative_gas predict_gas_price for execution guidance.',
        );
      },
    },
    {
      id: "market-intelligence",
      label: "Market Intelligence Digest",
      value: "market intelligence aggregator",
      hint: "Aggregate price, sentiment, TVL",
      perform: () => {
        setPrompt(
          'Run the market_intelligence tool to gather price, sentiment, TVL, gas, and liquidity insights for ETH on Base over the last 60 minutes. Provide a structured summary with actionable notes.',
        );
      },
    },
    {
      id: "cryptorank-unlocks",
      label: "CryptoRank Token Unlock Radar",
      value: "cryptorank token unlock radar",
      hint: "Pull upcoming unlocks & vesting cliffs",
      perform: () => {
        setPrompt(
          'Call the cryptorank tool with endpoint "currencies_token_unlock" (limit 100) and highlight the next 14 days of unlocks for SOL, SUI, APT, and OP. Cross-reference with currents team allocations (`currencies_by_id_vesting`) and flag any unlocks exceeding 2% of circulating supply. Return a timeline artifact plus risk notes.',
        );
      },
    },
    {
      id: "cryptorank-ecosystem-scan",
      label: "CryptoRank Ecosystem Scan",
      value: "cryptorank ecosystem scan",
      hint: "Map projects & metrics per ecosystem",
      perform: () => {
        setPrompt(
          'Use cryptorank with endpoint "ecosystems_by_id_projects" for the Base ecosystem, include pagination up to 200 projects, and summarize TVL, launch dates, and funding rounds. Combine with "ecosystems_tags" to cluster by narrative, then recommend three projects to watch.',
        );
      },
    },
    {
      id: "cryptorank-news-brief",
      label: "CryptoRank News Brief",
      value: "cryptorank news brief",
      hint: "Fetch curated market headlines",
      perform: () => {
        setPrompt(
          'Invoke cryptorank with endpoint "news_feed" (locale "en", limit 100) and synthesize a multi-paragraph briefing covering L1 ecosystems, token unlocks, and macro regulation. Cross-reference tags from "news_map" to bucket stories and suggest follow-up analysis.',
        );
      },
    },
    {
      id: "market-chart",
      label: "Generate Pyth Price Chart",
      value: "market chart pyth price",
      hint: "Ask Nex to visualize a token with live Pyth data",
      perform: () => {
        setPrompt(
          "Stream an interactive Pyth price chart for BTC/USD over the past 7 days, summarize volume, volatility, and any notable on-chain headlines.",
        );
      },
    },
    {
      id: "comparison-table",
      label: "Create KPI Comparison Table",
      value: "table kpi comparison",
      hint: "Lay out metrics in a structured table",
      perform: () => {
        setPrompt(
          "Create a comparison table of our last three product launches covering launch date, revenue impact, retention, and key takeaways.",
        );
      },
    },
  ];

  return items;
}
