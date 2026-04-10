import { describe, it, expect, vi, beforeEach } from "vitest";
import { PortfolioService } from "@/server/services/portfolio-service";
import { redis } from "@/server/services/redis";
import { createClient } from "@/server/services/supabase/server";
import { fetchWalletPortfolioSnapshot } from "@/server/portfolio/wallet-data";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { getEvmWalletHistory } from "@/server/moralis/evm/wallet";
import { getSolanaWalletSwapTxs } from "@/server/moralis/solana/wallet";

vi.mock("@/server/services/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    trySetNx: vi.fn(),
    tryReleaseLock: vi.fn(),
    del: vi.fn(),
  },
  isRedisConfigured: true,
  isRedisInMemoryFallback: false,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/logging/logging", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("@/server/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/server/portfolio/wallet-data", () => ({
  fetchWalletPortfolioSnapshot: vi.fn(),
}));

vi.mock("@/server/wallets/user-wallets", () => ({
  resolveUserWallets: vi.fn(),
}));

vi.mock("@/server/moralis/evm/wallet", () => ({
  getEvmWalletHistory: vi.fn(),
  mapEvmHistoryToUnified: vi.fn(() => []),
  toUnifiedEvmChain: vi.fn((chainId: number) => ({ kind: "evm", chain: `0x${chainId.toString(16)}` })),
}));

vi.mock("@/server/moralis/solana/wallet", () => ({
  getSolanaWalletSwapTxs: vi.fn(),
  mapSolanaSwapsToUnified: vi.fn(() => []),
}));

