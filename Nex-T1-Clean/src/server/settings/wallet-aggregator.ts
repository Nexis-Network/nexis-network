import "server-only";

import pMap from "p-map";

import { getOrSet } from "@/server/services/redis/cache";
import { getSolanaWalletSwapTxs } from "@/server/moralis/solana/wallet";
import { fetchNexSolanaWalletSummary, fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaNetwork } from "@/server/moralis/validation";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { detectWalletKind } from "@/server/wallets/detect-kind";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { logger } from "@/lib/logger";
import { observeServerOperation } from "@/server/observability/operations";
import type { JsonObject } from "@/types/json";
import { buildFallbackSolanaHistoryEvents } from "./solana-history-events";

const WALLET_AGGREGATOR_DOMAIN = "wallet_aggregator";
const HOLDINGS_CACHE_NAMESPACE = "wallet_holdings" as const;
const HISTORY_CACHE_NAMESPACE = "wallet_history" as const;

const HOLDINGS_CACHE_KEY = (userId: string) => `user:${userId}:wallets:holdings:v3`;
const HISTORY_CACHE_KEY = (userId: string) => `user:${userId}:wallets:history:v3`;

const HOT_TTL_SECONDS = 120;
const STALE_TTL_SECONDS = 15 * 60;
const MAX_EVM_WALLETS = 10;
const MAX_SOLANA_WALLETS = 5;
const MAX_TOKENS = 75;
const MAX_NFTS = 40;
const MAX_ENS_LOOKUPS = 25;

type WalletPortfolio = Awaited<ReturnType<typeof resolveUserWallets>>[number];

export type AggregatedToken = {
  walletId: string;
  walletLabel: string;
  walletAddress: string;
  chainId: number | null;
  platform: string | null;
  contract: string | null;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  balance: number;
  priceUsd: number | null;
  valueUsd: number | null;
  priceChange24h: number | null;
  logoURI: string | null;
};

export type AggregatedNft = {
  walletId: string;
  walletLabel: string;
  walletAddress: string;
  raw: JsonObject;
};

export type AggregatedEns = {
  address: string;
  name: string;
};

export type WalletHoldingsAggregate = {
  generatedAt: string;
  tokens: AggregatedToken[];
  nfts: AggregatedNft[];
  ens: AggregatedEns[];
};

export type WalletHistoryEvent = {
  id: string;
  timestamp: number | null;
  walletLabel: string;
  walletAddress: string;
  type: "buy" | "sell" | "short" | "cover" | "liquidate" | "rebalance" | "send" | "receive" | "transfer" | "contract";
  name: string | null;
  symbol: string | null;
  amount: string | null;
  priceUsd: number | null;
  chainId: number | null;
  tokenAddress: string | null;
  tokenId: string | null;
  thumb: string | null;
  source: "evm" | "solana" | "agent_trade";
  txHash?: string | null;
  pnlUsd?: number | null;
  feesUsd?: number | null;
  venue?: string | null;
};

export type WalletHistoryAggregate = {
  generatedAt: string;
  events: WalletHistoryEvent[];
};

