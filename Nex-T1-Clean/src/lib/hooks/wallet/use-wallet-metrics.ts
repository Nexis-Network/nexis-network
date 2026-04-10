import { useQuery } from "@tanstack/react-query";

interface WalletPortfolioParams {
    address?: string;
    chainFamily?: "evm" | "solana";
    chainId?: string;
    enabled?: boolean;
}

export function useWalletPortfolio({
    address,
    chainFamily = "evm",
    chainId = "0x1",
    enabled = true,
}: WalletPortfolioParams) {
    return useQuery({
        queryKey: ["wallet-portfolio", chainFamily, chainId, address],
        queryFn: async () => {
            if (!address) return null;
            const params = new URLSearchParams({
                address,
                chainFamily,
                chainId,
            });
            const res = await fetch(`/api/wallets/portfolio?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch wallet portfolio");
            }
            return res.json();
        },
        enabled: Boolean(address) && enabled,
        staleTime: 60 * 1000, // 1 minute
    });
}

interface WalletTransactionsParams {
    address?: string;
    chainFamily?: "evm" | "solana";
    chainId?: string;
    limit?: number;
    enabled?: boolean;
}

export function useWalletTransactions({
    address,
    chainFamily = "evm",
    chainId = "0x1",
    limit = 25,
    enabled = true,
}: WalletTransactionsParams) {
    return useQuery({
        queryKey: ["wallet-transactions", chainFamily, chainId, address, limit],
        queryFn: async () => {
            if (!address) return null;
            const params = new URLSearchParams({
                address,
                chainFamily,
                chainId,
                limit: limit.toString()
            });
            const res = await fetch(`/api/wallets/transactions?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch wallet transactions");
            }
            return res.json();
        },
        enabled: Boolean(address) && enabled,
        staleTime: 60 * 1000, // 1 minute
    });
}
