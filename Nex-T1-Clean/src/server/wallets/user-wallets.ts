import type { WalletPortfolio, WalletChainSummary } from "@/lib/user/profile";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getOrSet } from "@/server/services/redis/cache";
import { listWalletPortfolios } from "@/server/wallets/wallet-store";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { ingestWalletAnalytics } from "@/server/wallet-analytics/ingest";
import { getUserWalletAnalytics } from "@/server/wallet-analytics/query";
import { withTimeoutFallback } from "@/lib/utils/timeout";
import { getErrorMessage } from "@/lib/utils/error";


import { logger } from '@/lib/logger';
const NS = "user_wallets" as const;

// Increased cache TTL - wallet list doesn't change frequently
const WALLET_CACHE_TTL = Number(process.env.USER_WALLETS_CACHE_TTL ?? 90); // 90 seconds
const WALLET_STALE_TTL = Number(process.env.USER_WALLETS_STALE_TTL ?? 300); // 5 min stale

const SAFE_WALLET_ACCOUNT_COLUMNS =
  "id,wallet_id,chain_id,safe_address,address,status,last_error,metadata,label,provider,wallet_type";
const CROSSMINT_WALLET_ACCOUNT_COLUMNS = "id,wallet_id,address,status,last_error,metadata,label";
const CDP_WALLET_ACCOUNT_COLUMNS = "id,wallet_id,chain_id,address,status,last_error,metadata,label,platform,wallet_type";

export async function resolveUserWallets(userId: string): Promise<WalletPortfolio[]> {
  const cacheKey = `user:${userId}:wallets:aggregate:v3`;

  return getOrSet(
    cacheKey,
    async () => {
      const [agentWallets, registered, safeAccounts, crossmintAccounts, cdpAccounts] = await Promise.all([
        listWalletPortfolios(userId).catch<WalletPortfolio[]>(() => []),
        listRegisteredWalletRecords(userId).catch<RegisteredWalletRecord[]>(() => []),
        listSafeWalletAccountRecords(userId).catch<SafeWalletAccountRecord[]>(() => []),
        listCrossmintWalletAccountRecords(userId).catch<CrossmintWalletAccountRecord[]>(() => []),
        listCdpWalletAccountRecords(userId).catch<CdpWalletAccountRecord[]>(() => []),
      ]);

      const out: WalletPortfolio[] = [];
      const byId = new Set<string>();
      const byAddr = new Set<string>();

      const push = (w: WalletPortfolio) => {
        const id = w.walletId;
        const addr = typeof w.address === "string" ? w.address.toLowerCase() : "";
        if (byId.has(id) || (addr && byAddr.has(addr))) return;
        out.push(w);
        byId.add(id);
        if (addr) byAddr.add(addr);
      };

      // Nex Wallets first (primary embedded wallets)
      cdpAccounts.map(buildCdpWallet).forEach(push);
      agentWallets.forEach(push);
      registered.map(buildRegisteredWallet).forEach(push);
      safeAccounts.map(buildSafeWallet).forEach(push);
      crossmintAccounts.map(buildCrossmintWallet).forEach(push);

      return out;
    },
    {
      ttlSeconds: WALLET_CACHE_TTL,
      staleTtlSeconds: WALLET_STALE_TTL,
      coalesce: true,
      lockTtlSeconds: 10,
      namespace: NS,
      serialize: (v) => JSON.stringify(v),
      deserialize: (raw) => {
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          return Array.isArray(parsed) ? (parsed as WalletPortfolio[]) : [];
        } catch {
          return [];
        }
      },
    },
  );
}