function resolveWalletLabel(wallet: WalletPortfolio): string {
  const metadata = getWalletMetadataRecord(wallet);
  const label = metadata?.label;
  if (typeof label === "string" && label.trim().length > 0) {
    return label.trim();
  }
  if (typeof wallet.providerName === "string" && wallet.providerName.trim().length > 0) {
    return wallet.providerName.trim();
  }
  const fallbackAddress = resolveEffectiveWalletAddress(wallet) ?? wallet.address;
  if (fallbackAddress) {
    const addr = fallbackAddress;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  return wallet.walletId;
}

function getWalletMetadataRecord(wallet: WalletPortfolio): JsonObject | null {
  return asRecord(wallet.metadata);
}

function resolveSignerAddress(wallet: WalletPortfolio): string | null {
  const metadata = getWalletMetadataRecord(wallet);
  const fromMetadata = metadata && typeof metadata.signerAddress === "string" ? metadata.signerAddress : null;
  if (fromMetadata && fromMetadata.trim().length > 0) {
    return fromMetadata.trim();
  }
  if (typeof wallet.address === "string" && wallet.address.trim().length > 0) {
    return wallet.address.trim();
  }
  return null;
}

function resolveSmartAccountAddress(wallet: WalletPortfolio): string | null {
  const metadata = getWalletMetadataRecord(wallet);
  const smart = metadata && typeof metadata.smartAccountAddress === "string" ? metadata.smartAccountAddress : null;
  const engineSmart =
    metadata && typeof metadata.engineSmartAccountAddress === "string"
      ? metadata.engineSmartAccountAddress
      : null;
  if (smart && smart.trim().length > 0) {
    return smart.trim();
  }
  if (engineSmart && engineSmart.trim().length > 0) {
    return engineSmart.trim();
  }
  return null;
}

function resolveEffectiveWalletAddress(wallet: WalletPortfolio): string | null {
  return resolveSmartAccountAddress(wallet) ?? resolveSignerAddress(wallet);
}

export async function getWalletHoldingsAggregate(userId: string): Promise<WalletHoldingsAggregate> {
  return observeServerOperation(
    {
      domain: WALLET_AGGREGATOR_DOMAIN,
      operation: "holdings_aggregate",
      budgetMs: 4000,
      context: { userId },
    },
    async () =>
      getOrSet(
        HOLDINGS_CACHE_KEY(userId),
        async () => computeWalletHoldingsAggregate(userId),
        {
          ttlSeconds: HOT_TTL_SECONDS,
          staleTtlSeconds: STALE_TTL_SECONDS,
          coalesce: true,
          lockTtlSeconds: 5,
          namespace: HOLDINGS_CACHE_NAMESPACE,
          serialize: (value) => JSON.stringify(value),
          deserialize: (raw) => {
            if (!raw) return null;
            try {
              const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
              if (parsed && typeof parsed === "object") {
                return parsed as WalletHoldingsAggregate;
              }
            } catch {
              return null;
            }
            return null;
          },
        },
      ),
  );
}

async function computeWalletHoldingsAggregate(userId: string): Promise<WalletHoldingsAggregate> {
  const wallets = await resolveUserWallets(userId);
  const evmWallets = wallets
    .filter((w) => w.address && ["evm", "hyperliquid"].includes(detectWalletKind(w)))
    .slice(0, MAX_EVM_WALLETS);
  const solWallets = wallets
    .filter((w) => w.address && detectWalletKind(w) === "solana")
    .slice(0, MAX_SOLANA_WALLETS);

  const tokens: AggregatedToken[] = [];
  const nfts: AggregatedNft[] = [];

  await pMap(
    evmWallets,
    async (wallet) => {
      const effectiveAddress = resolveEffectiveWalletAddress(wallet);
      if (!effectiveAddress) return;
      const metadata = getWalletMetadataRecord(wallet);
      const chainId =
        typeof metadata?.chainId === "number"
          ? (metadata.chainId as number)
          : typeof metadata?.chain_id === "number"
            ? (metadata.chain_id as number)
            : null;

      const summary = await fetchNexEvmWalletSummary(effectiveAddress, {
        includeTokens: true,
        includeNfts: true,
        skipCache: false,
      }).catch((error) => {
        logger.warn("wallet_holdings_evm_failed", {
          address: wallet.address,
          effectiveAddress,
          chainId,
          error,
        });
        return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null, fetchedAt: new Date().toISOString() };
      });
      const label = resolveWalletLabel(wallet);

      summary.tokens.forEach((token) => {
        tokens.push({
          walletId: wallet.walletId,
          walletLabel: label,
          walletAddress: effectiveAddress,
          chainId: token.chainId,
          platform: "evm",
          contract: token.contract ? token.contract.toLowerCase() : null,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          priceUsd: token.priceUsd,
          valueUsd: token.valueUsd,
          priceChange24h: token.priceChange24h,
          logoURI: token.logoURI,
        });
      });

      summary.nfts.slice(0, 10).forEach((item) => {
        nfts.push({
          walletId: wallet.walletId,
          walletLabel: label,
          walletAddress: effectiveAddress,
          raw: asRecord(item) ?? {},
        });
      });
    },
    { concurrency: 5 },
  );

  await pMap(
    solWallets,
    async (wallet) => {
      const targetAddress = resolveSignerAddress(wallet);
      if (!targetAddress) return;
      const metadata = getWalletMetadataRecord(wallet);
      const rawCluster = typeof metadata?.cluster === "string" ? metadata.cluster : null;
      const network = normalizeSolanaNetwork(rawCluster?.toLowerCase().includes("devnet") ? "devnet" : "mainnet");

      const summary = await fetchNexSolanaWalletSummary(targetAddress, {
        includeTokens: true,
        includeNfts: true,
        skipCache: false,
      }).catch((error) => {
        logger.warn("wallet_holdings_solana_failed", { address: wallet.address, targetAddress, network, error });
        return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null };
      });
      const label = resolveWalletLabel(wallet);

      // Map Tokens
      summary.tokens.forEach((token) => {
        const balance = toNumber(token.amount);
        tokens.push({
          walletId: wallet.walletId,
          walletLabel: label,
          walletAddress: targetAddress,
          chainId: null,
          platform: "solana",
          contract: toStringOrNull(token.mint),
          symbol: toStringOrNull(token.symbol),
          name: toStringOrNull(token.name),
          decimals: toNumber(token.decimals) ?? null,
          balance: typeof balance === "number" && Number.isFinite(balance) ? balance : 0,
          priceUsd: toNumber(token.priceUsd) ?? null,
          valueUsd: toNumber(token.valueUsd) ?? null,
          priceChange24h: toNumber(token.priceChange24h) ?? null,
          logoURI: toStringOrNull(token.logo),
        });
      });

      // Map NFTs
      summary.nfts.slice(0, 10).forEach((n) => {
        nfts.push({
          walletId: wallet.walletId,
          walletLabel: label,
          walletAddress: targetAddress,
          raw: asRecord(n) ?? {},
        });
      });
    },
    { concurrency: 3 },
  );

  tokens.sort((a, b) => (Number(b.valueUsd ?? 0) || 0) - (Number(a.valueUsd ?? 0) || 0));
  const topTokens = tokens.slice(0, MAX_TOKENS);
  const topNfts = nfts.slice(0, MAX_NFTS);

  const ens = await resolveEnsNames(
    evmWallets
      .map((w) => resolveEffectiveWalletAddress(w) ?? undefined)
      .filter((addr): addr is string => typeof addr === "string")
      .slice(0, MAX_ENS_LOOKUPS),
  );

  return {
    generatedAt: new Date().toISOString(),
    tokens: topTokens,
    nfts: topNfts,
    ens,
  } satisfies WalletHoldingsAggregate;
}

