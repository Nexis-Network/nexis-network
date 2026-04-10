import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { moralisRequest, MoralisError } from "@/server/moralis/client";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmAddress, normalizeEvmChain } from "@/server/moralis/validation";
import type { UnifiedEvmChain, UnifiedFungibleAsset, UnifiedNFTAsset, UnifiedPnL, UnifiedTransaction } from "@/types/wallet-unified";

export type MoralisEvmTokenApproval = {
  token_address?: string;
  token_symbol?: string;
  token_name?: string;
  token_logo?: string;
  token_decimals?: string;
  spender_address?: string;
  spender_label?: string; // e.g. "Uniswap V3 Router" if metadata enriched
  value?: string; // "0" or specific amount, or huge for infinite
  value_formatted?: string;
};

// MoralisPaginated export for use in token.ts
export type MoralisPaginated<T> = {
  cursor?: string | null;
  page?: number;
  page_size?: number;
  result?: T[];
};

export type MoralisEvmActiveChainsResponse = {
  address: string;
  active_chains: Array<{
    chain: string;
    chain_id: `0x${string}`;
    first_transaction?: { block_timestamp?: string | null; block_number?: string | number | null } | null;
    last_transaction?: { block_timestamp?: string | null; block_number?: string | number | null } | null;
  }>;
};

export type MoralisEvmTokenBalancePrice = {
  token_address?: string;
  symbol?: string;
  name?: string;
  decimals?: number | string;
  logo?: string;
  thumbnail?: string;
  balance?: string;
  balance_formatted?: string;
  possible_spam?: boolean;
  verified_contract?: boolean;
  usd_price?: string | number | null;
  usd_price_24hr_percent_change?: string | number | null;
  usd_price_7d_percent_change?: string | number | null;
  usd_value?: string | number | null;
  native_token?: boolean;
};

export type MoralisEvmNftOwner = {
  token_address?: string;
  token_id?: string;
  amount?: string;
  name?: string;
  symbol?: string;
  metadata?: string | null;
  normalized_metadata?: Record<string, UntypedJson> | null;
  media?: {
    original_media_url?: string | null;
    mimetype?: string | null;
  } | null;
  possible_spam?: boolean;
};

export type MoralisEvmWalletHistoryItem = Record<string, UntypedJson> & {
  hash?: string;
  transaction_hash?: string;
  from_address?: string;
  to_address?: string;
  value?: string;
  block_timestamp?: string;
  block_number?: string | number;
  decoded?: Record<string, UntypedJson> | null;
};

export type MoralisEvmProfitabilitySummary = Record<string, UntypedJson>;

