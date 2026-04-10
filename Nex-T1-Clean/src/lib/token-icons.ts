import { ICON_MANIFEST, type IconCollection } from "@/lib/generated/icon-manifest";
import { getLiquidGlassLogo } from "@/lib/liquid-glass-logos";

const PLACEHOLDER_ICON_INTERNAL = "/placeholder-logo.svg";

export const PLACEHOLDER_ICON = PLACEHOLDER_ICON_INTERNAL;

export type IconKind = "token" | "network" | "wallet";

const ICON_COLLECTIONS: Record<IconKind, IconCollection[]> = {
  token: ["chain-icons", "web3-icons", "wallet-icons"],
  network: ["chain-icons", "web3-icons"],
  wallet: ["wallet-icons"],
};

const WEB3ICONS_REMOTE_SEGMENT: Record<IconKind, string> = {
  token: "tokens",
  network: "chains",
  wallet: "wallets",
};

const WEB3ICONS_CDN_BASE = "https://cdn.jsdelivr.net/npm/@web3icons/assets";

const TOKEN_ALIAS_MAP: Record<string, string[]> = {
  btc: ["bitcoin", "btc", "bitcoin-legacy"],
  eth: ["ethereum", "eth"],
  wbtc: ["wbtc", "wrapped-bitcoin"],
  usdc: ["usd-coin", "usdc", "usdc.e"],
  usdt: ["tether", "usdt"],
  dai: ["dai"],
  sol: ["solana", "sol"],
  matic: ["polygon", "matic"],
  op: ["optimism", "op"],
  arb: ["arbitrum", "arb"],
  avax: ["avalanche", "avax"],
  bnb: ["bnb", "binance-coin", "binance"],
  base: ["base"],
  sui: ["sui"],
  ton: ["ton", "toncoin"],
  line: ["linea"],
  zksync: ["zksync", "zk-sync", "era"],
  apt: ["aptos", "apt"],
  rune: ["thorchain", "rune"],
  blast: ["blast"],
  doge: ["doge", "dogecoin"],
  hype: ["hyperliquid", "hyperliquid-evm", "hyperevm", "hype"],
  link: ["chainlink", "link"],
  trx: ["tron", "trx"],
  unichain: ["unichain"],
  xrp: ["xrp", "ripple"],
  ada: ["cardano", "ada"],
};

export const normalizeTokenSlug = (value?: string | null): string | null => {
  if (!value) return null;

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const expandSlugAliases = (slug: string, kind: IconKind): string[] => {
  const base = slug.toLowerCase();
  const variations = new Set<string>();

  const aliasList = TOKEN_ALIAS_MAP[base];
  if (aliasList) {
    for (const alias of aliasList) {
      variations.add(alias.toLowerCase());
    }
  }

  variations.add(base);

  if (kind === "network") {
    variations.add(`${base}-network`);
  }
  if (kind === "wallet") {
    variations.add(`${base}-wallet`);
  }

  return Array.from(variations);
};

const pushCandidate = (list: string[], seen: Set<string>, candidate: string | null | undefined) => {
  if (!candidate || seen.has(candidate)) {
    return;
  }
  seen.add(candidate);
  list.push(candidate);
};

type IconCandidateOptions = {
  symbol?: string | null;
  name?: string | null;
  iconOverride?: string | null;
  kind?: IconKind;
};

export const getIconCandidates = (options: IconCandidateOptions): string[] => {
  const { symbol, name, iconOverride, kind = "token" } = options;
  const candidates: string[] = [];
  const seen = new Set<string>();

  if (iconOverride) {
    pushCandidate(candidates, seen, iconOverride);
  }

  const slugs = new Set<string>();
  const normalizedSymbol = normalizeTokenSlug(symbol?.replace(/[^a-zA-Z0-9]/g, ""));
  const normalizedName = normalizeTokenSlug(name);

  if (normalizedSymbol) {
    slugs.add(normalizedSymbol);
  }
  if (normalizedName) {
    slugs.add(normalizedName);
  }

  const aliasQueue: string[] = [];
  const aliasSeen = new Set<string>();

  for (const slug of Array.from(slugs)) {
    for (const alias of expandSlugAliases(slug, kind)) {
      const trimmed = alias.trim().toLowerCase();
      if (!trimmed || aliasSeen.has(trimmed)) {
        continue;
      }
      if (/^[0-9]+$/.test(trimmed)) {
        continue;
      }
      aliasSeen.add(trimmed);
      aliasQueue.push(trimmed);
    }
  }

  for (const alias of aliasQueue) {
    const normalizedAlias = normalizeTokenSlug(alias);
    if (!normalizedAlias) {
      continue;
    }
    for (const collection of ICON_COLLECTIONS[kind]) {
      const manifestEntries = ICON_MANIFEST[collection]?.[normalizedAlias];
      if (!manifestEntries) {
        continue;
      }
      for (const entry of manifestEntries) {
        pushCandidate(candidates, seen, entry);
      }
    }
  }

  for (const alias of aliasQueue) {
    const remoteSlug = normalizeTokenSlug(alias);
    if (!remoteSlug) {
      continue;
    }
    const remoteSegment = WEB3ICONS_REMOTE_SEGMENT[kind];
    pushCandidate(
      candidates,
      seen,
      `${WEB3ICONS_CDN_BASE}/${remoteSegment}/${remoteSlug}.svg`,
    );
  }

  pushCandidate(candidates, seen, PLACEHOLDER_ICON_INTERNAL);

  return candidates;
};

export const getPrimaryIcon = (options: IconCandidateOptions): string => {
  const liquidGlassLogo = getLiquidGlassLogo(
    options.symbol ?? options.name ?? null,
    null,
  );
  if (liquidGlassLogo) {
    return liquidGlassLogo;
  }

  const [first] = getIconCandidates(options);

  return first ?? PLACEHOLDER_ICON_INTERNAL;
};
