"use client";

import { useWalletPortfolio } from "@/lib/hooks/wallet/use-wallet-metrics";
import { formatCurrency, cn } from "@/lib/utils";

export function WalletBalanceDisplay({
    address,
    chainFamily = "evm",
    chainId = "0x1",
    tokenAddress, // If provided, looks for a specific token. Otherwise returns Native balance.
    className
}: {
    address: string;
    chainFamily?: "evm" | "solana";
    chainId?: string;
    tokenAddress?: string;
    className?: string;
}) {
    const { data: portfolio } = useWalletPortfolio({ address, chainFamily, chainId });

    if (!portfolio) {
        return <span className={cn("text-muted-foreground", className)}>-</span>;
    }

    let balance = "0";

    if (chainFamily === "evm") {
        if (!tokenAddress) {
            balance = portfolio.native?.balanceFormatted || "0";
        } else {
            const token = portfolio.tokens?.find((t: { token_address?: string; balanceFormatted?: string; balance?: string }) => t.token_address?.toLowerCase() === tokenAddress.toLowerCase());
            balance = token?.balanceFormatted || token?.balance || "0";
        }
    } else if (chainFamily === "solana") {
        if (!tokenAddress) {
            // Usually SOL is token_address null or specific address depending on unified mapping
            const sol = portfolio.tokens?.find((t: { symbol?: string; balanceFormatted?: string; balance?: string }) => t.symbol === "SOL");
            balance = sol?.balanceFormatted || sol?.balance || "0";
        } else {
            const spl = portfolio.tokens?.find((t: { token_address?: string; balanceFormatted?: string; balance?: string }) => t.token_address === tokenAddress);
            balance = spl?.balanceFormatted || spl?.balance || "0";
        }
    }

    return (
        <span className={cn("font-mono font-normal", className)}>
            {Number(balance).toFixed(4)}
        </span>
    );
}

export function WalletNetWorthDisplay({
    address,
    chainFamily = "evm",
    chainId = "0x1",
    className
}: {
    address: string;
    chainFamily?: "evm" | "solana";
    chainId?: string;
    className?: string;
}) {
    const { data: portfolio } = useWalletPortfolio({ address, chainFamily, chainId });

    if (!portfolio) {
        return <span className={cn("text-muted-foreground", className)}>$0.00</span>;
    }

    // Unified endpoints map the USD totals directly
    const totalUsd = portfolio.totalUsd || 0;

    return (
        <span className={cn("text-white font-mono font-normal", className)}>
            {formatCurrency(totalUsd)}
        </span>
    );
}