async function resolveEnsNames(addresses: string[]): Promise<AggregatedEns[]> {
  // ENS resolution is temporarily disabled until a viem-based resolver is added.
  void addresses;
  return [];
}

export async function getWalletHistoryAggregate(userId: string): Promise<WalletHistoryAggregate> {
  return observeServerOperation(
    {
      domain: WALLET_AGGREGATOR_DOMAIN,
      operation: "history_aggregate",
      budgetMs: 4500,
      context: { userId },
    },
    async () =>
      getOrSet(
        HISTORY_CACHE_KEY(userId),
        async () => computeWalletHistoryAggregate(userId),
        {
          ttlSeconds: HOT_TTL_SECONDS,
          staleTtlSeconds: STALE_TTL_SECONDS,
          coalesce: true,
          lockTtlSeconds: 5,
          namespace: HISTORY_CACHE_NAMESPACE,
          serialize: (value) => JSON.stringify(value),
          deserialize: (raw) => {
            if (!raw) return null;
            try {
              const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
              if (parsed && typeof parsed === "object") {
                return parsed as WalletHistoryAggregate;
              }
            } catch {
              return null;
            }
            return null;
          },
        },
      ),
  );
}

async function computeWalletHistoryAggregate(userId: string): Promise<WalletHistoryAggregate> {
  const wallets = await resolveUserWallets(userId);
  const evmWallets = wallets
    .filter((w) => w.address && ["evm", "hyperliquid"].includes(detectWalletKind(w)))
    .slice(0, MAX_EVM_WALLETS);
  const solWallets = wallets
    .filter((w) => w.address && detectWalletKind(w) === "solana")
    .slice(0, MAX_SOLANA_WALLETS);

  const events: WalletHistoryEvent[] = [];

  await pMap(
    evmWallets,
    async (wallet) => {
      const effectiveAddress = resolveEffectiveWalletAddress(wallet);
      if (!effectiveAddress) return;
      const metadata = getWalletMetadataRecord(wallet);
      const chainId =
        typeof metadata?.chainId === "number"
          ? (metadata.chainId as number)
          : typeof metadata?.chain_id === "number"
            ? (metadata.chain_id as number)
            : 1;

      const summary = await fetchNexEvmWalletSummary(effectiveAddress, {
        includeTokens: false,
        includeNfts: false,
        includeTransactions: true,
        transactionLimit: 40,
        skipCache: false,
      }).catch((error) => {
        logger.warn("wallet_history_evm_failed", {
          address: wallet.address,
          effectiveAddress,
          chainId,
          error,
        });
        return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null, fetchedAt: "" };
      });
      const label = resolveWalletLabel(wallet);
      const walletsForLabel = wallets;

      summary.txs.forEach((raw) => {
        // Service attaches chainId to the raw tx object
        const rawRecord = asRecord(raw) ?? {};
        const txChainId = (typeof rawRecord.chainId === "number" ? rawRecord.chainId : chainId) ?? chainId;
        const event = normalizeEvmHistoryItem(rawRecord, effectiveAddress, label, walletsForLabel, txChainId);
        if (event) events.push(event);
      });
    },
    { concurrency: 5 },
  );

  await pMap(
    solWallets,
    async (wallet) => {
      const targetAddress = resolveSignerAddress(wallet);
      if (!targetAddress) return;
      const label = resolveWalletLabel(wallet);
      const metadata = getWalletMetadataRecord(wallet);
      const rawCluster = typeof metadata?.cluster === "string" ? metadata.cluster : null;
      const network = normalizeSolanaNetwork(rawCluster?.toLowerCase().includes("devnet") ? "devnet" : "mainnet");

      const swaps = await getSolanaWalletSwapTxs({
        address: targetAddress,
        network,
        limit: 40,
        cursor: null,
        order: "DESC",
        transactionTypes: ["buy", "sell"],
      }).catch((error) => {
        logger.warn("wallet_history_solana_failed", { address: wallet.address, targetAddress, network, error });
        return {};
      });
      const summary = await fetchNexSolanaWalletSummary(targetAddress, {
        includeTokens: false,
        includeNfts: false,
        includeTransactions: true,
        transactionLimit: 40,
        skipCache: false,
      }).catch((error) => {
        logger.warn("wallet_history_solana_summary_failed", {
          address: wallet.address,
          targetAddress,
          network,
          error,
        });
        return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null };
      });

      const record = asRecord(swaps) ?? {};
      const items =
        (Array.isArray(record.result) ? record.result : null) ??
        (Array.isArray(record.swaps) ? record.swaps : null) ??
        (Array.isArray(record.items) ? record.items : null) ??
        [];
      const walletEvents: WalletHistoryEvent[] = [];

      items.forEach((raw) => {
        const r = asRecord(raw) ?? {};
        const txHash = toStringOrNull(r.transactionHash ?? r.signature ?? r.txHash ?? r.transaction_hash) ?? null;
        const timestamp = normalizeTimestamp(r.blockTimestamp ?? r.block_timestamp ?? r.timestamp);
        const transactionType = toStringOrNull(r.transactionType ?? r.transaction_type ?? r.type)?.toLowerCase() ?? "swap";
        const pairLabel = toStringOrNull(r.pairLabel ?? r.pair_label) ?? null;
        const baseToken = toStringOrNull(r.baseToken ?? r.base_token) ?? null;
        const quoteToken = toStringOrNull(r.quoteToken ?? r.quote_token) ?? null;
        const bought = toStringOrNull(r.bought) ?? null;
        const sold = toStringOrNull(r.sold) ?? null;
        const totalValueUsd = toNumber(r.totalValueUsd ?? r.total_value_usd ?? r.valueUsd ?? r.usdValue) ?? null;
        const exchangeName = toStringOrNull(r.exchangeName ?? r.exchange_name) ?? null;
        const exchangeLogo = toStringOrNull(r.exchangeLogo ?? r.exchange_logo) ?? null;

        walletEvents.push({
          id: txHash ?? `${targetAddress}-${Math.random()}`,
          timestamp,
          walletLabel: label,
          walletAddress: targetAddress,
          type: (transactionType === "buy" || transactionType === "sell" ? transactionType : "transfer"),
          name: pairLabel ?? (baseToken && quoteToken ? `${baseToken}/${quoteToken}` : null),
          symbol: baseToken,
          amount: transactionType === "buy" ? bought : transactionType === "sell" ? sold : null,
          priceUsd: totalValueUsd,
          chainId: null,
          tokenAddress: null,
          tokenId: null,
          thumb: exchangeLogo,
          source: "solana",
          txHash,
          venue: exchangeName,
        });
      });

      const knownTxHashes = new Set(
        walletEvents
          .map((event) => event.txHash)
          .filter((txHash): txHash is string => typeof txHash === "string" && txHash.length > 0),
      );
      walletEvents.push(
        ...buildFallbackSolanaHistoryEvents({
          walletAddress: targetAddress,
          walletLabel: label,
          knownTxHashes,
          transactions: summary.txs.map((tx) => ({
            signature: toStringOrNull(tx.signature) ?? null,
            timestamp: toNumber(tx.timestamp) ?? null,
          })),
        }),
      );
      events.push(...walletEvents);
    },
    { concurrency: 3 },
  );

  const agentTradeEvents = await fetchAgentTradeHistory(userId);
  events.push(...agentTradeEvents);

  events.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  return {
    generatedAt: new Date().toISOString(),
    events: events.slice(0, 250),
  } satisfies WalletHistoryAggregate;
}