describe("PortfolioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK");
    vi.mocked(getEvmWalletHistory).mockResolvedValue({ items: [], cursor: null });
    vi.mocked(getSolanaWalletSwapTxs).mockResolvedValue([]);

    const query = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    });
    vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  describe("getAggregatedPortfolio", () => {
    it("should return cached data if available", async () => {
      const mockResult = { totalNetWorthUsd: 1000, wallets: [], assets: [], transactions: [] };
      vi.mocked(redis.get).mockResolvedValue(mockResult);

      const result = await PortfolioService.getAggregatedPortfolio("user123");
      
      expect(result).toEqual(mockResult);
      expect(redis.get).toHaveBeenCalledWith("portfolio:user123:aggregated");
    });

    it("falls back to resolveUserWallets when user_wallet_link has no rows", async () => {
      vi.mocked(resolveUserWallets).mockResolvedValue([
        {
          walletId: "wallet_1",
          walletType: "external_connected",
          providerName: "Connected Wallet",
          label: "Connected Wallet",
          topAssets: [],
          topChains: [],
          address: "0x1234567890abcdef1234567890abcdef12345678",
          metadata: { chainId: 8453 },
        },
      ]);

      vi.mocked(fetchWalletPortfolioSnapshot).mockResolvedValue({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chain: "8453",
        native: { balance: "0", formatted: 0 },
        tokens: [],
        nfts: [],
        defi: [],
        profitability: {
          total_usd_value: 42,
          total_realized_pnl_usd: 0,
          total_unrealized_pnl_usd: 0,
          total_pnl_usd: 0,
          total_pnl_percentage: 0,
        },
        netWorthUsd: 42,
        pnlUsd: 0,
        pnlPercent: 0,
      });

      const result = await PortfolioService.getAggregatedPortfolio("user123");

      expect(resolveUserWallets).toHaveBeenCalledWith("user123");
      expect(fetchWalletPortfolioSnapshot).toHaveBeenCalledWith({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 8453,
      });
      expect(result.totalNetWorthUsd).toBe(42);
      expect(result.wallets).toHaveLength(1);
      expect(result.wallets[0]?.namespace).toBe("evm");
      expect(redis.set).toHaveBeenCalled();
    });

    it("falls back to resolveUserWallets when user_wallet_link is not accessible", async () => {
      const query = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "42501",
            message: "permission denied for table user_wallet_link",
          },
        }),
      };
      const from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      });
      vi.mocked(createClient).mockResolvedValue(
        { from } as unknown as Awaited<ReturnType<typeof createClient>>,
      );

      vi.mocked(resolveUserWallets).mockResolvedValue([
        {
          walletId: "wallet_permission_fallback",
          walletType: "agent_generated",
          providerName: "Coinbase",
          label: "Coinbase",
          topAssets: [],
          topChains: [],
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          metadata: { chainId: 8453, provider: "cdp" },
        },
      ]);

      vi.mocked(fetchWalletPortfolioSnapshot).mockResolvedValue({
        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        chain: "8453",
        native: { balance: "0", formatted: 0 },
        tokens: [
          {
            token_address: "0x4200000000000000000000000000000000000006",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
            balance: "1000000000000000000",
            usd_price: 3500,
            usd_value: 3500,
            logo: undefined,
            thumbnail: undefined,
            usd_price_24hr_percent_change: 1.25,
            usd_price_7d_percent_change: 2.75,
            portfolio_percentage: 100,
          },
        ],
        nfts: [],
        defi: [],
        profitability: {
          total_usd_value: 3500,
          total_realized_pnl_usd: 0,
          total_unrealized_pnl_usd: 0,
          total_pnl_usd: 0,
          total_pnl_percentage: 0,
        },
        netWorthUsd: 3500,
        pnlUsd: 0,
        pnlPercent: 0,
      });

      const result = await PortfolioService.getAggregatedPortfolio("user123");

      expect(resolveUserWallets).toHaveBeenCalledWith("user123");
      expect(result.totalNetWorthUsd).toBe(3500);
      expect(result.wallets).toHaveLength(1);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0]?.symbol).toBe("WETH");
    });

    it("treats fallback Nex Wallet (SOL) entries as solana instead of defaulting to EVM", async () => {
      const query = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "42501",
            message: "permission denied for table user_wallet_link",
          },
        }),
      };
      const from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      });
      vi.mocked(createClient).mockResolvedValue(
        { from } as unknown as Awaited<ReturnType<typeof createClient>>,
      );

      vi.mocked(resolveUserWallets).mockResolvedValue([
        {
          walletId: "wallet_solana_fallback",
          walletType: "embedded",
          providerName: "Nex Wallet (SOL)",
          label: "Nex Wallet (SOL)",
          topAssets: [],
          topChains: [],
          address: "GqZx4mJgrJSAXxFetoSrxSEBfPUehKbDuju7w27Ci8d6",
          metadata: { kind: "solana", provider: "cdp" },
        },
      ]);

      vi.mocked(fetchWalletPortfolioSnapshot).mockResolvedValue({
        address: "GqZx4mJgrJSAXxFetoSrxSEBfPUehKbDuju7w27Ci8d6",
        chain: "solana",
        native: { balance: "1000000000", formatted: 1 },
        tokens: [
          {
            token_address: "native",
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            balance: "1000000000",
            usd_price: 120,
            usd_value: 120,
            logo: undefined,
            thumbnail: undefined,
            usd_price_24hr_percent_change: 0,
            usd_price_7d_percent_change: 0,
            portfolio_percentage: 100,
          },
        ],
        nfts: [],
        defi: [],
        profitability: {
          total_usd_value: 120,
          total_realized_pnl_usd: 0,
          total_unrealized_pnl_usd: 0,
          total_pnl_usd: 0,
          total_pnl_percentage: 0,
        },
        netWorthUsd: 120,
        pnlUsd: 0,
        pnlPercent: 0,
      });

      const result = await PortfolioService.getAggregatedPortfolio("user123");

      expect(fetchWalletPortfolioSnapshot).toHaveBeenCalledWith({
        address: "GqZx4mJgrJSAXxFetoSrxSEBfPUehKbDuju7w27Ci8d6",
        chainId: "solana",
      });
      expect(getSolanaWalletSwapTxs).toHaveBeenCalledWith({
        address: "GqZx4mJgrJSAXxFetoSrxSEBfPUehKbDuju7w27Ci8d6",
        limit: 20,
        network: "mainnet",
      });
      expect(getEvmWalletHistory).not.toHaveBeenCalled();
      expect(result.wallets[0]?.namespace).toBe("solana");
      expect(result.assets[0]?.symbol).toBe("SOL");
    });
  });
});
