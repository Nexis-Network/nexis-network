import { resolveExplorerAddressUrlForChain } from "@/lib/networks/capabilities";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const COUNT_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const COLUMN_COUNT = 7;

export const CHAIN_ICON_MAP: Record<string, string> = {
  arbitrum: "/icons/chain-icons/arbitrum.svg",
  "arbitrum one": "/icons/chain-icons/arbitrum.svg",
  avax: "/icons/chain-icons/avax.svg",
  avalanche: "/icons/chain-icons/avalanche.svg",
  base: "/icons/chain-icons/base.svg",
  bitcoin: LIQUID_GLASS_LOGOS.bitcoin,
  btc: LIQUID_GLASS_LOGOS.bitcoin,
  ethereum: LIQUID_GLASS_LOGOS.ethereum,
  eth: LIQUID_GLASS_LOGOS.ethereum,
  hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
  "hyperliquid evm": LIQUID_GLASS_LOGOS.hyperliquid,
  hyperevm: LIQUID_GLASS_LOGOS.hyperliquid,
  optimism: "/icons/chain-icons/optimism.svg",
  "optimistic ethereum": "/icons/chain-icons/optimism.svg",
  polygon: "/icons/chain-icons/polygon.svg",
  matic: "/icons/chain-icons/polygon.svg",
  unichain: "/icons/chain-icons/unichain.svg",
  solana: LIQUID_GLASS_LOGOS.solana,
  sol: LIQUID_GLASS_LOGOS.solana,
  bnb: LIQUID_GLASS_LOGOS.bnb,
  "bnb chain": LIQUID_GLASS_LOGOS.bnb,
  "bnb smart chain": LIQUID_GLASS_LOGOS.bnb,
  chainlink: LIQUID_GLASS_LOGOS.chainlink,
  link: LIQUID_GLASS_LOGOS.chainlink,
  cardano: LIQUID_GLASS_LOGOS.cardano,
  ada: LIQUID_GLASS_LOGOS.cardano,
  doge: LIQUID_GLASS_LOGOS.doge,
  dogecoin: LIQUID_GLASS_LOGOS.doge,
  ripple: LIQUID_GLASS_LOGOS.ripple,
  xrp: LIQUID_GLASS_LOGOS.ripple,
  tron: LIQUID_GLASS_LOGOS.tron,
  trx: LIQUID_GLASS_LOGOS.tron,
  usdc: LIQUID_GLASS_LOGOS.usdc,
  usdt: LIQUID_GLASS_LOGOS.tether,
  linea: "/icons/chain-icons/linea.svg",
  gnosis: "/icons/chain-icons/gnosis.svg",
  scroll: "/icons/chain-icons/scroll.svg",
  zksync: "/icons/chain-icons/zksync.svg",
  zora: "/icons/chain-icons/zora.svg",
  ton: "/icons/chain-icons/ton.svg",
  sui: "/icons/chain-icons/sui.svg",
  monad: "/icons/chain-icons/monad.svg",
};

export function formatCount(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return COUNT_FORMAT.format(Math.max(0, Math.floor(value)));
}

export function getPercentDisplay(percent: number | null): { text: string; colorClass: string } {
  if (percent === null || !Number.isFinite(percent)) {
    return { text: "—", colorClass: "text-muted-foreground" };
  }
  const text = `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
  if (percent > 0) return { text, colorClass: "text-[#8eb94f]" };
  if (percent < 0) return { text, colorClass: "text-rose-500" };
  return { text, colorClass: "text-muted-foreground" };
}

export function getPnlTone(value: number | null) {
  if (value === null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-[#8eb94f]" : "text-rose-500";
}

export function formatSignedCurrency(value: number | null) {
  if (value === null) return "—";
  const abs = Math.abs(value);
  const formatted = CURRENCY_FORMAT.format(abs);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return CURRENCY_FORMAT.format(value);
}

export function truncateAddress(address: string, prefix = 6, suffix = 5) {
  if (address.length <= prefix + suffix + 3) return address;
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
}

export function resolveChainIcon(name: string, icon?: string | null): string | null {
  const normalized = normalizeIconPath(icon);
  if (normalized) return normalized;
  const key = name.trim().toLowerCase();
  if (CHAIN_ICON_MAP[key]) return CHAIN_ICON_MAP[key];
  const slug = key.replace(/[^a-z0-9]+/g, "-");
  if (CHAIN_ICON_MAP[slug]) return CHAIN_ICON_MAP[slug];
  return `/icons/chain-icons/${slug}.svg`;
}

export function normalizeIconPath(icon: UntypedJson): string | null {
  if (!icon || typeof icon !== "string") return null;
  const trimmed = icon.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("public/")) return `/${trimmed.slice(7)}`;
  return `/${trimmed.replace(/^\/+/, "")}`;
}

export function resolveExplorerAddressUrl(chainId: number, address: string): string | null {
  return resolveExplorerAddressUrlForChain(chainId, address);
}
