/**
 * MCP Client Registry
 * 
 * Domain: server, mcp
 * Responsibility: Manages registration and lookup of MCP (Model Context Protocol) clients.
 * Depends on: Individual MCP client implementations
 */

import { defaultAlchemyClient } from "./alchemy-client";
import { defaultBinanceClient } from "./binance-client";
import { defaultBitcoinClient } from "./bitcoin-client";
import { defaultBlocknativeClient } from "./blocknative-client";
import { defaultChainlinkClient } from "./chainlink-client";
import { defaultCryptoSentimentClient } from "./crypto-sentiment-client";
import { defaultDefiLlamaClient } from "./defillama-client";
import { defaultEtherscanClient } from "./etherscan-client";
import { defaultEvmWalletMcpClient } from "./evm-wallet-client";
import { defaultHeliusClient } from "./helius-client";
import { defaultTokenMinterClient } from "./token-minter-client";
import { defaultUniswapPoolSpyClient } from "./uniswap-poolspy-client";
import { defaultDexscreenerClient } from "./dexscreener-client";
import { defaultPumpFunDataClient } from "./pumpfun-data-client";
import { defaultPumpFunChatClient } from "./pumpfun-chat-client";
import { defaultBscMcpClient } from "./bsc-chain-client";
import { defaultCcxtClient } from "./ccxt-client";
import type { HttpMcpClient } from "./base-client";

export type McpServerId =
  | "evmWallet"
  | "cryptoSentiment"
  | "tokenMinter"
  | "uniswapPoolSpy"
  | "bitcoin"
  | "chainlink"
  | "blocknative"
  | "etherscan"
  | "alchemy"
  | "binance"
  | "dexscreener"
  | "defillama"
  | "helius"
  | "pumpfunData"
  | "pumpfunChat"
  | "bscChain"
  | "ccxt";

type AnyClient = HttpMcpClient<string>;

type ClientEntry = {
  id: McpServerId;
  client: AnyClient;
  description: string;
};

const registry: Partial<Record<McpServerId, ClientEntry>> = {
  evmWallet: {
    id: "evmWallet",
    client: defaultEvmWalletMcpClient as AnyClient,
    description: "CryptoWallet-EVM MCP for wallet lifecycle and provider operations",
  },
  cryptoSentiment: {
    id: "cryptoSentiment",
    client: defaultCryptoSentimentClient as AnyClient,
    description: "Santiment-powered social sentiment analytics",
  },
  tokenMinter: {
    id: "tokenMinter",
    client: defaultTokenMinterClient as AnyClient,
    description: "Multi-chain ERC-20 deployment and token operations",
  },
  uniswapPoolSpy: {
    id: "uniswapPoolSpy",
    client: defaultUniswapPoolSpyClient as AnyClient,
    description: "Uniswap V3 pool creation surveillance across supported chains",
  },
  bitcoin: {
    id: "bitcoin",
    client: defaultBitcoinClient as AnyClient,
    description: "Bitcoin and Lightning key, transaction, and invoice tooling",
  },
  chainlink: {
    id: "chainlink",
    client: defaultChainlinkClient as AnyClient,
    description: "Chainlink price feeds across supported networks",
  },
  blocknative: {
    id: "blocknative",
    client: defaultBlocknativeClient as AnyClient,
    description: "Blocknative gas estimation and supported chain listing",
  },
  etherscan: {
    id: "etherscan",
    client: defaultEtherscanClient as AnyClient,
    description: "Etherscan APIs for balances, transactions, and ENS data",
  },
  alchemy: {
    id: "alchemy",
    client: defaultAlchemyClient as AnyClient,
    description: "Alchemy SDK access for NFTs, tokens, and chain data",
  },
  binance: {
    id: "binance",
    client: defaultBinanceClient as AnyClient,
    description: "Binance REST and WebSocket market data",
  },
  dexscreener: {
    id: "dexscreener",
    client: defaultDexscreenerClient as AnyClient,
    description: "DexScreener token profiles, boosted listings, and pair analytics",
  },
  defillama: {
    id: "defillama",
    client: defaultDefiLlamaClient as AnyClient,
    description: "DeFiLlama TVL, token price, and pool analytics",
  },
  helius: {
    id: "helius",
    client: defaultHeliusClient as AnyClient,
    description: "Helius Solana blockchain, token, and Jito tooling",
  },
  pumpfunData: {
    id: "pumpfunData",
    client: defaultPumpFunDataClient as AnyClient,
    description: "Pump.fun featured coin lists, analytics, and mint metadata",
  },
  pumpfunChat: {
    id: "pumpfunChat",
    client: defaultPumpFunChatClient as AnyClient,
    description: "Pump.fun chat room streaming and message utilities",
  },
  bscChain: {
    id: "bscChain",
    client: defaultBscMcpClient as AnyClient,
    description:
      "TermiX BNBChain MCP for BSC transfers, PancakeSwap liquidity, Four.Meme flows, and GoPlus token security",
  },
  ccxt: {
    id: "ccxt",
    client: defaultCcxtClient as AnyClient,
    description: "CCXT Multi-Exchange Market Data MCP",
  },
};

export const listRegisteredMcpClients = () =>
  Object.values(registry).map(({ id, description }) => ({ id, description }));

export const getMcpClient = (id: McpServerId): AnyClient => {
  const entry = registry[id];
  if (!entry) {
    throw new Error(`Unknown MCP client id: ${id}`);
  }
  return entry.client;
};