export async function getEnrichedUserWallets(userId: string) {
  const cacheKey = `user:wallets:enriched:${userId}:v1`;
  
  const walletsResult = await withTimeoutFallback(
    getOrSet(
      cacheKey,
      async () => {
        const [wallets] = await Promise.all([
          resolveUserWallets(userId).catch(() => []),
          ingestWalletAnalytics(userId, { includeTransactions: false }).catch(() => {}),
        ]);

        let analyticsMap: Record<string, UntypedJson> = {};
        try {
          const map = await getUserWalletAnalytics(userId);
          analyticsMap = Object.fromEntries(map);
        } catch (error) {
          logger.warn("wallet_analytics_fetch_failed", getErrorMessage(error, ""));
          analyticsMap = {};
        }

        return { wallets, analyticsMap };
      },
      {
        ttlSeconds: 45,
        staleTtlSeconds: 180,
        coalesce: true,
        lockTtlSeconds: 30,
        namespace: "user_wallets",
      }
    ),
    {
      timeoutMs: 30_000,
      scope: "user:wallets",
      fallback: () => ({ wallets: [], analyticsMap: {} }),
      onTimeout: () => {
        logger.warn("[getEnrichedUserWallets] Timeout after 30s, serving empty wallets");
      },
    }
  );

  const { wallets, analyticsMap } = walletsResult;

  const enriched = wallets.map((wallet) => {
    const analytics = (analyticsMap as Record<string, UntypedJson>)[wallet.walletId] ?? null;
    const totals = analytics?.totals ?? null;
    const metadata =
      wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
        ? { ...wallet.metadata }
        : {};

    if (totals) {
      metadata.balances = {
        nativeUsd: totals.nativeValueUsd ?? null,
        tokenUsd: totals.tokenValueUsd ?? null,
        nftUsd: totals.nftValueUsd ?? null,
        totalUsd: totals.valueUsd ?? null,
      };
    }

    return {
      ...wallet,
      netWorthUsd: totals?.valueUsd ?? wallet.netWorthUsd ?? null,
      change24hPercent: totals?.change24hPercent ?? wallet.change24hPercent ?? null,
      gainLoss24hUsd: totals?.unrealizedPnlUsd ?? wallet.gainLoss24hUsd ?? null,
      metadata,
      analytics,
    };
  });

  return enriched;
}



export async function invalidateUserWalletsCache(userId: string) {
  try {
    const { redis } = await import("@/server/services/redis");
    const keys = [
      `user:${userId}:wallets:aggregate:v3`,
      `user:${userId}:wallets:aggregate:v2`,
      `user:${userId}:wallets:aggregate:v1`,
      // Also invalidate summary cache used by sidebar flyout
      `user:${userId}:wallets:summary:v2`,
      `wallet_summary:${userId}:wallets:summary:v2`, // Fallback/Namespace pattern check if needed, but the route uses user:${userId}:wallets:summary:v2
    ];
    await redis.del(...keys);
  } catch { }
}

export type RegisteredWalletRecord = {
  id: string;
  address: string;
  wallet_type: string;
  chain_id: number | null;
  cluster: string | null;
  label: string | null;
  metadata: Record<string, UntypedJson> | null;
};

export async function listRegisteredWalletRecords(userId: string): Promise<RegisteredWalletRecord[]> {
  const supabase = getSupabaseAdminClient();
  // Bypass RLS using admin client
  
  const { data, error } = await supabase
    .from("user_wallets")
    .select("id,address,wallet_type,chain_id,cluster,label,metadata")
    .eq("user_id", userId);

  if (error || !Array.isArray(data)) {
    logger.error("[user-wallets] failed to load registered wallets", error);
    return [];
  }

  return data as RegisteredWalletRecord[];
}

export type SafeWalletAccountRecord = {
  id: string; // Ensure ID is selected
  wallet_id: string | null;
  chain_id: number | string | null;
  safe_address: string | null;
  address: string | null;
  status: string | null;
  last_error: string | null;
  metadata: Record<string, UntypedJson> | null;
  label: string | null;
  provider: string | null;
  wallet_type: string | null;
};

export async function listSafeWalletAccountRecords(userId: string): Promise<SafeWalletAccountRecord[]> {
  const supabase = getSupabaseAdminClient();
  // Bypass RLS using admin client

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select(SAFE_WALLET_ACCOUNT_COLUMNS)
    .eq("user_id", userId)
    .in("wallet_type", ["safe", "smart_wallet"]);

  if (error || !Array.isArray(data)) {
    logger.error("[user-wallets] failed to load safe wallet accounts", error);
    return [];
  }

  return data as SafeWalletAccountRecord[];
}