function normalizeEvmHistoryItem(
  raw: JsonObject,
  address: string,
  label: string,
  wallets: WalletPortfolio[],
  chainIdFallback: number | null,
): WalletHistoryEvent | null {
  if (!raw) return null;
  const walletAddress = address.toLowerCase();
  const from = toStringOrNull(raw.from_address ?? raw.fromAddress) ?? null;
  const to = toStringOrNull(raw.to_address ?? raw.toAddress) ?? null;
  const decoded = asRecord(raw.decoded);
  const decodedName = toStringOrNull(decoded?.label ?? decoded?.name);
  const name =
    toStringOrNull(raw.token_name ?? raw.asset_name) ??
    decodedName ??
    null;
  const symbol = toStringOrNull(raw.symbol ?? raw.token_symbol ?? raw.asset_symbol) ?? null;
  const amount = raw.value != null ? String(raw.value) : null;
  const priceUsd =
    toNumber(raw.price_usd ?? raw.total_price_usd ?? raw.totalValueUsd ?? raw.total_value_usd) ?? null;
  const chainId = chainIdFallback ?? null;
  const tokenAddressRaw = toStringOrNull(raw.token_address ?? raw.contract_address ?? raw.token_contract_address) ?? null;
  const tokenAddress = tokenAddressRaw ? tokenAddressRaw.toLowerCase() : null;
  const metadataRecord = asRecord(raw.metadata);
  const thumb = toStringOrNull(raw.image_url ?? raw.token_logo ?? raw.nft_image ?? metadataRecord?.image) ?? null;
  const tokenId = toStringOrNull(raw.token_id ?? raw.tokenId) ?? null;
  const txHash = toStringOrNull(raw.hash ?? raw.transaction_hash ?? raw.transactionHash) ?? null;
  const timestamp = normalizeTimestamp(raw.block_timestamp ?? raw.blockTimestamp ?? raw.timestamp);

  const type = classifyType(walletAddress, from, to, decodedName, tokenAddress, raw.value);
  const walletLabel = labelForAddress(walletAddress, wallets) ?? label;

  return {
    id: String(txHash ?? `${walletAddress}-${Math.random()}`),
    timestamp,
    walletLabel,
    walletAddress: address,
    type,
    name,
    symbol,
    amount,
    priceUsd,
    chainId,
    tokenAddress,
    tokenId,
    thumb,
    source: "evm",
    txHash,
  } satisfies WalletHistoryEvent;
}

