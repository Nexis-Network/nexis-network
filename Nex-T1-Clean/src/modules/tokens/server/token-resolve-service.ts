import "server-only";

import { getTokenInfo, getTokenLogoUrl } from "@/lib/assets/repository";
import { getChainInfo } from "@/modules/tokens/chains";
import type { TokenAssetInfo, TokenRegistrySnapshot } from "@/modules/tokens/types";
import { buildTokenAssetId } from "@/modules/tokens/utils/asset-id";
import { buildTokenAssetInfo } from "@/modules/tokens/server/metadata-enrichment-service";
import { getTokenRegistrySnapshot } from "@/modules/tokens/server/registry-service";
import {
  buildTokenResolveCacheKey,
  rememberResolvedToken,
} from "@/modules/tokens/server/token-resolve-cache";
import {
  getEvmErc20Metadata,
  pickEvmTokenDecimals,
  pickEvmTokenLogo,
} from "@/server/moralis/evm/token";
import { getPumpfunTokenMetadata } from "@/server/moralis/solana/pumpfun";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmAddress, normalizeSolanaAddress } from "@/server/moralis/validation";
import { CoingeckoClient } from "@/server/services/coingecko/coingecko-client";

type ExternalTokenMetadata = {
  decimals: number;
  logoURI?: string;
  name: string;
  symbol: string;
};

type ResolveTokenDeps = {
  getSnapshot: () => Promise<TokenRegistrySnapshot>;
  resolveExternal: (chainId: number, address: string) => Promise<ExternalTokenMetadata | null>;
};

const COINGECKO_NETWORK_BY_CHAIN: Record<number, string> = {
  1: "ethereum",
  10: "optimism",
  56: "binance-smart-chain",
  137: "polygon-pos",
  324: "zksync",
  8453: "base",
  42161: "arbitrum-one",
  43114: "avalanche",
  81457: "blast",
  999999: "solana",
};

const defaultDeps: ResolveTokenDeps = {
  getSnapshot: () =>
    getTokenRegistrySnapshot({
      includeUnsupported: true,
      includeBroken: true,
      includeBanned: true,
    }),
  resolveExternal: resolveExternalTokenMetadata,
};

export class TokenResolveError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_address" | "invalid_chain",
  ) {
    super(message);
    this.name = "TokenResolveError";
  }
}

export async function resolveTokenByAddress(
  input: { address: string; chainId: number },
  deps: ResolveTokenDeps = defaultDeps,
): Promise<TokenAssetInfo | null> {
  const normalizedAddress = normalizeRequestedAddress(input.chainId, input.address);
  const cacheKey = buildTokenResolveCacheKey(input.chainId, normalizedAddress);

  return rememberResolvedToken(cacheKey, () => resolveTokenByAddressUncached(input, deps));
}

export async function resolveTokenByAddressUncached(
  input: { address: string; chainId: number },
  deps: ResolveTokenDeps = defaultDeps,
): Promise<TokenAssetInfo | null> {
  const normalizedAddress = normalizeRequestedAddress(input.chainId, input.address);
  const snapshot = await deps.getSnapshot();
  const assetId = buildTokenAssetId({ chainId: input.chainId, address: normalizedAddress });
  const registryToken = snapshot.tokens.find((token) => token.assetId === assetId);

  if (registryToken) {
    return registryToken;
  }

  const metadata = await deps.resolveExternal(input.chainId, normalizedAddress);
  if (!metadata) {
    return null;
  }

  return buildTokenAssetInfo({
    chainId: input.chainId,
    address: normalizedAddress,
    symbol: metadata.symbol.toUpperCase(),
    name: metadata.name,
    decimals: metadata.decimals,
    logoURI: metadata.logoURI,
    supportStatus: "unsupported",
    safetyStatus: "non_default",
    sources: ["external", "imported"],
    tags: ["imported"],
  });
}

function normalizeRequestedAddress(chainId: number, address: string): string {
  const chain = getChainInfo(chainId);
  if (!chain) {
    throw new TokenResolveError("Unsupported token chain", "invalid_chain");
  }

  const trimmed = address.trim();
  if (!trimmed) {
    throw new TokenResolveError("Token address is required", "invalid_address");
  }

  try {
    return chain.platform === "evm"
      ? normalizeEvmAddress(trimmed).toLowerCase()
      : normalizeSolanaAddress(trimmed);
  } catch {
    throw new TokenResolveError("Invalid token address for the selected chain", "invalid_address");
  }
}

async function resolveExternalTokenMetadata(
  chainId: number,
  address: string,
): Promise<ExternalTokenMetadata | null> {
  return (
    (await resolveRepositoryTokenMetadata(chainId, address)) ??
    (await resolveMoralisTokenMetadata(chainId, address)) ??
    (await resolveCoingeckoTokenMetadata(chainId, address))
  );
}

async function resolveRepositoryTokenMetadata(
  chainId: number,
  address: string,
): Promise<ExternalTokenMetadata | null> {
  const chain = getChainInfo(chainId);
  if (!chain) {
    return null;
  }

  const info = await getTokenInfo(chain.slug, address);
  if (!info?.name || !info.symbol || typeof info.decimals !== "number") {
    return null;
  }

  return {
    name: info.name,
    symbol: info.symbol,
    decimals: info.decimals,
    logoURI: getTokenLogoUrl(chain.slug, address),
  };
}

async function resolveMoralisTokenMetadata(
  chainId: number,
  address: string,
): Promise<ExternalTokenMetadata | null> {
  const chain = getChainInfo(chainId);
  if (!chain) {
    return null;
  }

  if (chain.platform === "evm") {
    const [meta] = await getEvmErc20Metadata({ chain: chainId, addresses: [address] }).catch(
      () => [],
    );
    const decimals = pickEvmTokenDecimals(meta);
    if (!meta?.name || !meta.symbol || decimals === null) {
      return null;
    }

    return {
      name: meta.name,
      symbol: meta.symbol,
      decimals,
      logoURI: pickEvmTokenLogo(meta) ?? undefined,
    };
  }

  const meta = asRecord(await getPumpfunTokenMetadata({ network: "mainnet", address }).catch(() => null));
  const name = toStringOrNull(meta?.name ?? meta?.token_name);
  const symbol = toStringOrNull(meta?.symbol ?? meta?.token_symbol);
  const decimals = toNumber(meta?.decimals ?? meta?.token_decimals);

  if (!name || !symbol || decimals === null) {
    return null;
  }

  return {
    name,
    symbol,
    decimals,
    logoURI: toStringOrNull(meta?.image ?? meta?.imageUrl ?? meta?.logo) ?? undefined,
  };
}

async function resolveCoingeckoTokenMetadata(
  chainId: number,
  address: string,
): Promise<ExternalTokenMetadata | null> {
  const networkId = COINGECKO_NETWORK_BY_CHAIN[chainId];
  if (!networkId) {
    return null;
  }

  const info = await CoingeckoClient.getTokenInfoByAddress(networkId, address).catch(() => null);
  const decimals =
    info?.detail_platforms?.[info.asset_platform_id]?.decimal_place ??
    info?.detail_platforms?.[networkId]?.decimal_place ??
    null;

  if (!info?.name || !info.symbol || typeof decimals !== "number") {
    return null;
  }

  return {
    name: info.name,
    symbol: info.symbol,
    decimals,
    logoURI: info.image?.small ?? info.image?.thumb ?? info.image?.large,
  };
}
