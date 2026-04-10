export type TokenMetadata = {
  address?: `0x${string}`;
  decimals: number;
};

type ChainTokenMap = Record<string, TokenMetadata>;

const TOKEN_METADATA: Record<number, ChainTokenMap> = {
  1: {
    ETH: { decimals: 18 },
    USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    WBTC: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8 },
    MATIC: { address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", decimals: 18 },
    LINK: { address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18 },
    ARB: { address: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    AVAX: { address: "0x85f138bfEE4ef8e540890CFb48F620571d67Eda3", decimals: 18 },
  },
  8453: {
    ETH: { decimals: 18 },
    USDC: { address: "0x833589fCD6eDb6E08f4c7C90b7Aaa2a5dA4A1328", decimals: 6 },
    USDT: { address: "0x5dB7144ED24730230c2c43dD4AaFaA09f22C470A", decimals: 6 },
    WBTC: { address: "0x7eC81b3de6efC4D4F5E7Bae23e7e01B26eF5b3C3", decimals: 8 },
    MATIC: { address: "0x5d28b4aa1c7a955b1922cd4453df45c2cb6793b3", decimals: 18 },
    LINK: { address: "0x66A2A913e447d6b4bf033B2F5C3176b4C0f81A1D", decimals: 18 },
    ARB: { address: "0x3082CC23568ea640225c2467653dB90e9250AaA0", decimals: 18 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    AVAX: { address: "0x61510B96F08aa109A39e9DA214F00F34f6a0cD91", decimals: 18 },
  },
  137: {
    MATIC: { decimals: 18 },
    USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    USDT: { address: "0xc2132D05D31c914A87C6611C10748AaCBdD4dAEc", decimals: 6 },
    WBTC: { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
    LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1FC0fD03FaBad39", decimals: 18 },
    ETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  },
  42161: {
    ETH: { decimals: 18 },
    USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    USDT: { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", decimals: 6 },
    WBTC: { address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", decimals: 6 },
    ARB: { address: "0x912ce59144191c1204e64559fe8253a0e49e6548", decimals: 18 },
    LINK: { address: "0xf97f4df75117a78c1A5a0DBb814af92458539FB4", decimals: 18 },
  },
  10: {
    ETH: { decimals: 18 },
    USDC: { address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", decimals: 6 },
    USDT: { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    WBTC: { address: "0x68f180fcce6836688e9084f035309e29bf0a2095", decimals: 8 },
  },
};

export function getTokenMetadata(chainId: number, symbol: string): TokenMetadata {
  const metadata = TOKEN_METADATA[chainId]?.[symbol.toUpperCase()];
  if (!metadata) {
    throw new Error(`Unsupported token ${symbol} on chain ${chainId}`);
  }
  return metadata;
}