export type CrossmintWalletAccountRecord = {
  id: string;
  wallet_id: string | null;
  address: string | null;
  status: string | null;
  last_error: string | null;
  metadata: Record<string, UntypedJson> | null;
  label: string | null;
};

export async function listCrossmintWalletAccountRecords(userId: string): Promise<CrossmintWalletAccountRecord[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select(CROSSMINT_WALLET_ACCOUNT_COLUMNS)
    .eq("user_id", userId)
    .eq("wallet_type", "crossmint");

  if (error || !Array.isArray(data)) {
    logger.error("[user-wallets] failed to load crossmint wallet accounts", error);
    return [];
  }

  return data as CrossmintWalletAccountRecord[];
}

function normalizeSafeAddress(value: string | null): string | null {
  if (!value) return null;
  return isNonZeroEVMAddress(value) ? value : null;
}

function parseChainId(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRegisteredWallet(entry: RegisteredWalletRecord): WalletPortfolio {
  // Use DB UUID as walletId for consistency with token_holdings
  const walletId = entry.id; 
  const chainId = typeof entry.chain_id === "number" ? entry.chain_id : null;
  const cluster = typeof entry.cluster === "string" ? entry.cluster : null;

  const topChains: WalletChainSummary[] = (() => {
    if (entry.wallet_type.includes("solana")) {
      return [
        {
          name: cluster === "devnet" ? "Solana Devnet" : "Solana",
          icon: "/icons/chain-icons/solana.svg",
          type: cluster === "devnet" ? "testnet" : "mainnet",
        },
      ];
    }
    if (entry.wallet_type.includes("hyperliquid")) {
      return [{ name: "Hyperliquid", icon: "/icons/chain-icons/hyperliquid.svg", type: "mainnet" }];
    }
    if (chainId === 8453) return [{ name: "Base", icon: "/icons/chain-icons/base.svg", type: "mainnet" }];
    if (chainId === 42161) return [{ name: "Arbitrum One", icon: "/icons/chain-icons/arbitrum.svg", type: "mainnet" }];
    return [{ name: "Ethereum", icon: "/icons/chain-icons/eth.svg", type: "mainnet" }];
  })();

  return {
    walletId,
    walletType: "external_connected",
    walletTypeIcon: "/assets/wallet-logos/Safe-Wallet.svg",
    providerName: "Connected Wallet",
    change24hPercent: typeof entry.metadata?.change24h === 'number' ? entry.metadata.change24h : null,
    gainLoss24hUsd: typeof entry.metadata?.pnl24h === 'number' ? entry.metadata.pnl24h : null,
    topAssets: [],
    topChains,
    netWorthUsd: null,
    label: entry.label ?? (entry.address ? `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}` : "Wallet"),
    customLabel: entry.label,
    address: entry.address,
    metadata: {
      walletType: entry.wallet_type,
      chainId,
      cluster,
      ...(entry.metadata ?? {}),
    },
  };
}

function buildSafeWallet(entry: SafeWalletAccountRecord): WalletPortfolio {
  const chainId = parseChainId(entry.chain_id);
  const safeAddress = normalizeSafeAddress(typeof entry.safe_address === "string" ? entry.safe_address : null) ??
    normalizeSafeAddress(typeof entry.address === "string" ? entry.address : null);
  const status = typeof entry.status === "string" ? entry.status : "unknown";
  const customLabel =
    entry.label ??
    (typeof entry.metadata?.label === "string" && entry.metadata.label.trim().length > 0 ? entry.metadata.label : null);

  const topChains: WalletChainSummary[] = (() => {
    if (chainId === 8453) return [{ name: "Base", icon: "/icons/chain-icons/base.svg", type: "mainnet" }];
    if (chainId === 10) return [{ name: "Optimism", icon: "/icons/chain-icons/optimism.svg", type: "mainnet" }];
    if (chainId === 56) return [{ name: "BNB Chain", icon: "/icons/chain-icons/bnb-chain.svg", type: "mainnet" }];
    return [{ name: `Chain ${chainId ?? "?"}`, icon: "/icons/chain-icons/eth.svg", type: "mainnet" }];
  })();

  return {
    walletId: typeof entry.wallet_id === "string" && entry.wallet_id.trim().length > 0 ? entry.wallet_id : entry.id,
    walletType: "agent_generated",
    walletTypeIcon: "/assets/wallet-logos/Safe-Wallet.svg",
    providerName: "Safe Smart Account",
    change24hPercent: typeof entry.metadata?.change24h === 'number' ? entry.metadata.change24h : null,
    gainLoss24hUsd: typeof entry.metadata?.pnl24h === 'number' ? entry.metadata.pnl24h : null,
    topAssets: [],
	    topChains,
	    netWorthUsd: null,
	    label: customLabel ?? (safeAddress ? `Safe ${safeAddress.slice(0, 6)}` : "Safe Wallet (Pending)"),
	    customLabel,
	    address: safeAddress, // Can be null if pending
	    metadata: {
	      kind: "evm",
	      provider: "safe",
      chainId,
      smartAccountAddress: safeAddress,
      status,
      lastError: entry.last_error ?? null,
      accountId: entry.id,
      ...(entry.metadata ?? {}),
    },
    analytics: null,
  };
}

function buildCrossmintWallet(entry: CrossmintWalletAccountRecord): WalletPortfolio {
  const rawKind = typeof entry.metadata?.kind === "string" ? entry.metadata.kind.trim().toLowerCase() : "";
  const kindFromId =
    typeof entry.wallet_id === "string" ? (entry.wallet_id.split(":")[1]?.trim().toLowerCase() ?? "") : "";
  const kind = rawKind === "solana" || rawKind === "stellar" ? rawKind : kindFromId;
  const env = typeof entry.metadata?.crossmintEnv === "string" ? String(entry.metadata.crossmintEnv).toLowerCase() : "";
  const isTestnet = env === "staging";

  const chain: WalletChainSummary =
    kind === "stellar"
      ? {
          name: isTestnet ? "Stellar Testnet" : "Stellar",
          icon: "/icons/chain-icons/stellar.svg",
          type: isTestnet ? "testnet" : "mainnet",
        }
      : {
          name: isTestnet ? "Solana Devnet" : "Solana",
          icon: "/icons/chain-icons/solana.svg",
          type: isTestnet ? "testnet" : "mainnet",
        };

  const address = typeof entry.address === "string" && entry.address.trim().length > 0 ? entry.address.trim() : null;
  const status = typeof entry.status === "string" ? entry.status : "unknown";
  const walletId =
    typeof entry.wallet_id === "string" && entry.wallet_id.trim().length > 0 ? entry.wallet_id.trim() : entry.id;

  const label =
    entry.label ??
    (typeof entry.metadata?.label === "string" && entry.metadata.label.trim().length > 0 ? entry.metadata.label : null) ??
    (address
      ? `${kind === "stellar" ? "Stellar" : "Solana"} ${address.slice(0, 6)}...${address.slice(-4)}`
      : `Crossmint ${kind === "stellar" ? "Stellar" : "Solana"} Wallet`);

  const metadata: Record<string, UntypedJson> = {
    provider: "crossmint",
    source: "crossmint",
    kind: kind || "unknown",
    status,
    lastError: entry.last_error ?? null,
    accountId: entry.id,
    ...(entry.metadata ?? {}),
  };

  return {
    walletId,
    walletType: "embedded",
    walletTypeIcon: "/assets/wallet-logos/Safe-Wallet.svg",
    providerName: kind === "stellar" ? "Crossmint Stellar Wallet" : "Crossmint Solana Wallet",
    change24hPercent: null,
    gainLoss24hUsd: null,
    topAssets: [],
    topChains: [chain],
    netWorthUsd: null,
    label,
    customLabel: entry.label,
    address,
    metadata,
    analytics: null,
  };
}

// ---------------------------------------------------------------------------
// Nex Wallets
// ---------------------------------------------------------------------------

export type CdpWalletAccountRecord = {
  id: string;
  wallet_id: string | null;
  chain_id: number | null;
  address: string | null;
  status: string | null;
  last_error: string | null;
  metadata: Record<string, UntypedJson> | null;
  label: string | null;
  platform: string | null;
  wallet_type: string | null;
};

function isCdpWalletAccountRecord(entry: CdpWalletAccountRecord): boolean {
  const walletType = typeof entry.wallet_type === "string" ? entry.wallet_type.trim().toLowerCase() : "";
  const walletId = typeof entry.wallet_id === "string" ? entry.wallet_id.trim().toLowerCase() : "";
  const provider = typeof entry.metadata?.provider === "string" ? entry.metadata.provider.trim().toLowerCase() : "";
  const source = typeof entry.metadata?.source === "string" ? entry.metadata.source.trim().toLowerCase() : "";

  return walletType === "cdp" || walletId.startsWith("cdp:") || provider === "cdp" || source === "cdp";
}

export async function listCdpWalletAccountRecords(userId: string): Promise<CdpWalletAccountRecord[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("wallet_accounts")
    .select(CDP_WALLET_ACCOUNT_COLUMNS)
    .eq("user_id", userId);

  if (error || !Array.isArray(data)) {
    logger.error("[user-wallets] failed to load Nex Wallet accounts", error);
    return [];
  }

  return (data as CdpWalletAccountRecord[]).filter(isCdpWalletAccountRecord);
}

function buildCdpWallet(entry: CdpWalletAccountRecord): WalletPortfolio {
  const platform = typeof entry.platform === "string" ? entry.platform.trim().toLowerCase() : "";
  const isSolana = platform === "solana";
  const chainId = parseChainId(entry.chain_id);
  const address = typeof entry.address === "string" && entry.address.trim().length > 0 ? entry.address.trim() : null;
  const status = typeof entry.status === "string" ? entry.status : "unknown";
  const walletId =
    typeof entry.wallet_id === "string" && entry.wallet_id.trim().length > 0 ? entry.wallet_id.trim() : entry.id;

  const topChains: WalletChainSummary[] = isSolana
    ? [{ name: "Solana", icon: "/icons/chain-icons/solana.svg", type: "mainnet" }]
    : (() => {
        if (chainId === 8453) return [{ name: "Base", icon: "/icons/chain-icons/base.svg", type: "mainnet" }];
        if (chainId === 1) return [{ name: "Ethereum", icon: "/icons/chain-icons/eth.svg", type: "mainnet" }];
        if (chainId === 42161) return [{ name: "Arbitrum One", icon: "/icons/chain-icons/arbitrum.svg", type: "mainnet" }];
        return [{ name: "Base", icon: "/icons/chain-icons/base.svg", type: "mainnet" }];
      })();

  const customLabel =
    entry.label ??
    (typeof entry.metadata?.label === "string" && entry.metadata.label.trim().length > 0 ? entry.metadata.label : null);

  const label =
    customLabel ??
    (address
      ? `${isSolana ? "Nex Wallet (SOL)" : "Nex Wallet (EVM)"} ${address.slice(0, 6)}...${address.slice(-4)}`
      : (isSolana ? "Nex Wallet (SOL)" : "Nex Wallet (EVM)"));

  const accountType = typeof entry.metadata?.accountType === "string" ? entry.metadata.accountType : (isSolana ? "eoa" : "smart");

  const metadata: Record<string, UntypedJson> = {
    kind: isSolana ? "solana" : "evm",
    provider: "cdp",
    source: "cdp",
    embedded: true,
    accountType,
    status,
    lastError: entry.last_error ?? null,
    accountId: entry.id,
    ...(entry.metadata ?? {}),
  };

  return {
    walletId,
    walletType: "embedded",
    walletTypeIcon: "/assets/wallet-logos/Coinbase.svg",
    providerName: isSolana ? "Nex Wallet (SOL)" : "Nex Wallet (EVM)",
    change24hPercent: null,
    gainLoss24hUsd: null,
    topAssets: [],
    topChains,
    netWorthUsd: null,
    label,
    customLabel,
    address,
    metadata,
    analytics: null,
  };
}
