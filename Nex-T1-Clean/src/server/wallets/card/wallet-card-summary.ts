import "server-only";

import { getMoralisTokenPrice } from "@/server/market/moralis";
import {
  getEvmNativeBalance,
  getEvmWalletNfts,
  getEvmWalletTokenBalancesPrice,
  type MoralisEvmTokenBalancePrice,
} from "@/server/moralis/evm/wallet";
import {
  getSolanaBalance,
  getSolanaPortfolio,
  getSolanaWalletNfts,
  mapSolanaNftsToUnified,
  mapSolanaPortfolioToUnifiedAssets,
} from "@/server/moralis/solana/wallet";
import { resolveWalletChainPresentation } from "@/lib/wallets/chain-presentation";
import type {
  WalletCardHolding,
  WalletCardSummaryPayload,
} from "@/lib/wallets/wallet-card-holdings";

import { logger } from "@/lib/logger";

type GetWalletCardSummaryParams = {
  address: string;
  platform: "evm" | "solana";
  chainId?: string | number | null;
  network?: "mainnet" | "devnet" | null;
};

const WRAPPED_NATIVE_TOKEN_BY_CHAIN_ID: Record<number, string> = {
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  10: "0x4200000000000000000000000000000000000006",
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  8453: "0x4200000000000000000000000000000000000006",
  84532: "0x4200000000000000000000000000000000000006",
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
};

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapEvmTokenHolding(token: MoralisEvmTokenBalancePrice): WalletCardHolding | null {
  const balance = toFiniteNumber(token.balance_formatted ?? token.balance);
  const valueUsd = toFiniteNumber(token.usd_value);
  const label = toNonEmptyString(token.symbol) ?? toNonEmptyString(token.name) ?? "Token";

  if (balance <= 0 && valueUsd <= 0) {
    return null;
  }

  return {
    id: toNonEmptyString(token.token_address) ?? `evm-token:${label.toLowerCase()}`,
    kind: token.native_token ? "native" : "token",
    label,
    symbol: toNonEmptyString(token.symbol),
    valueUsd,
    quantity: balance,
    logoURI: toNonEmptyString(token.logo) ?? toNonEmptyString(token.thumbnail),
  };
}

