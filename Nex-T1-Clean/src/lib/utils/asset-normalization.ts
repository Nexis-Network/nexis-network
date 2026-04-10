import { ChainType } from "@/lib/chain-adapter/chain-adapter";

export interface AssetTick {
  symbol: string;
  name: string;
  price: number;
  change24h: number; // Percentage change
  volume24h?: number;
  marketCap?: number;
  
  // Chain details
  chain: ChainType; // 'evm' | 'solana'
  chainId?: string; // '1', 'solana', '42161'
  address: string; // Contract address or 'native'
  decimals: number;
  
  // Media
  logoUrl?: string;
  
  // Extended info (optional for list views, populated for detail view)
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  explorerUrl?: string;
}

export type TokenStandard = "ERC20" | "SPL" | "NATIVE";


const LOGO_MAP: Record<string, string> = {
  "BTC": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  "WBTC": "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
  "ETH": "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  "WETH": "https://assets.coingecko.com/coins/images/2518/large/weth.png",
  "SOL": "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  "USDC": "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
  "USDT": "https://assets.coingecko.com/coins/images/325/large/Tether.png",
  "BNB": "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  "XRP": "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  "ADA": "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  "AVAX": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
  "LINK": "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  "MATIC": "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png",
  "SHIB": "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
  "UNI": "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
  "AAVE": "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
  "PEPE": "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg",
  "WIF": "https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg",
};

/**
 * Normalizes a generic token object (e.g. from Li.Fi / Birdeye) into AssetTick
 */
export function normalizeAsset(data: UntypedJson, chainType: ChainType = "evm"): AssetTick {
  const symbol = (data.symbol || "UNKNOWN").toUpperCase();
  const logoFromData = data.logoURI || data.logo || data.icon;
  const logoUrl = logoFromData || LOGO_MAP[symbol] || undefined;

  return {
    symbol: data.symbol || "UNKNOWN",
    name: data.name || "Unknown Token",
    price: Number(data.priceUSD || data.price || 0),
    change24h: Number(data.priceChange24h || data.change24h || 0),
    volume24h: Number(data.volume24h || 0),
    marketCap: Number(data.marketCap || 0),
    
    chain: chainType,
    chainId: String(data.chainId || (chainType === "solana" ? "solana" : "1")),
    address: data.address || data.tokenAddress || "",
    decimals: Number(data.decimals || 18),
    
    logoUrl: logoUrl,
    
    description: data.description,
    websiteUrl: data.website || data.websiteUrl,
    twitterUrl: data.twitter || data.twitterUrl,
    telegramUrl: data.telegram || data.telegramUrl,
  };
}

export const MOCK_ASSETS: AssetTick[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64230.50,
    change24h: 1.2,
    chain: "evm", // Wrapped or Native representation
    chainId: "1",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    decimals: 8,
    logoUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    websiteUrl: "https://bitcoin.org",
    twitterUrl: "https://twitter.com/bitcoin",
    explorerUrl: "https://mempool.space",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3250.50,
    change24h: 2.5,
    chain: "evm",
    chainId: "1",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    websiteUrl: "https://ethereum.org",
    twitterUrl: "https://twitter.com/ethereum",
    explorerUrl: "https://etherscan.io",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 145.20,
    change24h: -1.2,
    chain: "solana",
    chainId: "solana",
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logoUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    websiteUrl: "https://solana.com",
    twitterUrl: "https://twitter.com/solana",
    explorerUrl: "https://solscan.io",
  },
  {
    symbol: "USDC",
    name: "USDC",
    price: 1.00,
    change24h: 0.01,
    chain: "evm",
    chainId: "1",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    logoUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  },
  {
    symbol: "USDT",
    name: "Tether",
    price: 1.00,
    change24h: 0.02,
    chain: "evm",
    chainId: "1",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  },
  {
    symbol: "BNB",
    name: "BNB",
    price: 580.20,
    change24h: 0.5,
    chain: "evm",
    chainId: "56",
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: 0.62,
    change24h: 4.5,
    chain: "evm", // Proxy/Wrapped
    chainId: "1",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 6,
    logoUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.45,
    change24h: -0.5,
    chain: "evm", // Proxy
    chainId: "1",
    address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", // Binance-Peg Cardano Token
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    price: 35.50,
    change24h: 2.1,
    chain: "evm", 
    chainId: "43114",
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: 18.50,
    change24h: 5.6,
    chain: "evm",
    chainId: "1",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    price: 0.70,
    change24h: 1.5,
    chain: "evm",
    chainId: "137",
    address: "0x0000000000000000000000000000000000001010",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    price: 0.000018,
    change24h: 8.2,
    chain: "evm",
    chainId: "1",
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    price: 8.20,
    change24h: -1.5,
    chain: "evm",
    chainId: "1",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png",
  },
  {
    symbol: "AAVE",
    name: "Aave",
    price: 95.40,
    change24h: 3.2,
    chain: "evm",
    chainId: "1",
    address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
  },
  {
    symbol: "PEPE",
    name: "Pepe",
    price: 0.0000085,
    change24h: 12.5,
    chain: "evm",
    chainId: "1",
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    price: 2.50,
    change24h: 15.5,
    chain: "solana",
    chainId: "solana",
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 9,
    logoUrl: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  }
];
