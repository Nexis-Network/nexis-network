import "server-only";

import type { PumpFunV2ArtifactData } from "@/modules/shared/artifacts/pumpfun-v2";
import {
  getPumpfunTokenBondingStatus,
  getPumpfunTokenMetadata,
  getPumpfunTokenPairsByAddress,
  getPumpfunTokenPrice,
  getPumpfunTokenSwaps,
} from "@/server/moralis/solana/pumpfun";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { getSolanaTokenHolding } from "@/server/services/pumpfun/transaction-builder";

type PumpfunDashboardCluster = "mainnet-beta" | "devnet";

function pickList(raw: UntypedJson): UntypedJson[] {
  const record = asRecord(raw);
  return (
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record.data as UntypedJson[]) : null) ??
    (Array.isArray(record?.pairs) ? (record.pairs as UntypedJson[]) : null) ??
    (Array.isArray(record?.swaps) ? (record.swaps as UntypedJson[]) : null) ??
    []
  );
}

function resolveWallet(address?: string | null) {
  return {
    source: "cdp_embedded_solana" as const,
    address: address ?? null,
    connected: Boolean(address),
  };
}

export async function buildPumpfunDashboardArtifact(params: {
  cluster: PumpfunDashboardCluster;
  mint: string;
  walletAddress?: string | null;
  buyAmountSol: number;
  sellPercent: number;
  slippageBps: number;
  forceCanBuy?: boolean;
  forceCanSell?: boolean;
}): Promise<Extract<PumpFunV2ArtifactData, { view: "token-dashboard" }>> {
  const [metadataRaw, priceRaw, bondingRaw, pairsRaw, swapsRaw] = await Promise.all([
    getPumpfunTokenMetadata({ network: params.cluster, address: params.mint }),
    getPumpfunTokenPrice({ network: params.cluster, address: params.mint }),
    getPumpfunTokenBondingStatus({ network: params.cluster, address: params.mint }),
    getPumpfunTokenPairsByAddress({ network: params.cluster, address: params.mint }),
    getPumpfunTokenSwaps({ network: params.cluster, address: params.mint, limit: 12 }),
  ]);

  const metadata = asRecord(metadataRaw) ?? {};
  const price = asRecord(priceRaw) ?? {};
  const bonding = asRecord(bondingRaw) ?? {};
  const firstPair = asRecord(pickList(pairsRaw)[0]) ?? {};
  const swapList = pickList(swapsRaw);

  const walletAddress = params.walletAddress ?? null;
  const holding = walletAddress
    ? await getSolanaTokenHolding({
        cluster: params.cluster,
        ownerAddress: walletAddress,
        mint: params.mint,
      }).catch(() => null)
    : null;

  const token = {
    mint: params.mint,
    name: toStringOrNull(metadata.name ?? metadata.tokenName) ?? "Pump.fun Token",
    symbol: toStringOrNull(metadata.symbol ?? metadata.tokenSymbol) ?? "PUMP",
    logoUrl: toStringOrNull(metadata.image ?? metadata.imageUrl ?? metadata.logo),
    priceUsd: toNumber(price.usdPrice ?? price.priceUsd ?? price.price_usd),
    marketCapUsd: toNumber(price.marketCapUsd ?? price.market_cap_usd ?? firstPair.marketCapUsd),
    liquidityUsd: toNumber(price.liquidityUsd ?? price.liquidity_usd ?? firstPair.liquidityUsd),
    volume24hUsd: toNumber(price.volume24hUsd ?? price.volume_24h_usd ?? firstPair.volume24hUsd),
    migrationProgressPct: (() => {
      const rawProgress = toNumber(
        bonding.bondingProgress ?? bonding.bonding_progress ?? bonding.progress,
      );
      if (rawProgress == null) return null;
      return rawProgress <= 1 ? rawProgress * 100 : rawProgress;
    })(),
    pairAddress: toStringOrNull(
      firstPair.pairAddress ?? firstPair.pair_address ?? firstPair.address,
    ),
    website: toStringOrNull(metadata.website),
    twitter: toStringOrNull(metadata.twitter),
    telegram: toStringOrNull(metadata.telegram),
  };

  const transactions = swapList.slice(0, 10).map((swap) => {
    const record = asRecord(swap) ?? {};
    const side: "buy" | "sell" =
      (toStringOrNull(record.side ?? record.transactionType ?? record.type)?.toLowerCase() ?? "buy") === "sell"
        ? "sell"
        : "buy";
    return {
      signature: toStringOrNull(record.signature ?? record.txHash ?? record.transactionHash) ?? undefined,
      side,
      timestamp:
        toStringOrNull(
          record.blockTimestamp ??
            record.block_timestamp ??
            record.timestamp ??
            record.createdAt ??
            record.created_at,
        ) ?? new Date().toISOString(),
      valueUsd: toNumber(record.valueUsd ?? record.value_usd ?? record.usdValue),
      solAmount: toNumber(record.solAmount ?? record.sol_amount),
      tokenAmount: toNumber(record.tokenAmount ?? record.token_amount),
      walletAddress: toStringOrNull(
        record.trader ??
          record.walletAddress ??
          record.wallet_address ??
          record.buyer ??
          record.seller,
      ),
    };
  });

  return {
    view: "token-dashboard",
    generatedAt: new Date().toISOString(),
    cluster: params.cluster,
    token,
    transactions,
    chart: {
      chainId: "solana",
      tokenAddress: token.pairAddress ? null : token.mint,
      pairAddress: token.pairAddress ?? null,
      defaultInterval: "1H",
    },
    wallet: resolveWallet(walletAddress),
    actions: {
      canBuy: params.forceCanBuy ?? params.cluster === "mainnet-beta",
      canSell:
        params.forceCanSell ??
        (params.cluster === "mainnet-beta" && Boolean(holding && holding.amountRaw > 0n)),
      defaultBuyAmountSol: params.buyAmountSol,
      defaultSellPercent: params.sellPercent,
      slippageBps: params.slippageBps,
      buyState: "idle",
      sellState: "idle",
    },
  };
}
