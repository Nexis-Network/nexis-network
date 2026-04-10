/**
 * Moralis Tooling (Langfuse-ready specs + usage examples)
 *
 * Purpose:
 * - Provide copy/paste JSON Schema tool specs for Langfuse prompts.
 * - Document which internal (backend) routes implement each tool.
 *
 * Important:
 * - Production calls must be server-side only; never expose `MORALIS_API_KEY`.
 * - Tool names match the AI toolset ids in `src/modules/ai/chatbot/toolset.ts`.
 */

export type LangfuseToolSpec = {
  name: string;
  description: string;
  /** JSON Schema (OpenAI function calling style) */
  parameters: Record<string, UntypedJson>;
  /** Backend route handlers available for external tool callers (optional) */
  routes: Array<{ method: "GET" | "POST"; path: string }>;
  /** Moralis docs URLs used to verify endpoints */
  moralisDocs: string[];
};

const evmChainProp = {
  type: "string",
  description: "EVM chain id (hex like 0x1) or alias (ethereum/base/arbitrum). Defaults to 0x1.",
} as const;

const solNetworkProp = {
  type: "string",
  enum: ["mainnet", "devnet"],
  default: "mainnet",
  description: "Solana network.",
} as const;

const addressProp = {
  type: "string",
  description: "Wallet address.",
  minLength: 3,
} as const;