async function buildEvmWalletCardSummary(
  address: string,
  chainId?: string | number | null,
): Promise<WalletCardSummaryPayload> {
  const presentation = resolveWalletChainPresentation({
    platform: "evm",
    chainId,
  });

  const [tokenBalances, nativeBalance, nftResponse] = await Promise.all([
    getEvmWalletTokenBalancesPrice({
      address,
      chain: presentation.chainHex ?? undefined,
    }),
    getEvmNativeBalance({
      address,
      chain: presentation.chainHex ?? undefined,
    }),
    getEvmWalletNfts({
      address,
      chain: presentation.chainHex ?? undefined,
      limit: 100,
      normalizeMetadata: true,
      mediaItems: true,
    }),
  ]);

  const holdings = tokenBalances
    .filter((token) => !token.native_token)
    .map(mapEvmTokenHolding)
    .filter((holding): holding is WalletCardHolding => holding != null);

  const nativeBalanceFormatted = toFiniteNumber(
    nativeBalance.balance_formatted ?? nativeBalance.balance,
  );

  if (nativeBalanceFormatted > 0 && presentation.chainId != null) {
    const wrappedNativeAddress = WRAPPED_NATIVE_TOKEN_BY_CHAIN_ID[presentation.chainId];
    const nativePrice = wrappedNativeAddress
      ? await getMoralisTokenPrice(wrappedNativeAddress, String(presentation.chainId)).catch(
          (error) => {
            logger.warn("[wallet-card-summary] Failed to fetch native token price", {
              address,
              chainId: presentation.chainId,
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          },
        )
      : null;

    holdings.unshift({
      id: `native:${presentation.chainId}:${address.toLowerCase()}`,
      kind: "native",
      label: presentation.nativeSymbol,
      symbol: presentation.nativeSymbol,
      valueUsd: nativeBalanceFormatted * toFiniteNumber(nativePrice?.priceUsd),
      quantity: nativeBalanceFormatted,
      logoURI: nativePrice?.logo ?? presentation.chainIcon,
    });
  }

  if (nftResponse.items.length > 0) {
    holdings.push({
      id: `nfts:${presentation.chainId ?? "evm"}:${address.toLowerCase()}`,
      kind: "nft",
      label: "NFTs",
      symbol: null,
      valueUsd: 0,
      quantity: nftResponse.items.length,
      logoURI:
        toNonEmptyString(nftResponse.items[0]?.media?.original_media_url) ??
        presentation.chainIcon,
    });
  }

  return {
    address,
    platform: "evm",
    chainId: presentation.chainId != null ? String(presentation.chainId) : null,
    network: "mainnet",
    totalValueUsd: holdings.reduce((sum, holding) => sum + toFiniteNumber(holding.valueUsd), 0),
    tokenCount: holdings.filter((holding) => holding.kind !== "nft").length,
    nftCount: nftResponse.items.length,
    holdings,
  };
}

async function buildSolanaWalletCardSummary(
  address: string,
  network?: "mainnet" | "devnet" | null,
): Promise<WalletCardSummaryPayload> {
  const presentation = resolveWalletChainPresentation({
    platform: "solana",
    network,
  });
  const normalizedNetwork = presentation.moralisNetwork ?? "mainnet";

  const [portfolio, balance, nftResponse] = await Promise.all([
    getSolanaPortfolio({
      address,
      network: normalizedNetwork,
      nftMetadata: false,
      mediaItems: false,
    }),
    getSolanaBalance({
      address,
      network: normalizedNetwork,
    }),
    getSolanaWalletNfts({
      address,
      network: normalizedNetwork,
      limit: 100,
      nftMetadata: false,
      mediaItems: true,
    }),
  ]);

  const portfolioAssets = mapSolanaPortfolioToUnifiedAssets(portfolio, {
    kind: "solana",
    network: normalizedNetwork,
  });

  const holdings = portfolioAssets.reduce<WalletCardHolding[]>(
    (acc, asset) => {
      const balanceFormatted = toFiniteNumber(asset.balanceFormatted ?? asset.balance);
      const valueUsd = toFiniteNumber(asset.valueUsd);
      if (balanceFormatted <= 0 && valueUsd <= 0) {
        return acc;
      }

      acc.push({
        id: asset.id,
        kind: asset.kind === "native" ? "native" : "token",
        label: asset.symbol ?? asset.name ?? "Token",
        symbol: asset.symbol,
        valueUsd,
        quantity: balanceFormatted,
        logoURI: asset.logoUrl,
      });

      return acc;
    },
    [],
  );

  const hasNativeHolding = holdings.some((holding) => holding.kind === "native");
  const balanceRaw = toFiniteNumber((balance as { balance?: unknown }).balance);

  if (!hasNativeHolding && balanceRaw > 0) {
    const quantity = balanceRaw / 1_000_000_000;
    const referencePrice =
      holdings.find((holding) => holding.symbol === "SOL")?.valueUsd &&
      holdings.find((holding) => holding.symbol === "SOL")?.quantity
        ? toFiniteNumber(
            holdings.find((holding) => holding.symbol === "SOL")?.valueUsd,
          ) /
          Math.max(
            toFiniteNumber(
              holdings.find((holding) => holding.symbol === "SOL")?.quantity,
            ),
            Number.EPSILON,
          )
        : 0;

    holdings.unshift({
      id: `solana-native:${address.toLowerCase()}`,
      kind: "native",
      label: "SOL",
      symbol: "SOL",
      valueUsd: quantity * referencePrice,
      quantity,
      logoURI: presentation.chainIcon,
    });
  }

  const nftAssets = mapSolanaNftsToUnified(nftResponse, {
    kind: "solana",
    network: normalizedNetwork,
  });
  if (nftAssets.length > 0) {
    holdings.push({
      id: `nfts:solana:${address.toLowerCase()}`,
      kind: "nft",
      label: "NFTs",
      symbol: null,
      valueUsd: 0,
      quantity: nftAssets.length,
      logoURI: nftAssets[0]?.imageUrl ?? presentation.chainIcon,
    });
  }

  return {
    address,
    platform: "solana",
    chainId: null,
    network: normalizedNetwork,
    totalValueUsd: holdings.reduce((sum, holding) => sum + toFiniteNumber(holding.valueUsd), 0),
    tokenCount: holdings.filter((holding) => holding.kind !== "nft").length,
    nftCount: Math.max(0, Math.trunc(holdings.find((holding) => holding.kind === "nft")?.quantity ?? 0)),
    holdings,
  };
}

export async function getWalletCardSummary(
  params: GetWalletCardSummaryParams,
): Promise<WalletCardSummaryPayload> {
  if (params.platform === "solana") {
    return buildSolanaWalletCardSummary(params.address, params.network);
  }

  return buildEvmWalletCardSummary(params.address, params.chainId);
}
