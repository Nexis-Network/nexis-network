import pMap from "p-map";

import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { detectWalletKind } from "@/server/wallets/detect-kind";
import {
  fetchNexEvmWalletSummary,
  fetchNexSolanaWalletSummary,
  fetchNexStellarWalletSummary,
  type StellarNetwork,
} from "@/server/services/nex";
import {
  upsertWalletAccounts,
  upsertWalletPositions,
  insertWalletPositionSnapshots,
  insertWalletTransactions,
} from "./repository";
import {
  getWalletChainId,
  getWalletMetadata,
  getWalletLabel,
  inferWalletProvider,
  resolveEffectiveWalletAddress,
  resolveSignerAddress,
} from "./utils";
import type {
  WalletAccountUpsert,
  WalletPositionUpsert,
  WalletPositionSnapshotInsert,
  WalletTransactionInsert,
  WalletAssetType,
} from "./types";
import { createWalletAnalyticsError } from "./repository";

type IngestOptions = {
  includeHistory?: boolean;
  includeNfts?: boolean;
  includeTokens?: boolean;
  includeTransactions?: boolean;
};

type IngestCounts = {
  accounts: number;
  positions: number;
  snapshots: number;
};

const DEFAULT_OPTIONS: Required<Pick<IngestOptions, "includeHistory" | "includeNfts" | "includeTokens">> = {
  includeHistory: true,
  includeNfts: true,
  includeTokens: true,
};

function toNumericString(value: number | string | null | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  return "0";
}

function sanitizeUsd(value: number | string | null | undefined): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value.toFixed(10);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