export const MORALIS_LANGFUSE_TOOL_SPECS: LangfuseToolSpec[] = [
  {
    name: "wallet_get_holdings",
    description: "Fetch wallet holdings (native + tokens) with USD pricing; supports EVM and Solana.",
    parameters: {
      type: "object",
      properties: {
        chainKind: { type: "string", enum: ["evm", "solana"], default: "evm" },
        address: addressProp,
        chain: evmChainProp,
        network: solNetworkProp,
        excludeSpam: { type: "boolean", default: true },
        excludeUnverified: { type: "boolean", default: true, description: "EVM only." },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [
      { method: "GET", path: "/api/tools/wallet/evm/balances" },
      { method: "GET", path: "/api/tools/wallet/sol/portfolio" },
    ],
    moralisDocs: [
      "https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-token-balances-price",
      "https://docs.moralis.com/web3-data-api/solana/reference/get-sol-portfolio",
    ],
  },
  {
    name: "wallet_get_history",
    description: "Fetch wallet history (decoded where available) for EVM and swap activity for Solana.",
    parameters: {
      type: "object",
      properties: {
        chainKind: { type: "string", enum: ["evm", "solana"], default: "evm" },
        address: addressProp,
        chain: evmChainProp,
        network: solNetworkProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        cursor: { type: "string", description: "Pagination cursor." },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [
      { method: "GET", path: "/api/tools/wallet/evm/history" },
      { method: "GET", path: "/api/tools/wallet/sol/swaps" },
    ],
    moralisDocs: [
      "https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-history",
      "https://docs.moralis.com/web3-data-api/solana/reference/get-wallet-swap-txs",
    ],
  },
  {
    name: "wallet_get_nfts",
    description: "Fetch wallet NFTs with metadata/media where supported; supports EVM and Solana.",
    parameters: {
      type: "object",
      properties: {
        chainKind: { type: "string", enum: ["evm", "solana"], default: "evm" },
        address: addressProp,
        chain: evmChainProp,
        network: solNetworkProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        cursor: { type: "string", description: "Pagination cursor." },
        excludeSpam: { type: "boolean", default: true },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [
      { method: "GET", path: "/api/tools/wallet/evm/nfts" },
      { method: "GET", path: "/api/tools/wallet/sol/nfts" },
    ],
    moralisDocs: [
      "https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-nfts-by-wallet",
      "https://docs.moralis.com/web3-data-api/solana/reference/get-wallet-nfts",
    ],
  },
  {
    name: "wallet_get_pnl",
    description: "Fetch EVM wallet profitability (PnL); falls back to approximation mode when unsupported.",
    parameters: {
      type: "object",
      properties: {
        address: addressProp,
        chain: evmChainProp,
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/wallet/evm/pnl" }],
    moralisDocs: [
      "https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-profitability-summary",
      "https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-profitability",
    ],
  },
  {
    name: "wallet_get_transfers",
    description: "Fetch EVM wallet ERC20 transfers via Moralis.",
    parameters: {
      type: "object",
      properties: {
        address: addressProp,
        chain: evmChainProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        cursor: { type: "string", description: "Pagination cursor." },
        fromDate: { type: "string", description: "ISO datetime (from)." },
        toDate: { type: "string", description: "ISO datetime (to)." },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/wallet/evm/transfers" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-token-transfers"],
  },
  {
    name: "wallet_get_net_worth",
    description: "Fetch EVM wallet net worth via Moralis.",
    parameters: {
      type: "object",
      properties: {
        address: addressProp,
        chain: evmChainProp,
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/wallet/evm/net-worth" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-net-worth"],
  },
  {
    name: "market_trending",
    description: "Fetch trending tokens across a chain using Moralis trending feed.",
    parameters: {
      type: "object",
      properties: {
        chain: { type: "string", description: "EVM chain id (0x...) OR 'solana'.", default: "0x1" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/market/trending" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/evm/reference/get-trending-tokens"],
  },
  {
    name: "market_gainers",
    description: "Fetch top gainers for an EVM chain using Moralis Discovery.",
    parameters: {
      type: "object",
      properties: {
        chain: evmChainProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        timeFrame: { type: "string", enum: ["1h", "24h", "7d", "30d"], default: "24h" },
        minMarketCap: { type: "number", minimum: 0 },
        securityScore: { type: "number", minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/market/gainers" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/evm/reference/get-tokens-with-top-gainers"],
  },
  {
    name: "market_losers",
    description: "Fetch top losers for an EVM chain using Moralis Discovery.",
    parameters: {
      type: "object",
      properties: {
        chain: evmChainProp,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        timeFrame: { type: "string", enum: ["1h", "24h", "7d", "30d"], default: "24h" },
        minMarketCap: { type: "number", minimum: 0 },
        securityScore: { type: "number", minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/market/losers" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/evm/reference/get-tokens-with-top-losers"],
  },
  {
    name: "market_filtered_tokens",
    description: "Query Moralis Filtered Tokens API (Discovery) using a POST body (strategy/sort/filters).",
    parameters: {
      type: "object",
      properties: {
        body: {
          type: "object",
          description: "Request body forwarded to Moralis `/discovery/tokens`.",
          additionalProperties: true,
        },
      },
      required: ["body"],
      additionalProperties: false,
    },
    routes: [{ method: "POST", path: "/api/tools/market/filtered-tokens" }],
    moralisDocs: [
      "https://docs.moralis.com/web3-data-api/evm/reference/get-filtered-tokens",
      "https://docs.moralis.com/web3-data-api/evm/tutorials/filtered-tokens-api/overview",
    ],
  },
  {
    name: "pumpfun_new_tokens",
    description: "Fetch newly created Pump.fun tokens (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        limit: { type: "integer", minimum: 1, maximum: 50, default: 25 },
        cursor: { type: "string" },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=new" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-new-pump-fun-tokens"],
  },
  {
    name: "pumpfun_pairs",
    description: "Fetch Pump.fun token pairs (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        address: { type: "string", description: "Pump.fun token mint address.", minLength: 32 },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=pairs" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-pairs"],
  },
  {
    name: "pumpfun_prices",
    description: "Fetch Pump.fun token price (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        address: { type: "string", description: "Pump.fun token mint address.", minLength: 32 },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=prices" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-prices"],
  },
  {
    name: "pumpfun_metadata",
    description: "Fetch Pump.fun token metadata for one or more mints (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        addresses: { type: "array", items: { type: "string", minLength: 32 }, minItems: 1, maxItems: 50 },
      },
      required: ["addresses"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=metadata" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-metadata"],
  },
  {
    name: "pumpfun_bonding_tokens",
    description: "Fetch bonding Pump.fun tokens (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        limit: { type: "integer", minimum: 1, maximum: 50, default: 25 },
        cursor: { type: "string" },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=bonding" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-bonding-pump-fun-tokens"],
  },
  {
    name: "pumpfun_graduated_tokens",
    description: "Fetch graduated Pump.fun tokens (Solana) via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        limit: { type: "integer", minimum: 1, maximum: 50, default: 25 },
        cursor: { type: "string" },
      },
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=graduated" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-graduated-pump-fun-tokens"],
  },
  {
    name: "pumpfun_bonding_status",
    description: "Fetch Pump.fun bonding status (progress) for a token mint via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        address: { type: "string", minLength: 32 },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=bonding-status" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-token-bonding-status"],
  },
  {
    name: "pumpfun_swaps",
    description: "Fetch Pump.fun token swaps via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        address: { type: "string", minLength: 32 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
        cursor: { type: "string" },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pumpfun?type=swaps" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-swaps"],
  },
  {
    name: "sol_token_prices_batch",
    description: "Fetch batch Solana token prices via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        addresses: { type: "array", items: { type: "string", minLength: 32 }, minItems: 1, maxItems: 100 },
        currency: { type: "string", default: "usd" },
      },
      required: ["addresses"],
      additionalProperties: false,
    },
    routes: [{ method: "POST", path: "/api/tools/sol/token/prices" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/reference/price/get-multiple-token-prices"],
  },
  {
    name: "sol_pairs_by_token",
    description: "Fetch Solana DEX pairs for a token address via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        address: { type: "string", description: "SPL mint address", minLength: 32 },
      },
      required: ["address"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pairs/by-token" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/reference/get-token-pairs-by-address"],
  },
  {
    name: "sol_pair_stats",
    description: "Fetch Solana pair stats via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        pairAddress: { type: "string", description: "Pair address", minLength: 32 },
      },
      required: ["pairAddress"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/pairs/stats" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/reference/get-token-pair-stats"],
  },
  {
    name: "sol_ohlcv_by_pair",
    description: "Fetch Solana OHLCV candles for a DEX pair via Moralis.",
    parameters: {
      type: "object",
      properties: {
        network: solNetworkProp,
        pairAddress: { type: "string", minLength: 32 },
        fromDate: { type: "string", description: "ISO datetime", minLength: 10 },
        toDate: { type: "string", description: "ISO datetime", minLength: 10 },
        timeframe: { type: "string", description: "e.g. 1h", minLength: 2 },
        currency: { type: "string", default: "usd" },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 50 },
      },
      required: ["pairAddress", "fromDate", "toDate", "timeframe"],
      additionalProperties: false,
    },
    routes: [{ method: "GET", path: "/api/tools/sol/ohlcv/by-pair" }],
    moralisDocs: ["https://docs.moralis.com/web3-data-api/solana/reference/price/get-ohlcv-by-pair-address"],
  },
];


export const MORALIS_LANGFUSE_TOOL_USAGE_EXAMPLES = String.raw`
## Canonical tool usage examples

### Wallet overview (EVM)
1) \`wallet_get_holdings\`:
   - \`{ "chainKind": "evm", "chain": "0x1", "address": "0x…", "excludeSpam": true, "excludeUnverified": true }\`
2) \`wallet_get_history\` (limit 25):
   - \`{ "chainKind": "evm", "chain": "0x1", "address": "0x…", "limit": 25 }\`
3) If user asks PnL:
   - \`wallet_get_pnl\`:
     - \`{ "address": "0x…", "chain": "0x1" }\`
   - If response.mode is \`approximation\`, call \`wallet_get_holdings\` + explain approximation limitations.
4) If user asks transfers or activity:
   - \`wallet_get_transfers\`:
     - \`{ "address": "0x…", "chain": "0x1", "limit": 25 }\`
5) If user asks net worth:
   - \`wallet_get_net_worth\`:
     - \`{ "address": "0x…", "chain": "0x1" }\`

### Wallet overview (Solana)
1) \`wallet_get_holdings\`:
   - \`{ "chainKind": "solana", "network": "mainnet", "address": "…", "excludeSpam": true }\`
2) \`wallet_get_history\` (swap activity):
   - \`{ "chainKind": "solana", "network": "mainnet", "address": "…", "limit": 25 }\`
3) \`wallet_get_nfts\`:
   - \`{ "chainKind": "solana", "network": "mainnet", "address": "…", "limit": 25, "excludeSpam": true }\`
4) If you need to enrich arbitrary mints with prices:
   - \`sol_token_prices_batch\`:
     - \`{ "network": "mainnet", "addresses": ["So11111111111111111111111111111111111111112"], "currency": "usd" }\`

### Market overview (EVM)
1) \`market_trending\`:
   - \`{ "chain": "0x1", "limit": 20 }\`
2) \`market_gainers\` / \`market_losers\`:
   - \`{ "chain": "0x1", "timeFrame": "24h", "limit": 20 }\`
3) Strategy-style lists:
   - \`market_filtered_tokens\`:
     - \`{ "body": { "chain": "0x1", "strategy": "experienced_buyers", "sortBy": "volume_usd", "order": "DESC", "limit": 20 } }\`

### Pump.fun (Solana)
1) \`pumpfun_new_tokens\`:
   - \`{ "network": "mainnet", "limit": 25 }\`
2) If user clicks a token:
   - \`pumpfun_prices\`:
     - \`{ "network": "mainnet", "address": "…mint…" }\`
   - \`pumpfun_pairs\`:
     - \`{ "network": "mainnet", "address": "…mint…" }\`
   - Optional context:
     - \`pumpfun_bonding_status\` → \`{ "network": "mainnet", "address": "…mint…" }\`
     - \`pumpfun_metadata\` → \`{ "network": "mainnet", "addresses": ["…mint…"] }\`
     - \`pumpfun_swaps\` → \`{ "network": "mainnet", "address": "…mint…", "limit": 25 }\`
   - For charts, pick a \`pairAddress\` from \`pumpfun_prices\` / \`pumpfun_pairs\` then call:
     - \`sol_ohlcv_by_pair\` → \`{ "network": "mainnet", "pairAddress": "…pair…", "fromDate": "2025-08-01T00:00:00Z", "toDate": "2025-08-02T00:00:00Z", "timeframe": "1h", "currency": "usd", "limit": 50 }\`

### Pagination notes
- Cursor-based endpoints return a \`cursor\` you can pass back into the next call.

### Error handling guidance
- If a tool returns no items or errors, render partial UI and suggest a retry. Avoid fabricating rows.
`;
