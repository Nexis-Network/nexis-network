"use client";

import { useState, useEffect, useCallback } from "react";

import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";

type AssetType = "evm" | "solana";

type WalletApprovalsResponse = {
    approvals?: UntypedJson[];
    error?: string;
};

type EvmApprovalLike = {
    token_address?: string;
    token_symbol?: string;
    token_name?: string;
    token_logo?: string;
    spender_address?: string;
    spender_label?: string;
    value?: string;
};

export interface UnifiedApproval {
    tokenAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenLogo?: string;
    spenderAddress: string;
    spenderLabel?: string;
    amount: string; // raw amount
    isUnlimited: boolean;
}

interface UseWalletApprovalsResult {
    approvals: UnifiedApproval[];
    isLoading: boolean;
    error: string | null;
    isSupported: boolean;
    refetch: () => void;
}

async function fetchWalletApprovals(params: { address: string; chainId: string }): Promise<WalletApprovalsResponse> {
    const searchParams = new URLSearchParams({
        address: params.address,
        chainId: params.chainId,
    });

    const response = await fetch(`/api/wallets/approvals?${searchParams.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as WalletApprovalsResponse;

    if (!response.ok) {
        throw new Error(payload.error ?? "Failed to fetch approvals");
    }

    return payload;
}

export function useWalletApprovals(
    address: string | undefined,
    type: AssetType,
    chainId: string = "0x1"
): UseWalletApprovalsResult {
    const { isAuthenticated, user } = useAuthContext();
    const [approvals, setApprovals] = useState<UnifiedApproval[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchApprovals = useCallback(async () => {
        if (!address) return;
        if (type !== "evm") return;

        setIsLoading(true);
        setError(null);

        try {
            const chainHex = chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
            const { approvals: rawApprovals, error: err } = await fetchWalletApprovals({
                address,
                chainId: chainHex,
            });

            if (err) throw new Error(err);

            const unified: UnifiedApproval[] = (rawApprovals || []).map((a: EvmApprovalLike) => {
                 const value = a.value ?? "0";
                 const isUnlimited = value.length > 50 || value.includes("115792089237316"); // 2^256-1
                 return {
                    tokenAddress: a.token_address ?? "",
                    tokenName: a.token_name ?? "",
                    tokenSymbol: a.token_symbol ?? "",
                    tokenLogo: a.token_logo,
                    spenderAddress: a.spender_address ?? "",
                    spenderLabel: a.spender_label,
                    amount: value,
                    isUnlimited,
                 };
            });

            setApprovals(unified);

        } catch (e: UntypedJson) {
            setError(e instanceof Error ? e.message : "Failed to load approvals");
        } finally {
            setIsLoading(false);
        }
    }, [address, type, chainId]);

    useEffect(() => {
        if (type === "evm") {
            fetchApprovals();
        } else {
            setApprovals([]);
        }
    }, [fetchApprovals, type]);

    useWalletRealtimeSubscription({
        enabled: isAuthenticated && type === "evm" && Boolean(address),
        onNotify: fetchApprovals,
        userId: user?.id,
    });

    return { 
        approvals, 
        isLoading, 
        error, 
        isSupported: type === "evm",
        refetch: fetchApprovals 
    };
}