export async function ingestWalletAnalytics(userId: string, options: IngestOptions = {}): Promise<IngestCounts> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const wallets = await resolveUserWallets(userId);
  if (!wallets.length) {
    return { accounts: 0, positions: 0, snapshots: 0 };
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const accountUpserts: WalletAccountUpsert[] = wallets.map((wallet) => {
    const metadata = getWalletMetadata(wallet);
    const chainId = getWalletChainId(wallet);
    const provider = inferWalletProvider(wallet);
    const walletType = typeof wallet.walletType === "string" ? wallet.walletType : metadata?.walletType;
    const address = resolveEffectiveWalletAddress(wallet) ?? resolveSignerAddress(wallet) ?? wallet.address ?? "";

    return {
      userId,
      walletId: wallet.walletId,
      address,
      chainId,
      platform: metadata?.kind ? String(metadata.kind) : null,
      walletType: typeof walletType === "string" ? walletType : null,
      provider: typeof provider === "string" ? provider : null,
      metadata: {
        ...(metadata ?? {}),
        label: getWalletLabel(wallet),
        topChains: wallet.topChains ?? [],
        topAssets: wallet.topAssets ?? [],
      },
    };
  });

  const accountRows = await upsertWalletAccounts(supabase, accountUpserts, { returning: "representation" });
  const accountIdByWalletId = new Map(accountRows.map((row) => [row.walletId, row.id]));

  const allPositions: WalletPositionUpsert[] = [];
  const allSnapshots: WalletPositionSnapshotInsert[] = [];
  const allTransactions: WalletTransactionInsert[] = [];

  await pMap(
    wallets,
    async (wallet) => {
      const accountId = accountIdByWalletId.get(wallet.walletId);
      if (!accountId) {
        return;
      }

      const kind = detectWalletKind(wallet);
      if (kind === "hyperliquid" || kind === "unknown") {
        return;
      }

      const effectiveAddress = resolveEffectiveWalletAddress(wallet) ?? resolveSignerAddress(wallet);
      if (!effectiveAddress) {
        return;
      }

      if (kind === "evm") {
        const summary = await fetchNexEvmWalletSummary(effectiveAddress, {
          includeTokens: mergedOptions.includeTokens,
          includeNfts: mergedOptions.includeNfts,
          includeTransactions: mergedOptions.includeTransactions ?? false,
          limit: 50,
        }).catch((error) => {
          throw createWalletAnalyticsError("evm summary fetch failed", error);
        });

        if (mergedOptions.includeTokens) {
          summary.tokens.forEach((token) => {
            if (!token || typeof token.balance !== "number") {
              return;
            }
            const assetType: WalletAssetType =
              token.contract && token.contract.length > 0 ? "erc20" : "native";
            const quantityUsd = sanitizeUsd(token.valueUsd);
            allPositions.push({
              accountId,
              assetType,
              chainId: token.chainId ?? null,
              contractAddress: token.contract ?? null,
              tokenId: null,
              symbol: token.symbol ?? null,
              name: token.name ?? null,
              decimals: token.decimals ?? null,
              quantity: toNumericString(token.balance),
              quantityUsd,
              costBasisUsd: null,
              unrealizedPnlUsd: null,
              lastPriceUsd: sanitizeUsd(token.priceUsd),
              priceChange24h: token.priceChange24h != null ? token.priceChange24h.toFixed(6) : null,
              metadata: {
                logo: token.logoURI ?? null,
              },
            });

            if (mergedOptions.includeHistory && quantityUsd) {
              allSnapshots.push({
                accountId,
                assetType,
                chainId: token.chainId ?? null,
                contractAddress: token.contract ?? null,
                tokenId: null,
                symbol: token.symbol ?? null,
                quantity: toNumericString(token.balance),
                quantityUsd,
                costBasisUsd: null,
                unrealizedPnlUsd: null,
                realizedPnlUsd: null,
                metadata: {
                  logo: token.logoURI ?? null,
                },
              });
            }
          });
        }

        if (mergedOptions.includeNfts && Array.isArray(summary.nfts)) {
          summary.nfts.forEach((nft) => {
            const contract = (nft?.contractAddress ?? nft?.collectionAddress ?? nft?.collection?.address ?? "").toLowerCase() || null;
            const tokenId = nft?.tokenId ?? nft?.id ?? nft?.token_id ?? null;
            const valuation =
              typeof nft?.floorPriceUsd === "number"
                ? nft.floorPriceUsd
                : typeof nft?.valuationUsd === "number"
                  ? nft.valuationUsd
                  : null;
            allPositions.push({
              accountId,
              assetType: "erc721",
              chainId: nft?.chainId ?? null,
              contractAddress: contract,
              tokenId: tokenId ? String(tokenId) : null,
              symbol: nft?.symbol ?? null,
              name: nft?.name ?? nft?.metadata?.name ?? null,
              decimals: null,
              quantity: "1",
              quantityUsd: sanitizeUsd(valuation),
              costBasisUsd: null,
              unrealizedPnlUsd: null,
              lastPriceUsd: sanitizeUsd(valuation),
              priceChange24h: null,
              metadata: {
                image: nft?.image ?? nft?.metadata?.image ?? null,
                description: nft?.description ?? nft?.metadata?.description ?? null,
              },
            });
          });
        }

        return;
      }

      if (kind === "solana") {
        const summary = await fetchNexSolanaWalletSummary(effectiveAddress, {
          includeTokens: mergedOptions.includeTokens,
          includeNfts: mergedOptions.includeNfts,
          includeTransactions: mergedOptions.includeTransactions ?? false,
          limit: 50,
        }).catch((error) => {
          throw createWalletAnalyticsError("solana summary fetch failed", error);
        });

        if (mergedOptions.includeTokens && Array.isArray(summary.tokens)) {
          summary.tokens.forEach((token) => {
            if (!token || typeof token.amount !== "number") {
              return;
            }
            const quantityUsd = sanitizeUsd(token.valueUsd);
            allPositions.push({
              accountId,
              assetType: "spl",
              chainId: null,
              contractAddress: typeof token.mint === "string" ? token.mint : null,
              tokenId: null,
              symbol: token.symbol ?? null,
              name: token.name ?? null,
              decimals: typeof token.decimals === "number" ? token.decimals : null,
              quantity: toNumericString(token.amount),
              quantityUsd,
              costBasisUsd: null,
              unrealizedPnlUsd: null,
              lastPriceUsd: sanitizeUsd(token.priceUsd),
              priceChange24h: null,
              metadata: {
                logo: token.logo ?? null,
              },
            });

            if (mergedOptions.includeHistory && quantityUsd) {
              allSnapshots.push({
                accountId,
                assetType: "spl",
                chainId: null,
                contractAddress: typeof token.mint === "string" ? token.mint : null,
                tokenId: null,
                symbol: token.symbol ?? null,
                quantity: toNumericString(token.amount),
                quantityUsd,
                costBasisUsd: null,
                unrealizedPnlUsd: null,
                realizedPnlUsd: null,
                metadata: {
                  logo: token.logo ?? null,
                },
              });
            }
          });
        }

        if (mergedOptions.includeNfts && Array.isArray(summary.nfts)) {
          summary.nfts.forEach((nft) => {
            const valuationUsd =
              typeof nft?.metadata?.offChainMetadata?.floorPriceUsd === "number"
                ? nft.metadata.offChainMetadata.floorPriceUsd
                : typeof nft?.floorPriceUsd === "number"
                  ? nft.floorPriceUsd
                  : null;
            allPositions.push({
              accountId,
              assetType: "spl_nft",
              chainId: null,
              contractAddress: typeof nft?.mint === "string" ? nft.mint : null,
              tokenId: typeof nft?.tokenAddress === "string" ? nft.tokenAddress : null,
              symbol: nft?.symbol ?? null,
              name: nft?.name ?? nft?.metadata?.offChainMetadata?.metadata?.name ?? null,
              decimals: null,
              quantity: "1",
              quantityUsd: sanitizeUsd(valuationUsd),
              costBasisUsd: null,
              unrealizedPnlUsd: null,
              lastPriceUsd: sanitizeUsd(valuationUsd),
              priceChange24h: null,
              metadata: {
                image: nft?.content?.files?.[0]?.uri ?? nft?.metadata?.offChainMetadata?.image ?? null,
              },
            });
          });
        }
      }

      if (kind === "stellar") {
        const metadata = getWalletMetadata(wallet);
        const crossmintEnv = typeof metadata?.crossmintEnv === "string" ? metadata.crossmintEnv.toLowerCase() : "";
        const network: StellarNetwork = crossmintEnv === "staging" ? "testnet" : "public";

        const summary = await fetchNexStellarWalletSummary(effectiveAddress, {
          includeTokens: mergedOptions.includeTokens,
          includeTransactions: mergedOptions.includeTransactions ?? false,
          limit: 50,
          network,
        }).catch((error) => {
          throw createWalletAnalyticsError("stellar summary fetch failed", error);
        });

        if (mergedOptions.includeTokens && Array.isArray(summary.tokens)) {
          summary.tokens.forEach((token) => {
            const quantityUsd = sanitizeUsd(token.valueUsd);
            const contractAddress =
              token.assetType === "native"
                ? null
                : token.issuer
                  ? `${token.code}:${token.issuer}`
                  : token.code;

            const assetType: WalletAssetType = token.assetType === "native" ? "native" : "other";

            allPositions.push({
              accountId,
              assetType,
              chainId: null,
              contractAddress,
              tokenId: null,
              symbol: token.code,
              name: token.assetType === "native" ? "Stellar Lumens" : null,
              decimals: token.decimals,
              quantity: toNumericString(token.balance),
              quantityUsd,
              costBasisUsd: null,
              unrealizedPnlUsd: null,
              lastPriceUsd: sanitizeUsd(token.priceUsd),
              priceChange24h: token.priceChange24h != null ? token.priceChange24h.toFixed(6) : null,
              metadata: {
                issuer: token.issuer,
                network,
              },
            });

            if (mergedOptions.includeHistory && quantityUsd) {
              allSnapshots.push({
                accountId,
                assetType,
                chainId: null,
                contractAddress,
                tokenId: null,
                symbol: token.code,
                quantity: toNumericString(token.balance),
                quantityUsd,
                costBasisUsd: null,
                unrealizedPnlUsd: null,
                realizedPnlUsd: null,
                metadata: {
                  issuer: token.issuer,
                  network,
                },
              });
            }
          });
        }

        if (mergedOptions.includeTransactions && Array.isArray(summary.txs)) {
          const walletKey = effectiveAddress.trim().toUpperCase();
          summary.txs.forEach((tx) => {
            const from = typeof tx.from === "string" ? tx.from : null;
            const to = typeof tx.to === "string" ? tx.to : null;
            const fromKey = from ? from.trim().toUpperCase() : "";
            const toKey = to ? to.trim().toUpperCase() : "";
            const direction: WalletTransactionInsert["direction"] =
              fromKey && fromKey === walletKey && toKey && toKey === walletKey
                ? "neutral"
                : fromKey && fromKey === walletKey
                  ? "outbound"
                  : toKey && toKey === walletKey
                    ? "inbound"
                    : "neutral";

            const counterparty =
              direction === "inbound" ? from : direction === "outbound" ? to : null;

            const assetType: WalletAssetType = tx.assetType === "native" ? "native" : "other";
            const contractAddress =
              assetType === "native"
                ? null
                : tx.assetIssuer && tx.assetCode
                  ? `${tx.assetCode}:${tx.assetIssuer}`
                  : tx.assetCode;

            allTransactions.push({
              accountId,
              chainId: null,
              hash: tx.id,
              logIndex: 0,
              direction,
              assetType,
              contractAddress: contractAddress ?? null,
              tokenId: null,
              quantity: typeof tx.amount === "string" ? tx.amount : null,
              amountUsd: null,
              feeUsd: null,
              realizedPnlUsd: null,
              counterparty,
              source: "stellar:horizon",
              metadata: {
                network,
                type: tx.type,
                transactionHash: tx.transactionHash,
                from,
                to,
              },
              occurredAt: tx.createdAt,
            });
          });
        }
      }
    },
    { concurrency: 2 },
  );

  if (allPositions.length) {
    await upsertWalletPositions(supabase, allPositions, { returning: "minimal" });
  }

  if (mergedOptions.includeHistory && allSnapshots.length) {
    await insertWalletPositionSnapshots(supabase, allSnapshots);
  }

  if (mergedOptions.includeTransactions && allTransactions.length) {
    await insertWalletTransactions(supabase, allTransactions);
  }

  return {
    accounts: accountRows.length,
    positions: allPositions.length,
    snapshots: mergedOptions.includeHistory ? allSnapshots.length : 0,
  };
}
