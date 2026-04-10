import type { Chain } from "viem";

import { ICON_MANIFEST } from "@/lib/generated/icon-manifest";
import {
  LIQUID_GLASS_LOGOS,
  getLiquidGlassLogoByChainId,
} from "@/lib/liquid-glass-logos";

const DEFAULT_CHAIN_ICON = LIQUID_GLASS_LOGOS.ethereum;

const CHAIN_ICON_BY_ID: Record<number, string> = {
  1: LIQUID_GLASS_LOGOS.ethereum,
  5: LIQUID_GLASS_LOGOS.ethereum,
  10: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/optimism.svg",
  56: LIQUID_GLASS_LOGOS.bnb,
  57: LIQUID_GLASS_LOGOS.bnb,
  97: LIQUID_GLASS_LOGOS.bnb,
  101: LIQUID_GLASS_LOGOS.solana,
  100: "/icons/chain-icons/gnosis.svg",
  110: "/icons/chain-icons/cake.svg",
  122: "/icons/chain-icons/fuse.svg",
  130: "/icons/chain-icons/unichain.svg",
  137: "/icons/chain-icons/polygon.svg",
  146: "/icons/chain-icons/sonic.svg",
  204: "/icons/chain-icons/opbnb.svg",
  288: "/icons/chain-icons/bob.svg",
  324: "/icons/chain-icons/zksync.svg",
  360: "/icons/chain-icons/scroll.svg",
  420: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/optimism.svg",
  480: "/icons/chain-icons/worldchain.svg",
  59144:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/linea.svg",
  7000: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/ethereum.svg",
  7777777: "/icons/chain-icons/zora.svg",
  80094: "/icons/chain-icons/bera.svg",
  81457:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/blast.svg",
  8453: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/base.svg",
  998: LIQUID_GLASS_LOGOS.hyperliquid,
  999: LIQUID_GLASS_LOGOS.hyperliquid,
  999999: LIQUID_GLASS_LOGOS.solana,
  1329: "/icons/chain-icons/sei.svg",
  1514: "/icons/chain-icons/story.svg",
  1625: "/icons/chain-icons/gravity.svg",
  33139: "/icons/chain-icons/ape.svg",
  42220:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/celo.svg",
  42161:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/arbitrum.svg",
  42170:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/arbitrum.svg",
  43113:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/avalanche.svg",
  43114:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/avalanche.svg",
  5000: "/icons/chain-icons/mantle.svg",
  5001: "/icons/chain-icons/mantle.svg",
  5002: "/icons/chain-icons/mantle.svg",
  50104: "/icons/chain-icons/sophon.svg",
};

const CHAIN_ICON_ALIASES: Record<string, string> = {
  ethereum: LIQUID_GLASS_LOGOS.ethereum,
  ether: LIQUID_GLASS_LOGOS.ethereum,
  hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
  "hyper liquid": LIQUID_GLASS_LOGOS.hyperliquid,
  optimism:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/optimism.svg",
  "optimistic ethereum":
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/optimism.svg",
  arbitrum:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/arbitrum.svg",
  "arbitrum one":
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/arbitrum.svg",
  base: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/base.svg",
  blast:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/blast.svg",
  berachain: "/icons/chain-icons/bera.svg",
  apechain: "/icons/chain-icons/ape.svg",
  "ape chain": "/icons/chain-icons/ape.svg",
  gnosis: "/icons/chain-icons/gnosis.svg",
  fuse: "/icons/chain-icons/fuse.svg",
  unichain: "/icons/chain-icons/unichain.svg",
  sonic: "/icons/chain-icons/sonic.svg",
  sei: "/icons/chain-icons/sei.svg",
  sophon: "/icons/chain-icons/sophon.svg",
  opbnb: "/icons/chain-icons/opbnb.svg",
  "op bnb": "/icons/chain-icons/opbnb.svg",
  zksync: "/icons/chain-icons/zksync.svg",
  zora: "/icons/chain-icons/zora.svg",
  linea:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/linea.svg",
  story: "/icons/chain-icons/story.svg",
  gravity: "/icons/chain-icons/gravity.svg",
  "gravity alpha": "/icons/chain-icons/gravity.svg",
  celo: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/celo.svg",
  avalanche:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/avalanche.svg",
  avax: "/icons/chain-icons/avax.svg",
  bnb: LIQUID_GLASS_LOGOS.bnb,
  bsc: LIQUID_GLASS_LOGOS.bnb,
  "bnb chain": LIQUID_GLASS_LOGOS.bnb,
  mantle: "/icons/chain-icons/mantle.svg",
  scroll: "/icons/chain-icons/scroll.svg",
  blasttestnet:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/blast.svg",
  worldchain: "/icons/chain-icons/worldchain.svg",
  aptos:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/aptos.svg",
  astar:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/astar.svg",
  fantom:
    "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/fantom.svg",
  kava: "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/chain-logos/kava.svg",
  solana: LIQUID_GLASS_LOGOS.solana,
};

const CHAIN_ICON_MANIFEST = ICON_MANIFEST["chain-icons"];

function slugifyIconName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getChainIconById(chainId: number | null | undefined): string {
  if (!chainId) {
    return DEFAULT_CHAIN_ICON;
  }
  return CHAIN_ICON_BY_ID[chainId] ?? getLiquidGlassLogoByChainId(chainId, DEFAULT_CHAIN_ICON);
}

export function getChainIconPath(chain: Chain | null | undefined): string {
  if (!chain) {
    return DEFAULT_CHAIN_ICON;
  }

  const mappedById = getChainIconById(chain.id);
  if (mappedById !== DEFAULT_CHAIN_ICON || chain.id === 1) {
    return mappedById;
  }

  const candidates: string[] = [];
  if (chain.name) {
    candidates.push(chain.name);
  }
  const chainWithNetwork = chain as Chain & { network?: string };
  if (
    typeof chainWithNetwork.network === "string" &&
    chainWithNetwork.network.length > 0
  ) {
    candidates.push(chainWithNetwork.network);
  }

  for (const candidate of candidates) {
    const trimmedCandidate = candidate.trim().toLowerCase();
    const aliasIcon = CHAIN_ICON_ALIASES[trimmedCandidate];
    if (aliasIcon) {
      return aliasIcon;
    }
    const slug = slugifyIconName(candidate);
    if (slug) {
      const manifestEntries = CHAIN_ICON_MANIFEST[slug];
      if (manifestEntries && manifestEntries.length > 0) {
        return manifestEntries[0];
      }
    }
  }

  return DEFAULT_CHAIN_ICON;
}

export { CHAIN_ICON_BY_ID, CHAIN_ICON_ALIASES, DEFAULT_CHAIN_ICON };