function normalizeTimestamp(input: unknown): number | null {
  if (typeof input === "number") {
    return input > 1_000_000_000_000 ? input : input * 1000;
  }
  if (typeof input === "string") {
    const parsed = Date.parse(input);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function deriveType(address: string, from?: string | null, to?: string | null): WalletHistoryEvent["type"] {
  if (!address) return "transfer";
  const a = address.toLowerCase();
  const f = (from ?? "").toLowerCase();
  const t = (to ?? "").toLowerCase();
  if (f === a && t !== a) return "send";
  if (t === a && f !== a) return "receive";
  return "transfer";
}

function classifyType(
  walletAddress: string,
  from?: string | null,
  to?: string | null,
  decodedName?: string | null,
  contractAddress?: string | null,
  value?: unknown,
): WalletHistoryEvent["type"] {
  const base = deriveType(walletAddress, from, to);
  const fn = (decodedName ?? "").toLowerCase();
  if (fn.includes("swap") || fn.includes("exactinput") || fn.includes("exactoutput") || fn.includes("trade")) {
    return "sell";
  }
  if (fn.includes("stake") || fn.includes("deposit") || fn.includes("delegate") || fn.includes("bond")) {
    return "contract";
  }
  if (fn.includes("withdraw") || fn.includes("unstake") || fn.includes("redeem") || fn.includes("claim")) {
    return "contract";
  }
  if (!to || to === "0x" || (contractAddress && !to)) {
    return "contract";
  }
  if ((value == null || value === "0" || value === 0) && fn) {
    return "contract";
  }
  return base;
}

function labelForAddress(address: string, portfolios: WalletPortfolio[]): string {
  const normalized = address.toLowerCase();
  const target = portfolios.find((w) => {
    const signer = resolveSignerAddress(w)?.toLowerCase();
    if (signer === normalized) return true;
    const smart = resolveSmartAccountAddress(w)?.toLowerCase();
    return smart === normalized;
  });
  if (target) {
    return resolveWalletLabel(target);
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function fetchAgentTradeHistory(userId: string): Promise<WalletHistoryEvent[]> {
  try {
    const service = createServiceRoleClient();

    const { data: agents, error: agentsError } = await service
      .from("agent")
      .select("id,name")
      .eq("owner_user_id", userId)
      .limit(200);
    if (agentsError) {
      logger.warn("wallet_history_agent_trades_agents_failed", agentsError);
      return [];
    }
    const agentRows = (agents ?? []) as Array<{ id: string; name: string | null }>;
    if (agentRows.length === 0) return [];

    const agentIds = agentRows.map((row) => row.id);
    const agentNames = new Map(agentRows.map((row) => [row.id, row.name]));

    const { data: trades, error: tradesError } = await service
      .from("agent_trade")
      .select("id,agent_id,executed_at,side,base_asset,quote_asset,amount,notional_usd,pnl_usd,fees_usd,tx_hash,venue,chain_id,wallet_address")
      .in("agent_id", agentIds)
      .order("executed_at", { ascending: false })
      .limit(150);

    if (tradesError) {
      logger.warn("wallet_history_agent_trades_failed", tradesError);
      return [];
    }

    type AgentTradeRow = JsonObject;
    return (trades ?? []).map((row: AgentTradeRow) => {
      const executedAt = typeof row.executed_at === "string" ? Date.parse(row.executed_at) : null;
      const type = typeof row.side === "string" ? (row.side as WalletHistoryEvent["type"]) : "contract";
      const base = typeof row.base_asset === "string" ? row.base_asset : null;
      const quote = typeof row.quote_asset === "string" ? row.quote_asset : null;
      const amount = row.amount != null ? String(row.amount) : null;
      const notionalUsd = row.notional_usd != null ? Number(row.notional_usd) : null;
      const pnlUsd = row.pnl_usd != null ? Number(row.pnl_usd) : null;
      const feesUsd = row.fees_usd != null ? Number(row.fees_usd) : null;
      const agentName = typeof agentNames.get(String(row.agent_id)) === "string" ? agentNames.get(String(row.agent_id)) : null;
      const walletLabel = agentName ? `Agent • ${agentName}` : "Agent";
      const walletAddress = typeof row.wallet_address === "string" && row.wallet_address.trim()
        ? row.wallet_address
        : `agent:${String(row.agent_id)}`;

      return {
        id: `agent_trade:${String(row.id)}`,
        timestamp: executedAt && Number.isFinite(executedAt) ? executedAt : null,
        walletLabel,
        walletAddress,
        type,
        name: base && quote ? `${base}/${quote}` : (base ?? null),
        symbol: base,
        amount,
        priceUsd: Number.isFinite(notionalUsd) ? notionalUsd : null,
        chainId: typeof row.chain_id === "number" ? row.chain_id : null,
        tokenAddress: null,
        tokenId: null,
        thumb: null,
        source: "agent_trade",
        txHash: typeof row.tx_hash === "string" ? row.tx_hash : null,
        pnlUsd: Number.isFinite(pnlUsd) ? pnlUsd : null,
        feesUsd: Number.isFinite(feesUsd) ? feesUsd : null,
        venue: typeof row.venue === "string" ? row.venue : null,
      } satisfies WalletHistoryEvent;
    });
  } catch (error) {
    logger.warn("wallet_history_agent_trades_exception", error);
    return [];
  }
}
