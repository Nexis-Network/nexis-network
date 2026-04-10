import { SOLANA_CHAIN_ID } from "@/modules/tokens/chains";

export interface ExternalTokenListSource {
  defaultChainId?: number;
  id: string;
  name: string;
  url: string;
}

export const EXTERNAL_TOKEN_LIST_SOURCES: ExternalTokenListSource[] = [
  { id: "uniswap", name: "Uniswap", url: "https://tokens.uniswap.org" },
  {
    id: "uniswapExtended",
    name: "Uniswap Extended",
    url: "https://raw.githubusercontent.com/Uniswap/extended-token-list/main/src/tokens/mainnet.json",
    defaultChainId: 1,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    url: "https://lite-api.jup.ag/tokens/v2/toporganicscore/24h",
    defaultChainId: SOLANA_CHAIN_ID,
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    url: "https://tokens.pancakeswap.finance/pancakeswap-extended.json",
  },
  {
    id: "traderjoe",
    name: "TraderJoe",
    url: "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists-v2/main/popular_tokenlist.json",
  },
  { id: "oneinch", name: "1inch", url: "https://tokens.1inch.io/v1.1/1" },
  {
    id: "coingecko",
    name: "CoinGecko Mainnet",
    url: "https://tokens.coingecko.com/uniswap/all.json",
  },
  {
    id: "coingeckoBase",
    name: "CoinGecko Base",
    url: "https://tokens.coingecko.com/base/all.json",
  },
  {
    id: "coingeckoBlast",
    name: "CoinGecko Blast",
    url: "https://tokens.coingecko.com/blast/all.json",
  },
  {
    id: "coingeckoZkSync",
    name: "CoinGecko zkSync",
    url: "https://tokens.coingecko.com/zksync/all.json",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    url: "https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json",
  },
  {
    id: "optimism",
    name: "Optimism",
    url: "https://static.optimism.io/optimism.tokenlist.json",
  },
  {
    id: "polygon",
    name: "Polygon",
    url: "https://unpkg.com/quickswap-default-token-list@latest/build/quickswap-default.tokenlist.json",
  },
  {
    id: "nexisMainnet",
    name: "Nexis Mainnet",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/mainnet.json",
    defaultChainId: 1,
  },
  {
    id: "nexisSolana",
    name: "Nexis Solana",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/solana.json",
    defaultChainId: SOLANA_CHAIN_ID,
  },
  {
    id: "nexisBase",
    name: "Nexis Base",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/base.json",
    defaultChainId: 8453,
  },
  {
    id: "nexisArbitrum",
    name: "Nexis Arbitrum",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/arbitrum.json",
    defaultChainId: 42161,
  },
  {
    id: "nexisOptimism",
    name: "Nexis Optimism",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/optimism.json",
    defaultChainId: 10,
  },
  {
    id: "nexisPolygon",
    name: "Nexis Polygon",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/polygon.json",
    defaultChainId: 137,
  },
  {
    id: "nexisAvalanche",
    name: "Nexis Avalanche",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/avalanche.json",
    defaultChainId: 43114,
  },
  {
    id: "nexisBnb",
    name: "Nexis BNB",
    url: "https://raw.githubusercontent.com/Nexis-AI/default-token-list/main/src/tokens/bnb.json",
    defaultChainId: 56,
  },
];
