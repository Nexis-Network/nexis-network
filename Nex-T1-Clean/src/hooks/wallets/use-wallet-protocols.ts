"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoralisDefiPosition } from "@/types/moralis";

type AssetType = "evm" | "solana";

type WalletProtocolsResponse = {
    protocols?: UntypedJson[];
    totalUsd?: number;
    error?: string;
};

export interface UnifiedProtocol {
    id: string;
    name: string;
    logo?: string;
    valueUsd: number;
    url?: string;
}

interface UseWalletProtocolsResult {
    protocols: UnifiedProtocol[];
    totalUsd: number;
    isLoading: boolean;
    error: string | null;
    isSupported: boolean;
    refetch: () => void;
}

async function fetchWalletProtocols(params: { address: string; chainId: string }): Promise<WalletProtocolsResponse> {
    const searchParams = new URLSearchParams({
        address: params.address,
        chainId: params.chainId,
    });

    const response = await fetch(`/api/wallets/protocols?${searchParams.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as WalletProtocolsResponse;

    if (!response.ok) {
        throw new Error(payload.error ?? "Failed to fetch protocols");
    }

    return payload;
}

export function useWalletProtocols(
    address: string | undefined,
    type: AssetType,
    chainId: string = "0x1"
): UseWalletProtocolsResult {
    const [protocols, setProtocols] = useState<UnifiedProtocol[]>([]);
    const [totalUsd, setTotalUsd] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProtocols = useCallback(async () => {
        if (!address) return;
        if (type !== "evm") return; // Not supported for Solana yet

        setIsLoading(true);
        setError(null);

        try {
            const chainHex = chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
            const { protocols: rawProtocols, totalUsd: rawTotal, error: err } = await fetchWalletProtocols({
                address,
                chainId: chainHex,
            });

            if (err) throw new Error(err);

            const unified: UnifiedProtocol[] = (rawProtocols || []).map((p: MoralisDefiPosition) => ({
                id: p.protocol_id || String(p.id),
                name: p.protocol_name || p.label,
                logo: p.protocol_logo,
                valueUsd: p.net_usd_value,
                url: p.protocol_url
            }));

            setProtocols(unified);
            setTotalUsd(typeof rawTotal === "number" ? rawTotal : 0);

        } catch (e: UntypedJson) {
            setError(e instanceof Error ? e.message : "Failed to load protocols");
        } finally {
            setIsLoading(false);
        }
    }, [address, type, chainId]);

    useEffect(() => {
        if (type === "evm") {
            fetchProtocols();
        } else {
            setProtocols([]);
            setTotalUsd(0);
        }
    }, [fetchProtocols, type]);

    return { 
        protocols, 
        totalUsd, 
        isLoading, 
        error, 
        isSupported: type === "evm",
        refetch: fetchProtocols 
    };
}
