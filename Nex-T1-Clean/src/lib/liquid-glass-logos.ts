export const LIQUID_GLASS_LOGOS = {
  bitcoin: "/assets/chains-liquid-glass/Bitcoin.png",
  bnb: "/assets/chains-liquid-glass/BNB.png",
  cardano: "/assets/chains-liquid-glass/Cardano.png",
  chainlink: "/assets/chains-liquid-glass/Chainlink.png",
  doge: "/assets/chains-liquid-glass/Doge.png",
  ethereum: "/assets/chains-liquid-glass/Ethereum.png",
  hyperliquid: "/assets/chains-liquid-glass/Hyperliquid.png",
  ripple: "/assets/chains-liquid-glass/Ripple.png",
  solana: "/assets/chains-liquid-glass/Solana.png",
  tether: "/assets/chains-liquid-glass/Tether.png",
  tron: "/assets/chains-liquid-glass/Tron.png",
  usdc: "/assets/chains-liquid-glass/USDC.png",
} as const;

const LIQUID_GLASS_LOGO_ALIASES: Record<string, string> = {
  ada: LIQUID_GLASS_LOGOS.cardano,
  bnb: LIQUID_GLASS_LOGOS.bnb,
  "bnb chain": LIQUID_GLASS_LOGOS.bnb,
  "bnb smart chain": LIQUID_GLASS_LOGOS.bnb,
  bitcoin: LIQUID_GLASS_LOGOS.bitcoin,
  btc: LIQUID_GLASS_LOGOS.bitcoin,
  bsc: LIQUID_GLASS_LOGOS.bnb,
  cardano: LIQUID_GLASS_LOGOS.cardano,
  chainlink: LIQUID_GLASS_LOGOS.chainlink,
  doge: LIQUID_GLASS_LOGOS.doge,
  dogecoin: LIQUID_GLASS_LOGOS.doge,
  eth: LIQUID_GLASS_LOGOS.ethereum,
  ether: LIQUID_GLASS_LOGOS.ethereum,
  ethereum: LIQUID_GLASS_LOGOS.ethereum,
  hype: LIQUID_GLASS_LOGOS.hyperliquid,
  hyperevm: LIQUID_GLASS_LOGOS.hyperliquid,
  hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
  "hyperliquid evm": LIQUID_GLASS_LOGOS.hyperliquid,
  link: LIQUID_GLASS_LOGOS.chainlink,
  ripple: LIQUID_GLASS_LOGOS.ripple,
  sol: LIQUID_GLASS_LOGOS.solana,
  solana: LIQUID_GLASS_LOGOS.solana,
  tether: LIQUID_GLASS_LOGOS.tether,
  tron: LIQUID_GLASS_LOGOS.tron,
  trx: LIQUID_GLASS_LOGOS.tron,
  usdc: LIQUID_GLASS_LOGOS.usdc,
  usdt: LIQUID_GLASS_LOGOS.tether,
  weth: LIQUID_GLASS_LOGOS.ethereum,
  wsol: LIQUID_GLASS_LOGOS.solana,
  xrp: LIQUID_GLASS_LOGOS.ripple,
};

const LIQUID_GLASS_CHAIN_ID_MAP: Record<number, string> = {
  1: LIQUID_GLASS_LOGOS.ethereum,
  5: LIQUID_GLASS_LOGOS.ethereum,
  56: LIQUID_GLASS_LOGOS.bnb,
  57: LIQUID_GLASS_LOGOS.bnb,
  97: LIQUID_GLASS_LOGOS.bnb,
  101: LIQUID_GLASS_LOGOS.solana,
  998: LIQUID_GLASS_LOGOS.hyperliquid,
  999: LIQUID_GLASS_LOGOS.hyperliquid,
  999999: LIQUID_GLASS_LOGOS.solana,
  900001: LIQUID_GLASS_LOGOS.solana,
  900002: LIQUID_GLASS_LOGOS.solana,
  11155111: LIQUID_GLASS_LOGOS.ethereum,
};

function normalizeLiquidGlassKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function getLiquidGlassLogo(
  value: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!value) {
    return fallback;
  }

  const normalized = normalizeLiquidGlassKey(value);
  return LIQUID_GLASS_LOGO_ALIASES[normalized] ?? fallback;
}

export function getLiquidGlassLogoByChainId(
  chainId: number | null | undefined,
  fallback: string = LIQUID_GLASS_LOGOS.ethereum,
): string {
  if (!chainId) {
    return fallback;
  }

  return LIQUID_GLASS_CHAIN_ID_MAP[chainId] ?? fallback;
}
