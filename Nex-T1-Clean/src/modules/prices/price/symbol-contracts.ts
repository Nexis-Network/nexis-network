export type SymbolContractMap = Record<number, Record<string, string>>;

// Minimal curated map for common tokens to improve pricing coverage when a
// transaction doesn't include contract addresses.
// NOTE: Addresses are lowercase and mainnet only.
export const SYMBOL_CONTRACTS: SymbolContractMap = {
  1: {
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    DAI: "0x6b175474e89094c44da98b954eedeac495271d0f",
    WBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  },
  137: {
    USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    USDT: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    DAI: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    WETH: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    WBTC: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
  },
  42161: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831".toLowerCase(),
    USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    DAI: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    WBTC: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  },
  10: {
    USDC: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    USDT: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    DAI: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    WETH: "0x4200000000000000000000000000000000000006",
    WBTC: "0x68f180fcce6836688e9084f035309e29bf0a2095",
  },
  8453: {
    USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  43114: {
    USDC: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    USDT: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    DAI: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
    WETH: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    WBTC: "0x50b7545627a5162f82a992c33b87adc75187b218",
  },
  // zkSync Era
  324: {
    USDC: "0x3355df6d4c9c3035724fd0e3914de96a5a83aaf4",
    WETH: "0x5aea5775959fbc2557cc8789bc1bf90a239d9a91",
  },
  // Scroll
  534352: {
    WETH: "0x5300000000000000000000000000000000000004",
  },
};
