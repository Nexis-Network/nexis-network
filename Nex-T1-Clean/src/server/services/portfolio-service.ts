import "server-only";

import { createClient } from "@/server/services/supabase/server";
import { redis } from "@/server/services/redis";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import {
  fetchWalletPortfolioSnapshot,
  fetchCdpTokenBalances,
  type WalletPortfolioSnapshot,
} from "@/server/portfolio/wallet-data";
import { createLogger } from "@/server/logging/logging";
import type { WalletPortfolio } from "@/lib/user/profile";
import type {
  UnifiedFungibleAsset,
  UnifiedChain,
  UnifiedAssetKind,
  UnifiedTransaction,
} from "@/types/wallet-unified";
import {
  getEvmWalletHistory,
  mapEvmHistoryToUnified,
  toUnifiedEvmChain,
} from "@/server/moralis/evm/wallet";
import { getSolanaWalletSwapTxs, mapSolanaSwapsToUnified } from "@/server/moralis/solana/wallet";
import { isValidSolanaAddress } from "@/lib/utils/token-utils";

const logger = createLogger("portfolio-service");

type PortfolioWalletSource = {
  walletId: string;
  address: string;
  namespace: string;
  chainId: number | "solana";
  metadata?: Record<string, UntypedJson>;
  providerName?: string;
  /** Origin provider for provenance tracking (e.g. "cdp", "safe", "crossmint") */
  provider?: string;
  persistable: boolean;
};

