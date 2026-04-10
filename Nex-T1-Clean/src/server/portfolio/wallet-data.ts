import "server-only";

import {
  mapSolanaPortfolioToUnifiedAssets,
} from "@/server/moralis/solana/wallet";
import { createLogger } from "@/server/logging/logging";
import {
  isNonZeroEVMAddress,
  isValidSolanaAddress,
} from "@/lib/utils/token-utils";
import { isSupportedCdpBalanceNetworkName } from "@/lib/networks/capabilities";
import {
  fetchNexEvmWalletSummary,
  fetchNexSolanaWalletSummary,
} from "@/server/services/nex/wallet-summary";

export interface Erc20TokenBalanceWithPrice {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string;
  usd_price: number;
  usd_price_24hr_percent_change: number;
  usd_price_7d_percent_change: number;
  usd_value: number;
  portfolio_percentage: number;
  priceHistory?: number[];
}

export type WalletPortfolioSnapshot = {
  address: string;
  chain: string;
  native: {
    balance: string;
    formatted: number;
  };
  tokens: Erc20TokenBalanceWithPrice[];
  nfts: UntypedJson[];
  defi: UntypedJson[];
  profitability: {
    total_usd_value: number;
    total_realized_pnl_usd: number;
    total_unrealized_pnl_usd: number;
    total_pnl_usd: number;
    total_pnl_percentage: number;
  };
  netWorthUsd: number;
  pnlUsd: number;
  pnlPercent: number;
};

const logger = createLogger("portfolio");

export function normalizePortfolioChain(
  input?: string | number | null,
): string {
  const raw = String(input ?? "solana")
    .trim()
    .toLowerCase();
  if (raw === "1" || raw === "0x1" || raw === "ethereum") return "ethereum";
  if (raw === "101" || raw === "solana") return "solana";
  return raw;
}

function assertValidAddress(address: string, chain: string) {
  if (!address) throw new Error("missing_address");
  if (chain === "solana") {
    if (!isValidSolanaAddress(address))
      throw new Error("invalid_solana_address");
    return;
  }
  if (!isNonZeroEVMAddress(address)) {
    throw new Error("invalid_evm_address");
  }
}
import { getCdpClient, isCdpServerConfigured } from "@/server/services/cdp/client";

function resolveEvmChainId(chain: string): number {
  switch (chain) {
    case "base":
      return 8453;
    case "optimism":
      return 10;
    case "arbitrum":
      return 42161;
    case "polygon":
      return 137;
    case "bsc":
      return 56;
    case "avalanche":
      return 43114;
    case "linea":
      return 59144;
    default:
      return 1;
  }
}

