import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest } from "@/server/moralis/client";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork, type SolanaNetwork } from "@/server/moralis/validation";
import type { UnifiedSolanaChain, UnifiedFungibleAsset, UnifiedNFTAsset, UnifiedTransaction } from "@/types/wallet-unified";

export type MoralisSolBalanceResponse = Record<string, UntypedJson>;
export type MoralisSolPortfolioResponse = Record<string, UntypedJson>;
export type MoralisSolSwapsResponse = Record<string, UntypedJson>;
export type MoralisSolNftsResponse = Record<string, UntypedJson>;

export function toUnifiedSolanaChain(network: SolanaNetwork): UnifiedSolanaChain {
  return { kind: "solana", network };
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/sol-balance?network=mainnet&address=...
export async function getSolanaBalance(params: { network?: SolanaNetwork | string | null; address: string }): Promise<MoralisSolBalanceResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisSolBalanceResponse>({
    api: "solana",
    path: `/account/${network}/${address}/balance`,
    cache: {
      ...MORALIS_CACHE.walletBalances,
      tags: [`wallet:${address}`, `sol:${network}`, "sol:balance"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/get-sol-portfolio?network=mainnet&address=...
export async function getSolanaPortfolio(params: {
  network?: SolanaNetwork | string | null;
  address: string;
  nftMetadata?: boolean;
  mediaItems?: boolean;
  excludeSpam?: boolean;
}): Promise<MoralisSolPortfolioResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);

  return moralisRequest<MoralisSolPortfolioResponse>({
    api: "solana",
    path: `/account/${network}/${address}/portfolio`,
    query: {
      nftMetadata: params.nftMetadata ?? false,
      mediaItems: params.mediaItems ?? false,
      excludeSpam: params.excludeSpam ?? true,
    },
    cache: {
      ...MORALIS_CACHE.walletBalances,
      tags: [`wallet:${address}`, `sol:${network}`, "sol:portfolio"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/get-wallet-swap-txs?network=mainnet&address=...
export async function getSolanaWalletSwapTxs(params: {
  network?: SolanaNetwork | string | null;
  address: string;
  limit?: number;
  cursor?: string | null;
  order?: "ASC" | "DESC";
  transactionTypes?: string[];
}): Promise<MoralisSolSwapsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisSolSwapsResponse>({
    api: "solana",
    path: `/account/${network}/${address}/swaps`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
      order: params.order ?? "DESC",
      transactionTypes: (params.transactionTypes ?? []).length ? (params.transactionTypes ?? []).join(",") : undefined,
    },
    cache: {
      ...MORALIS_CACHE.walletHistory,
      tags: [`wallet:${address}`, `sol:${network}`, "sol:swaps"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/solana/reference/get-wallet-nfts?network=mainnet&address=...
export async function getSolanaWalletNfts(params: {
  network?: SolanaNetwork | string | null;
  address: string;
  limit?: number;
  cursor?: string | null;
  nftMetadata?: boolean;
  mediaItems?: boolean;
  excludeSpam?: boolean;
  includeFungibleAssets?: boolean;
}): Promise<MoralisSolNftsResponse> {
  const network = normalizeSolanaNetwork(params.network ?? undefined);
  const address = normalizeSolanaAddress(params.address);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  return moralisRequest<MoralisSolNftsResponse>({
    api: "solana",
    path: `/account/${network}/${address}/nft`,
    query: {
      limit,
      cursor: params.cursor ?? undefined,
      nftMetadata: params.nftMetadata ?? false,
      mediaItems: params.mediaItems ?? false,
      excludeSpam: params.excludeSpam ?? true,
      includeFungibleAssets: params.includeFungibleAssets ?? false,
    },
    cache: {
      ...MORALIS_CACHE.walletNfts,
      tags: [`wallet:${address}`, `sol:${network}`, "sol:nfts"],
    },
  });
}

export function mapSolanaPortfolioToUnifiedAssets(payload: MoralisSolPortfolioResponse, chain: UnifiedSolanaChain): UnifiedFungibleAsset[] {
  const record = asRecord(payload);
  const items = (record?.tokens ?? record?.result ?? record?.assets) as UntypedJson;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const mint = toStringOrNull(raw?.mint ?? raw?.address)?.trim() ?? null;
    const symbol = toStringOrNull(raw?.symbol);
    const name = toStringOrNull(raw?.name);
    const decimals = toNumber(raw?.decimals);
    const balance = toStringOrNull(raw?.amount ?? raw?.balance) ?? "0";
    const balanceFormatted = toStringOrNull(raw?.amountFormatted ?? raw?.balanceFormatted ?? raw?.amount_formatted);
    const priceUsd = toNumber(raw?.priceUsd ?? raw?.usdPrice ?? raw?.price_usd);
    const valueUsd = toNumber(raw?.valueUsd ?? raw?.usdValue ?? raw?.value_usd);
    const logoUrl = toStringOrNull(raw?.logo ?? raw?.logoURI ?? raw?.image);
    const isSpam = typeof raw?.possibleSpam === "boolean" ? raw.possibleSpam : typeof raw?.possible_spam === "boolean" ? raw.possible_spam : null;
    const id = `${chain.kind}:${chain.network}:${mint ?? symbol ?? name ?? "token"}`;

    return {
      id,
      chain,
      kind: mint === "So11111111111111111111111111111111111111112" ? "native" : "token",
      address: mint,
      symbol,
      name,
      decimals: decimals != null ? Math.trunc(decimals) : null,
      balance,
      balanceFormatted,
      priceUsd,
      valueUsd,
      change24hPercent: null, // Not currently fetched for Solana in this adapter
      logoUrl,
      isSpam,
    } satisfies UnifiedFungibleAsset;
  });
}

export function mapSolanaNftsToUnified(payload: MoralisSolNftsResponse, chain: UnifiedSolanaChain): UnifiedNFTAsset[] {
  const record = asRecord(payload);
  const items = (record?.nfts ?? record?.result ?? record?.items ?? record?.assets) as UntypedJson;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const mint = toStringOrNull(raw?.mint ?? raw?.address);
    const name = toStringOrNull(raw?.name ?? raw?.metadata?.name);
    const collectionName = toStringOrNull(raw?.collection?.name ?? raw?.collectionName ?? raw?.metadata?.collection?.name);
    const description = toStringOrNull(raw?.description ?? raw?.metadata?.description);
    const imageUrl = toStringOrNull(raw?.image ?? raw?.imageUrl ?? raw?.metadata?.image);
    const animationUrl = toStringOrNull(raw?.animation_url ?? raw?.animationUrl ?? raw?.metadata?.animation_url);
    const amount = toStringOrNull(raw?.amount);
    const isSpam = typeof raw?.possibleSpam === "boolean" ? raw.possibleSpam : typeof raw?.possible_spam === "boolean" ? raw.possible_spam : null;
    const id = `${chain.kind}:${chain.network}:${mint ?? "unknown"}`;

    return {
      id,
      chain,
      collectionAddress: null,
      tokenId: null,
      mint,
      name,
      collectionName,
      description,
      imageUrl,
      animationUrl,
      amount,
      isSpam,
      raw: raw && typeof raw === "object" ? (raw as Record<string, UntypedJson>) : null,
    } satisfies UnifiedNFTAsset;
  });
}

export function mapSolanaSwapsToUnified(payload: MoralisSolSwapsResponse, owner: string, chain: UnifiedSolanaChain): UnifiedTransaction[] {
  const record = asRecord(payload);
  const items = (record?.result ?? record?.swaps ?? record?.items) as UntypedJson;
  if (!Array.isArray(items)) return [];

  const normalizedOwner = owner.trim().toLowerCase();

  return items.map((raw) => {
    const hash = toStringOrNull(raw?.signature ?? raw?.txHash ?? raw?.transactionHash) ?? "unknown";
    const timestamp = toStringOrNull(raw?.blockTime ?? raw?.timestamp ?? raw?.block_timestamp);
    const from = toStringOrNull(raw?.from ?? raw?.fromAddress);
    const to = toStringOrNull(raw?.to ?? raw?.toAddress);
    const fromLower = (from ?? "").toLowerCase();
    const toLower = (to ?? "").toLowerCase();
    const direction =
      fromLower && toLower && fromLower === normalizedOwner && toLower === normalizedOwner
        ? "self"
        : fromLower === normalizedOwner
          ? "out"
          : toLower === normalizedOwner
            ? "in"
            : "unknown";

    const summary = toStringOrNull(raw?.type ?? raw?.transactionType) ?? "swap";

    return {
      id: hash,
      chain,
      hash,
      timestamp,
      from,
      to,
      direction,
      category: "swap",
      summary,
      valueUsd: toNumber(raw?.valueUsd ?? raw?.usdValue),
      raw: raw && typeof raw === "object" ? (raw as Record<string, UntypedJson>) : null,
    } satisfies UnifiedTransaction;
  });
}