function isLegacyWalletLinkReadError(error: unknown): boolean {
  if (!isRecord(error as UntypedJson)) {
    return false;
  }

  const errorRecord = error as Record<string, UntypedJson>;
  const code = typeof errorRecord.code === "string" ? errorRecord.code : null;
  const message =
    typeof errorRecord.message === "string" ? errorRecord.message.toLowerCase() : "";

  return (
    code === "42501" ||
    code === "42P01" ||
    message.includes("permission denied for table user_wallet_link") ||
    message.includes("relation \"user_wallet_link\" does not exist")
  );
}

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvmChainId(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  if (/^eip155:\d+$/u.test(raw)) {
    return Number.parseInt(raw.split(":")[1] ?? "", 10) || null;
  }

  if (/^0x[0-9a-f]+$/u.test(raw)) {
    const parsed = Number.parseInt(raw.slice(2), 16);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (/^\d+$/u.test(raw)) {
    return Number.parseInt(raw, 10) || null;
  }

  const alias: Record<string, number> = {
    ethereum: 1,
    eth: 1,
    base: 8453,
    optimism: 10,
    arbitrum: 42161,
    polygon: 137,
    bsc: 56,
    avalanche: 43114,
    linea: 59144,
  };

  return alias[raw] ?? null;
}

function parseSnapshotChainId(params: {
  address?: string | null;
  namespace?: UntypedJson;
  metadata?: Record<string, UntypedJson> | null;
  walletType?: string | null;
}): number | "solana" {
  const walletType = (params.walletType ?? "").toLowerCase();
  if (walletType.includes("solana")) {
    return "solana";
  }

  const address =
    typeof params.address === "string" ? params.address.trim() : "";
  if (address && isValidSolanaAddress(address)) {
    return "solana";
  }

  const namespace =
    typeof params.namespace === "string" ? params.namespace.trim().toLowerCase() : "";
  if (namespace === "solana") {
    return "solana";
  }

  const metadata = params.metadata ?? null;
  const candidates: UntypedJson[] = [
    metadata?.kind ?? null,
    metadata?.chainKind ?? null,
    metadata?.platform ?? null,
    metadata?.chainId ?? null,
    metadata?.chain_id ?? null,
    metadata?.chainNamespace ?? null,
    metadata?.namespace ?? null,
    metadata?.network ?? null,
    params.namespace ?? null,
  ];

  for (const candidate of candidates) {
    if (candidate === "solana" || candidate === "101" || candidate === 101) {
      return "solana";
    }

    const chainId = parseEvmChainId(candidate);
    if (typeof chainId === "number" && Number.isFinite(chainId) && chainId > 0) {
      return chainId;
    }
  }

  return 1;
}

function mapFallbackWallets(wallets: WalletPortfolio[]): PortfolioWalletSource[] {
  const sources: PortfolioWalletSource[] = [];

  for (const wallet of wallets) {
    const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
    if (!address) {
      continue;
    }

    const metadataCandidate = wallet.metadata ?? null;
    const metadata = isRecord(metadataCandidate) ? metadataCandidate : undefined;
    const chainId = parseSnapshotChainId({
      address,
      namespace: metadata?.chainNamespace ?? metadata?.namespace ?? null,
      metadata: metadata ?? null,
      walletType: wallet.walletType,
    });

    sources.push({
      walletId: wallet.walletId,
      address,
      namespace: chainId === "solana" ? "solana" : "evm",
      chainId,
      metadata,
      providerName: wallet.providerName ?? wallet.label ?? "Wallet",
      provider: typeof metadata?.provider === "string" ? metadata.provider : undefined,
      persistable: false,
    });
  }

  return sources;
}

export type AggregatedPortfolio = {
  totalNetWorthUsd: number;
  wallets: Array<{
    walletId: string;
    address: string;
    namespace: string;
    netWorthUsd: number;
    tokens: UnifiedFungibleAsset[];
    lastUpdated: string;
    metadata?: Record<string, UntypedJson>;
    providerName?: string;
  }>;
  assets: UnifiedFungibleAsset[]; // Flattened and unique list
  transactions: UnifiedTransaction[]; // Aggregated recent transactions
  lastRefreshed: string;
};

export class PortfolioService {
  /**
   * Fetches the aggregated portfolio for a user, using cache if available.
   */
  static async getAggregatedPortfolio(
    userId: string,
  ): Promise<AggregatedPortfolio> {
    const cacheKey = `portfolio:${userId}:aggregated`;

    // 1. Try Cache
    const cached = await redis.get<AggregatedPortfolio>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fetch linked wallets from user_wallet_link (legacy source)
    const supabase = await createClient();
    if (!supabase) throw new Error("supabase_client_init_failed");

    const { data: linkedWallets, error } = await supabase
      .from("user_wallet_link")
      .select("*")
      .eq("user_id", userId);

    const walletSources: PortfolioWalletSource[] = [];
    if (error && !isLegacyWalletLinkReadError(error)) {
      logger.error("fetch_wallets_failed", { userId, error });
      throw error;
    }

    if (error && isLegacyWalletLinkReadError(error)) {
      logger.warn("fetch_wallets_legacy_fallback", {
        userId,
        code: typeof error.code === "string" ? error.code : null,
        message: typeof error.message === "string" ? error.message : null,
      });
    }

    if (Array.isArray(linkedWallets) && linkedWallets.length > 0) {
      for (const wallet of linkedWallets) {
        const metadataCandidate = wallet.metadata ?? null;
        const metadata = isRecord(metadataCandidate) ? metadataCandidate : undefined;
        const chainId = parseSnapshotChainId({
          address: wallet.address,
          namespace: wallet.namespace,
          metadata: metadata ?? null,
          walletType: typeof wallet.wallet_type === "string" ? wallet.wallet_type : null,
        });
        walletSources.push({
          walletId: wallet.id,
          address: wallet.address,
          namespace: chainId === "solana" ? "solana" : "evm",
          chainId,
          metadata,
          providerName:
            (typeof wallet.provider === "string" && wallet.provider) ||
            (typeof wallet.label === "string" && wallet.label) ||
            "Wallet",
          persistable: true,
        });
      }
    } else {
      // Fallback to current wallet source used throughout the app shell.
      const fallbackWallets = await resolveUserWallets(userId).catch<WalletPortfolio[]>(() => []);
      walletSources.push(...mapFallbackWallets(fallbackWallets));
    }

    if (walletSources.length === 0) {
      return {
        totalNetWorthUsd: 0,
        wallets: [],
        assets: [],
        transactions: [],
        lastRefreshed: new Date().toISOString(),
      };
    }

    // 3. Aggregate data for all wallets
    const results = await Promise.all(
      walletSources.map(async (walletSource) => {
        try {
          const chainId = walletSource.chainId;
          const chainLabel = chainId === "solana" ? "solana" : String(chainId);

          // Fetch snapshot and transactions in parallel
          const isCdp = walletSource.provider === "cdp";
          const [snapshot, txs] = await Promise.all([
            fetchWalletPortfolioSnapshot({
              address: walletSource.address,
              chainId,
            }).catch(async (err) => {
              // For Nex Wallets, try CDP-native balance fetch as fallback
              if (isCdp && chainId !== "solana") {
                logger.warn("moralis_failed_trying_cdp_fallback", {
                  address: walletSource.address,
                  error: err instanceof Error ? err.message : String(err),
                });
                const cdpTokens = await fetchCdpTokenBalances({
                  address: walletSource.address,
                  network: chainId === 8453 ? "base" : chainId === 1 ? "ethereum" : "base",
                });
                return {
                  address: walletSource.address,
                  chain: String(chainId),
                  native: { balance: "0", formatted: 0 },
                  tokens: cdpTokens,
                  nfts: [],
                  defi: [],
                  profitability: {
                    total_usd_value: 0,
                    total_realized_pnl_usd: 0,
                    total_unrealized_pnl_usd: 0,
                    total_pnl_usd: 0,
                    total_pnl_percentage: 0,
                  },
                  netWorthUsd: 0,
                  pnlUsd: 0,
                  pnlPercent: 0,
                } satisfies WalletPortfolioSnapshot;
              }
              throw err;
            }),
            this.fetchWalletTransactions(walletSource.address, chainId),
          ]);

          if (walletSource.persistable) {
            const provenance = isCdp ? "cdp" : (chainId === "solana" ? "moralis" : "moralis");
            await Promise.all([
              this.persistSnapshot(walletSource.walletId, snapshot, provenance),
              this.persistTransactions(walletSource.walletId, txs),
            ]);
          }

          return {
            wallet: {
              walletId: walletSource.walletId,
              address: walletSource.address,
              namespace: walletSource.namespace,
              netWorthUsd: snapshot.netWorthUsd,
              tokens: snapshot.tokens.map((t) => ({
                id: `${t.token_address}-${chainLabel}`,
                chain: {
                  kind: chainId === "solana" ? "solana" : "evm",
                  ...(chainId === "solana"
                    ? { network: "mainnet" }
                    : { chain: `0x${chainId.toString(16)}` as `0x${string}` }),
                } as UnifiedChain,
                kind: "token" as UnifiedAssetKind,
                address: t.token_address,
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                balance: t.balance,
                balanceFormatted: (
                  Number(t.balance) / Math.pow(10, t.decimals)
                ).toFixed(4),
                priceUsd: t.usd_price,
                valueUsd: t.usd_value,
                logoUrl: t.logo || t.thumbnail || null,
                change24hPercent: t.usd_price_24hr_percent_change,
                isSpam: false,
              })),
              lastUpdated: new Date().toISOString(),
              metadata: {
                ...(walletSource.metadata ?? {}),
                chainId: chainId === "solana" ? "solana" : chainId,
              },
              providerName: walletSource.providerName,
            },
            transactions: txs,
          };
        } catch (e) {
          logger.error("wallet_aggregation_failed", {
            walletId: walletSource.walletId,
            address: walletSource.address,
            error: e,
          });
          return null;
        }
      }),
    );

    const validResults = results.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    // 4. Combine and deduplicate assets
    const allTokens = validResults.flatMap((r) => r.wallet.tokens);
    const assetMap = new Map<string, UnifiedFungibleAsset>();

    for (const token of allTokens) {
      const key = token.id;
      if (assetMap.has(key)) {
        const existing = assetMap.get(key)!;
        existing.valueUsd = (existing.valueUsd || 0) + (token.valueUsd || 0);

        try {
          const totalRaw =
            BigInt(existing.balance || "0") + BigInt(token.balance || "0");
          existing.balance = totalRaw.toString();
          const decimals = existing.decimals ?? 18;
          // Use integer division to avoid precision loss for balances > MAX_SAFE_INTEGER
          const divisor = 10n ** BigInt(decimals);
          const wholePart = totalRaw / divisor;
          const fracPart = (totalRaw % divisor).toString().padStart(decimals, "0").slice(0, 4);
          existing.balanceFormatted = `${wholePart}.${fracPart}`;
        } catch (e) {
          logger.warn("balance_aggregation_failed", { key, error: e });
        }
      } else {
        assetMap.set(key, { ...token });
      }
    }

    // 5. Aggregate and sort transactions
    const allTransactions = validResults
      .flatMap((r) => r.transactions)
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 50); // Keep only 50 most recent

    const aggregated: AggregatedPortfolio = {
      totalNetWorthUsd: validResults.reduce(
        (acc, r) => acc + r.wallet.netWorthUsd,
        0,
      ),
      wallets: validResults.map((r) => r.wallet),
      assets: Array.from(assetMap.values()).sort(
        (a, b) => (b.valueUsd || 0) - (a.valueUsd || 0),
      ),
      transactions: allTransactions,
      lastRefreshed: new Date().toISOString(),
    };

    // 6. Cache result
    await redis.set(cacheKey, aggregated, { ex: 60 }); // 1m cache

    return aggregated;
  }

  /**
   * Fetches transactions for a specific wallet, normalized to UnifiedTransaction.
   */
  private static async fetchWalletTransactions(
    address: string,
    chainId: string | number,
  ): Promise<UnifiedTransaction[]> {
    try {
      if (chainId === "solana") {
        // Use Moralis Swaps for Solana history (BirdEye removal)
        // detailed transaction history might be limited to swaps for now
        const swaps = await getSolanaWalletSwapTxs({
            network: "mainnet",
            address,
            limit: 20
        });

        // We need to map it. wallet.ts exports mapSolanaSwapsToUnified
        return mapSolanaSwapsToUnified(swaps, address, { kind: "solana", network: "mainnet" });
        
      } else {
        const evmChainId = Number(chainId);
        const history = await getEvmWalletHistory({
          address,
          chain: evmChainId,
        });
        return mapEvmHistoryToUnified(
          history.items,
          address,
          toUnifiedEvmChain(evmChainId),
        );
      }
    } catch (e) {
      logger.warn("fetch_wallet_transactions_failed", {
        address,
        chainId,
        error: e,
      });
      return [];
    }
  }

  /**
   * Persists a wallet snapshot to Supabase for historical tracking.
   */
  private static async persistSnapshot(
    walletId: string,
    snapshot: WalletPortfolioSnapshot,
    provenance?: string,
  ) {
    try {
      const supabase = await createClient();
      if (!supabase) return;

      const { error } = await supabase.from("holding_snapshots").insert({
        wallet_id: walletId,
        snapshot_data: snapshot.tokens,
        computed_net_worth: snapshot.netWorthUsd,
        provenance: provenance ?? (snapshot.chain === "solana" ? "moralis" : "moralis"),
      });

      if (error) {
        logger.error("persist_snapshot_failed", { walletId, error });
      }
    } catch (e) {
      logger.error("persist_snapshot_error", { walletId, error: e });
    }
  }

  /**
   * Persists transactions to Supabase.
   */
  private static async persistTransactions(
    wallet_id: string,
    transactions: UnifiedTransaction[],
  ) {
    try {
      const supabase = await createClient();
      if (!supabase) return;

      const records = transactions.map((tx) => ({
        id: `${tx.chain.kind}:${tx.hash}`,
        wallet_id,
        chain_type: tx.chain.kind,
        data: tx,
        timestamp: tx.timestamp
          ? new Date(tx.timestamp).toISOString()
          : new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("portfolio_transactions")
        .upsert(records, { onConflict: "id" });

      if (error) {
        logger.error("persist_transactions_failed", { wallet_id, error });
      }
    } catch (e) {
      logger.error("persist_transactions_error", { wallet_id, error: e });
    }
  }

  /**
   * Forces a refresh of the portfolio data for a user.
   */
  static async refreshPortfolio(userId: string): Promise<AggregatedPortfolio> {
    const lockKey = `portfolio:${userId}:refresh-lock`;
    const isLocked = !(await redis.trySetNx(lockKey, "locked", 30));

    if (isLocked) {
      logger.info("refresh_already_in_progress", { userId });
      return this.getAggregatedPortfolio(userId);
    }

    try {
      await redis.del(`portfolio:${userId}:aggregated`);
      return await this.getAggregatedPortfolio(userId);
    } finally {
      await redis.tryReleaseLock(lockKey, "locked");
    }
  }
}