export async function fetchWalletPortfolioSnapshot(params: {
  address: string;
  chainId?: string | number | null;
}): Promise<WalletPortfolioSnapshot> {
  const chain = normalizePortfolioChain(params.chainId);
  const address = params.address.trim();

  assertValidAddress(address, chain);

  // SPLIT BRAIN LOGIC
  // 1. Solana -> Moralis
  if (chain === "solana") {
    const summary = await fetchNexSolanaWalletSummary(address, {
      includeTokens: true,
      includeNfts: true,
      includeTransactions: false,
    }).catch((error: unknown) => {
      logger.error("nex_sol_summary_failed", { error, address });
      return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null };
    });

    const unifiedAssets = mapSolanaPortfolioToUnifiedAssets(
      { assets: summary.tokens },
      { kind: "solana", network: "mainnet" },
    );

    const tokens: Erc20TokenBalanceWithPrice[] = unifiedAssets.map(t => ({
        token_address: t.address ?? "native",
        name: t.name ?? "Unknown",
        symbol: t.symbol ?? "???",
        logo: t.logoUrl ?? undefined,
        thumbnail: t.logoUrl ?? undefined,
        decimals: t.decimals ?? 0,
        balance: t.balance,
        usd_price: t.priceUsd ?? 0,
        usd_price_24hr_percent_change: t.change24hPercent ?? 0,
        usd_price_7d_percent_change: 0,
        usd_value: t.valueUsd ?? 0,
        portfolio_percentage: 0
    }));

    const totalNetWorth = tokens.reduce((acc, t) => acc + t.usd_value, 0);
    const nativeToken = tokens.find((token) => token.symbol === "SOL");

    return {
      address,
      chain,
      native: { 
          balance: nativeToken?.balance ?? "0",
          formatted:
            nativeToken && nativeToken.decimals > 0
              ? Number(nativeToken.balance) / 10 ** nativeToken.decimals
              : 0,
      },
      tokens,
      nfts: summary.nfts,
      defi: [],
      profitability: {
        total_usd_value: totalNetWorth,
        total_realized_pnl_usd: 0,
        total_unrealized_pnl_usd: 0,
        total_pnl_usd: 0,
        total_pnl_percentage: 0,
      },
      netWorthUsd: totalNetWorth,
      pnlUsd: 0,
      pnlPercent: 0,
    };
  }

  // 2. EVM -> Nex summary
  try {
    const summary = await fetchNexEvmWalletSummary(address, {
      includeTokens: true,
      includeNfts: true,
      includeTransactions: false,
      chainIds: [resolveEvmChainId(chain)],
      limit: 50,
      skipCache: false,
    });
    const mappedTokens: Erc20TokenBalanceWithPrice[] = summary.tokens.map((token) => ({
      token_address: token.contract ?? "native",
      name: token.name ?? "Unknown",
      symbol: token.symbol ?? "???",
      logo: token.logoURI ?? undefined,
      thumbnail: token.logoURI ?? undefined,
      decimals: token.decimals,
      balance: String(token.balance),
      usd_price: token.priceUsd ?? 0,
      usd_price_24hr_percent_change: token.priceChange24h ?? 0,
      usd_price_7d_percent_change: 0,
      usd_value: token.valueUsd ?? 0,
      portfolio_percentage: 0,
    }));
    const totalNetWorth = mappedTokens.reduce((sum, token) => sum + token.usd_value, 0);
    const nativeToken = mappedTokens.find((token) => token.token_address === "native");

    return {
      address,
      chain,
      native: {
        balance: nativeToken?.balance ?? "0",
        formatted: nativeToken ? Number(nativeToken.balance) : 0,
      },
      tokens: mappedTokens,
      nfts: summary.nfts,
      defi: [],
      profitability: {
        total_usd_value: totalNetWorth,
        total_realized_pnl_usd: 0,
        total_unrealized_pnl_usd: 0,
        total_pnl_usd: 0,
        total_pnl_percentage: 0,
      },
      netWorthUsd: totalNetWorth,
      pnlUsd: 0,
      pnlPercent: 0,
    };
  } catch (error) {
    logger.error("nex_portfolio_failed", { error, address, chain });
    // Return empty state on critical failure
    return {
      address,
      chain,
      native: { balance: "0", formatted: 0 },
      tokens: [],
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
    };
  }
}

// ---------------------------------------------------------------------------
// CDP Balance Fetcher (supplements Moralis data for Nex Wallet (EVM) wallets)
// ---------------------------------------------------------------------------

/**
 * Fetch token balances for an EVM address directly from CDP SDK.
 *
 * This is useful as a fallback when Moralis is unavailable or to get
 * CDP-native balance data for Smart Account wallets.
 *
 * Note: CDP only supports base, base-sepolia, and ethereum.
 * For other chains, use the Moralis-based `fetchWalletPortfolioSnapshot`.
 */
export async function fetchCdpTokenBalances(params: {
  address: string;
  network?: string;
}): Promise<Erc20TokenBalanceWithPrice[]> {
  if (!isCdpServerConfigured()) {
    return [];
  }

  // Validate EVM address format before passing to CDP SDK
  if (!isNonZeroEVMAddress(params.address)) {
    logger.warn("cdp_balance_invalid_address", { address: params.address });
    return [];
  }

  const networkRaw = (params.network ?? "base").toLowerCase().trim();
  const network = isSupportedCdpBalanceNetworkName(networkRaw)
    ? networkRaw
    : null;

  if (!network) {
    logger.warn("cdp_balance_unsupported_network", { network: networkRaw });
    return [];
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    return [];
  }

  try {
    const result = await cdp.evm.listTokenBalances({
      address: params.address as `0x${string}`,
      network: network as Parameters<typeof cdp.evm.listTokenBalances>[0]["network"],
    });

    return (result.balances ?? []).map((tb: { token: { contractAddress?: string; network?: string; symbol?: string; name?: string }; amount: { amount: bigint; decimals: number } }) => {
      const decimals = Number(tb.amount?.decimals ?? 18);
      const rawAmount = tb.amount?.amount ?? BigInt(0);

      return {
        token_address: String(tb.token?.contractAddress ?? "native"),
        name: tb.token?.name ?? "Unknown",
        symbol: tb.token?.symbol ?? "???",
        logo: undefined,
        thumbnail: undefined,
        decimals,
        balance: String(rawAmount),
        // CDP does not return USD price data — consumers must enrich separately
        usd_price: 0,
        usd_price_24hr_percent_change: 0,
        usd_price_7d_percent_change: 0,
        usd_value: 0,
        portfolio_percentage: 0,
      };
    });
  } catch (error) {
    logger.error("cdp_token_balances_failed", {
      error: error instanceof Error ? error.message : String(error),
      address: params.address,
      network,
    });
    return [];
  }
}