export async function getEvmWalletActiveChains(
  address: string,
  params?: { chains?: Array<string | number> },
): Promise<MoralisEvmActiveChainsResponse> {
  const normalized = normalizeEvmAddress(address);
  const chains = (params?.chains ?? []).map((chain) => normalizeEvmChain(chain));

  return moralisRequest<MoralisEvmActiveChainsResponse>({
    api: "evm",
    path: `/wallets/${normalized}/chains`,
    query: chains.length ? { chains } : undefined,
    cache: {
      ...MORALIS_CACHE.tokenMetadata,
      tags: [`wallet:${normalized}`, "evm:wallet_active_chains"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-token-balances-price
export async function getEvmWalletTokenBalancesPrice(params: {
  address: string;
  chain?: string | number | null;
  excludeSpam?: boolean;
  excludeUnverified?: boolean;
  timeoutMs?: number;
}): Promise<MoralisEvmTokenBalancePrice[]> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  try {
    const payload = await moralisRequest<UntypedJson>({
      api: "evm",
      path: `/wallets/${normalized}/tokens`,
      query: {
        chain,
        exclude_spam: params.excludeSpam ?? true,
        exclude_unverified_contracts: params.excludeUnverified ?? true,
      },
      cache: {
        ...MORALIS_CACHE.walletBalances,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_tokens_price"],
      },
      timeoutMs: params.timeoutMs,
    });

    if (Array.isArray(payload)) {
      return payload as MoralisEvmTokenBalancePrice[];
    }
    const record = asRecord(payload);
    const result = record?.result;
    return Array.isArray(result) ? (result as MoralisEvmTokenBalancePrice[]) : [];
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return [];
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-nfts-by-wallet
export async function getEvmWalletNfts(params: {
  address: string;
  chain?: string | number | null;
  limit?: number;
  cursor?: string | null;
  normalizeMetadata?: boolean;
  mediaItems?: boolean;
  excludeSpam?: boolean;
}): Promise<{ items: MoralisEvmNftOwner[]; cursor: string | null }> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  try {
    const payload = await moralisRequest<MoralisPaginated<MoralisEvmNftOwner>>({
      api: "evm",
      path: `/${normalized}/nft`,
      query: {
        chain,
        limit,
        cursor: params.cursor ?? undefined,
        normalizeMetadata: params.normalizeMetadata ?? true,
        media_items: params.mediaItems ?? true,
        exclude_spam: params.excludeSpam ?? true,
      },
      cache: {
        ...MORALIS_CACHE.walletNfts,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_nfts"],
      },
    });

    return {
      items: Array.isArray(payload.result) ? payload.result : [],
      cursor: typeof payload.cursor === "string" && payload.cursor.trim().length > 0 ? payload.cursor : null,
    };
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return { items: [], cursor: null };
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-history
export async function getEvmWalletHistory(params: {
  address: string;
  chain?: string | number | null;
  limit?: number;
  cursor?: string | null;
  includeInternalTransactions?: boolean;
  includeDecoded?: boolean;
}): Promise<{ items: MoralisEvmWalletHistoryItem[]; cursor: string | null }> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  try {
    const payload = await moralisRequest<MoralisPaginated<MoralisEvmWalletHistoryItem>>({
      api: "evm",
      path: `/wallets/${normalized}/history`,
      query: {
        chain,
        limit,
        cursor: params.cursor ?? undefined,
        include_internal_transactions: params.includeInternalTransactions ?? true,
        include_decoded: params.includeDecoded ?? true,
      },
      cache: {
        ...MORALIS_CACHE.walletHistory,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_history"],
      },
    });

    return {
      items: Array.isArray(payload.result) ? payload.result : [],
      cursor: typeof payload.cursor === "string" && payload.cursor.trim().length > 0 ? payload.cursor : null,
    };
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return { items: [], cursor: null };
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-token-transfers
export async function getEvmWalletErc20Transfers(params: {
  address: string;
  chain?: string | number | null;
  limit?: number;
  cursor?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}): Promise<{ items: Array<Record<string, UntypedJson>>; cursor: string | null }> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  try {
    const payload = await moralisRequest<MoralisPaginated<Record<string, UntypedJson>>>({
      api: "evm",
      path: `/${normalized}/erc20/transfers`,
      query: {
        chain,
        limit,
        cursor: params.cursor ?? undefined,
        from_date: params.fromDate ?? undefined,
        to_date: params.toDate ?? undefined,
      },
      cache: {
        ...MORALIS_CACHE.walletTransfers,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_erc20_transfers"],
      },
    });

    return {
      items: Array.isArray(payload.result) ? payload.result : [],
      cursor: typeof payload.cursor === "string" && payload.cursor.trim().length > 0 ? payload.cursor : null,
    };
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return { items: [], cursor: null };
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-net-worth
export async function getEvmWalletNetWorth(params: {
  address: string;
  chain?: string | number | null;
}): Promise<Record<string, UntypedJson>> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  try {
    const payload = await moralisRequest<Record<string, UntypedJson>>({
      api: "evm",
      path: `/wallets/${normalized}/net-worth`,
      query: { chain },
      cache: {
        ...MORALIS_CACHE.walletNetWorth,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_net_worth"],
      },
    });
    return payload ?? {};
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return {};
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-profitability-summary
export async function getEvmWalletProfitabilitySummary(params: {
  address: string;
  chain?: string | number | null;
}): Promise<MoralisEvmProfitabilitySummary> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  try {
    const payload = await moralisRequest<MoralisEvmProfitabilitySummary>({
      api: "evm",
      path: `/wallets/${normalized}/profitability/summary`,
      query: { chain },
      cache: {
        ...MORALIS_CACHE.walletPnl,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_profitability_summary"],
      },
    });
    return payload ?? {};
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return {};
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-profitability
export async function getEvmWalletProfitability(params: {
  address: string;
  chain?: string | number | null;
}): Promise<Record<string, UntypedJson>> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  try {
    const payload = await moralisRequest<Record<string, UntypedJson>>({
      api: "evm",
      path: `/wallets/${normalized}/profitability`,
      query: { chain },
      cache: {
        ...MORALIS_CACHE.walletPnl,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_profitability"],
      },
    });
    return payload ?? {};
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return {};
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-native-balance
export async function getEvmNativeBalance(params: {
  address: string;
  chain?: string | number | null;
}): Promise<MoralisEvmTokenBalancePrice> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  let payload: { balance: string };
  try {
    payload = await moralisRequest<{ balance: string }>({
      api: "evm",
      path: `/${normalized}/balance`,
      query: { chain },
      cache: {
        ...MORALIS_CACHE.walletBalances,
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_native_balance"],
      },
    });
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      payload = { balance: "0" };
    } else {
      throw error;
    }
  }

  return {
    token_address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    symbol: "ETH", // Default, caller or enrichment can refine this based on chain
    name: "Native Token",
    decimals: 18,
    balance: payload.balance ?? "0",
    balance_formatted: payload.balance ? (Number(payload.balance) / 1e18).toString() : "0",
    native_token: true,
    verified_contract: true,
    possible_spam: false,
  };
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/get-wallet-token-approvals
export async function getEvmWalletTokenApprovals(params: {
  address: string;
  chain?: string | number | null;
  limit?: number;
  cursor?: string | null;
}): Promise<{ items: MoralisEvmTokenApproval[]; cursor: string | null }> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));

  let payload: MoralisPaginated<MoralisEvmTokenApproval>;
  try {
    payload = await moralisRequest<MoralisPaginated<MoralisEvmTokenApproval>>({
      api: "evm",
      path: `/wallets/${normalized}/tokens/approvals`,
      query: {
        chain,
        limit,
        cursor: params.cursor ?? undefined,
      },
      cache: {
        ...MORALIS_CACHE.walletApprovals, 
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_approvals"],
      },
    });
  } catch (error) {
    // If wallet has no history/approvals, Moralis 404s. Return empty successfully.
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return { items: [], cursor: null };
    }
    throw error;
  }

  return {
    items: Array.isArray(payload.result) ? payload.result : [],
    cursor: typeof payload.cursor === "string" && payload.cursor.trim().length > 0 ? payload.cursor : null,
  };
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/wallet-api/resolve-address
export async function resolveEvmAddress(params: {
  address: string;
}): Promise<{ name: string | null }> {
  const normalized = normalizeEvmAddress(params.address);
  // This endpoint resolves ENS domain from address.
  // Docs: GET /wallets/{address}/ens
  
  try {
    const payload = await moralisRequest<{ name: string | null }>({
      api: "evm",
      path: `/wallets/${normalized}/ens`,
      cache: {
        ...MORALIS_CACHE.tokenMetadata, // Long TTL suitable for ENS
        tags: [`wallet:${normalized}`, "evm:ens_resolve"],
      },
    });
    return { name: payload?.name ?? null };
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return { name: null };
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/get-defi-positions-summary
export async function getEvmDefiPositionsSummary(params: {
  address: string;
  chain?: string | number | null;
}): Promise<Record<string, UntypedJson>> {
  const normalized = normalizeEvmAddress(params.address);
  const chain = normalizeEvmChain(params.chain);

  try {
    const payload = await moralisRequest<Record<string, UntypedJson>>({
      api: "evm",
      path: `/wallets/${normalized}/defi/summary`,
      query: { chain },
      cache: {
        ...MORALIS_CACHE.walletNetWorth, // Similar volatility
        tags: [`wallet:${normalized}`, `chain:${chain}`, "evm:wallet_defi_summary"],
      },
    });
    return payload ?? {};
  } catch (error) {
    if (error instanceof MoralisError && error.errorType === 'not_found') {
      return {};
    }
    throw error;
  }
}

export function toUnifiedEvmChain(chain: string | number | null | undefined): UnifiedEvmChain {
  return { kind: "evm", chain: normalizeEvmChain(chain) };
}

export function mapEvmTokensToUnified(tokens: MoralisEvmTokenBalancePrice[], chain: UnifiedEvmChain): UnifiedFungibleAsset[] {
  return tokens.map((token) => {
    const address = toStringOrNull(token.token_address)?.toLowerCase() ?? null;
    const symbol = toStringOrNull(token.symbol);
    const name = toStringOrNull(token.name);
    const decimals = toNumber(token.decimals);
    const balance = toStringOrNull(token.balance) ?? "0";
    const balanceFormatted = toStringOrNull(token.balance_formatted);
    const priceUsd = toNumber(token.usd_price);
    const valueUsd = toNumber(token.usd_value);
    const change24hPercent = toNumber(token.usd_price_24hr_percent_change);
    const logoUrl = toStringOrNull(token.logo ?? token.thumbnail);
    const isSpam = typeof token.possible_spam === "boolean" ? token.possible_spam : null;
    const id = `${chain.kind}:${chain.chain}:${address ?? "native"}`;

    return {
      id,
      chain,
      kind: token.native_token ? "native" : "token",
      address,
      symbol,
      name,
      decimals: decimals != null ? Math.trunc(decimals) : null,
      balance,
      balanceFormatted,
      priceUsd,
      valueUsd,
      change24hPercent,
      logoUrl,
      isSpam,
    } satisfies UnifiedFungibleAsset;
  });
}

export function mapEvmNftsToUnified(items: MoralisEvmNftOwner[], chain: UnifiedEvmChain): UnifiedNFTAsset[] {
  return items.map((nft) => {
    const collectionAddress = toStringOrNull(nft.token_address)?.toLowerCase() ?? null;
    const tokenId = toStringOrNull(nft.token_id);
    const name = toStringOrNull(nft.name);
    const collectionName = toStringOrNull(nft.symbol);
    const amount = toStringOrNull(nft.amount);
    const isSpam = typeof nft.possible_spam === "boolean" ? nft.possible_spam : null;

    const normalized = nft.normalized_metadata && typeof nft.normalized_metadata === "object" ? nft.normalized_metadata : null;
    const description = toStringOrNull(normalized?.description);
    const imageUrl =
      toStringOrNull(normalized?.image) ??
      toStringOrNull(nft.media?.original_media_url) ??
      toStringOrNull(asRecord(normalized?.media)?.image);
    const animationUrl = toStringOrNull(normalized?.animation_url);

    const id = `${chain.kind}:${chain.chain}:${collectionAddress ?? "unknown"}:${tokenId ?? "unknown"}`;

    return {
      id,
      chain,
      collectionAddress,
      tokenId,
      mint: null,
      name,
      collectionName,
      description,
      imageUrl,
      animationUrl,
      amount,
      isSpam,
      raw: (nft as Record<string, UntypedJson>) ?? null,
    } satisfies UnifiedNFTAsset;
  });
}

export function mapEvmHistoryToUnified(items: MoralisEvmWalletHistoryItem[], owner: string, chain: UnifiedEvmChain): UnifiedTransaction[] {
  const normalizedOwner = owner.trim().toLowerCase();
  return items.map((raw) => {
    const hash = toStringOrNull(raw.hash ?? raw.transaction_hash) ?? "unknown";
    const from = toStringOrNull(raw.from_address);
    const to = toStringOrNull(raw.to_address);
    const timestamp = toStringOrNull(raw.block_timestamp);

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

    const decoded = asRecord(raw.decoded);
    const decodedLabel = toStringOrNull(decoded?.label ?? decoded?.name);
    const summary = decodedLabel ?? null;

    const category = decodedLabel && /swap|exactinput|exactoutput|trade/i.test(decodedLabel)
      ? "swap"
      : decodedLabel
        ? "contract"
        : "transfer";

    return {
      id: hash,
      chain,
      hash,
      timestamp,
      from,
      to,
      direction,
      category,
      summary,
      valueUsd: null,
      raw: raw as Record<string, UntypedJson>,
    } satisfies UnifiedTransaction;
  });
}

export async function getEvmUnifiedPnL(params: {
  address: string;
  chain?: string | number | null;
}): Promise<UnifiedPnL> {
  const chain = toUnifiedEvmChain(params.chain);
  const normalized = normalizeEvmAddress(params.address);

  try {
    const summary = await getEvmWalletProfitabilitySummary({ address: normalized, chain: chain.chain });
    const totalUsd =
      toNumber(summary.total_profit_usd) ??
      toNumber(summary.totalProfitUsd) ??
      toNumber(summary.profit_usd) ??
      null;
    const realizedUsd = toNumber(summary.realized_profit_usd) ?? null;
    const unrealizedUsd = toNumber(summary.unrealized_profit_usd) ?? null;
    const costBasisUsd = toNumber(summary.cost_basis_usd) ?? null;
    const roiPercent = toNumber(summary.roi_percent) ?? null;

    return {
      chain,
      mode: "moralis",
      calculationVersion: "moralis-profitability-summary-v1",
      asOf: new Date().toISOString(),
      currency: "usd",
      realizedUsd,
      unrealizedUsd,
      totalUsd,
      costBasisUsd,
      roiPercent,
      confidence: "high",
      limitations: [],
      raw: summary as Record<string, UntypedJson>,
    } satisfies UnifiedPnL;
  } catch (error) {
    const tokens = await getEvmWalletTokenBalancesPrice({ address: normalized, chain: chain.chain }).catch(() => []);
    const approxUnrealizedUsd = approximateUnrealized24h(tokens);
    return {
      chain,
      mode: "approximation",
      calculationVersion: "approx-pnl-24h-mark-to-market-v1",
      asOf: new Date().toISOString(),
      currency: "usd",
      realizedUsd: null,
      unrealizedUsd: approxUnrealizedUsd,
      totalUsd: approxUnrealizedUsd,
      costBasisUsd: null,
      roiPercent: null,
      confidence: "low",
      limitations: [
        "Moralis profitability endpoint unavailable for this wallet/chain/plan tier.",
        "Approximation uses current balances and 24h price change where available (mark-to-market, ignores trades).",
      ],
      raw: error instanceof Error ? ({ message: error.message } as Record<string, UntypedJson>) : null,
    } satisfies UnifiedPnL;
  }
}

function approximateUnrealized24h(tokens: MoralisEvmTokenBalancePrice[]): number | null {
  let total = 0;
  let hasAny = false;
  for (const t of tokens) {
    const valueUsd = toNumber(t.usd_value);
    const pct = toNumber(t.usd_price_24hr_percent_change);
    if (valueUsd == null || pct == null) continue;
    const denom = 1 + pct / 100;
    if (denom === 0) continue;
    const value24h = valueUsd / denom;
    const delta = valueUsd - value24h;
    if (Number.isFinite(delta)) {
      total += delta;
      hasAny = true;
    }
  }
  return hasAny ? total : null;
}
