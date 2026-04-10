"use client";

import { useQuery } from "@tanstack/react-query";

export function useWalletVolume(params: {
  platform: "evm" | "solana";
  address: string | null;
  chainId?: number | null;
  network?: "mainnet" | "devnet";
  windowHours?: number;
}) {
  return useQuery<{ volumeUsd: number | null; nativeSymbol?: string | null; volumeNative?: number | null }>({
    queryKey: ["wallet-volume", params],
    enabled: Boolean(params.address),
    queryFn: async () => {
      if (!params.address) return { volumeUsd: null, nativeSymbol: null, volumeNative: null };

      if (params.platform === "solana") {
        const qs = new URLSearchParams({
          address: params.address,
          network: params.network ?? "mainnet",
          windowHours: String(params.windowHours ?? 24),
        });
        const res = await fetch(`/api/tools/wallet/sol/volume?${qs.toString()}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load Solana volume");
        const json = (await res.json()) as { data?: { volumeUsd?: number | null } };
        return { volumeUsd: typeof json?.data?.volumeUsd === "number" ? json.data.volumeUsd : null };
      }

      const chainHex = `0x${Number(params.chainId ?? 1).toString(16)}`;
      const qs = new URLSearchParams({
        address: params.address,
        chain: chainHex,
        windowHours: String(params.windowHours ?? 24),
      });
      const res = await fetch(`/api/tools/wallet/evm/volume?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load EVM volume");
      const json = (await res.json()) as { data?: { volumeUsd?: number | null; volumeNative?: number | null; nativeSymbol?: string | null } };
      return {
        volumeUsd: typeof json?.data?.volumeUsd === "number" ? json.data.volumeUsd : null,
        volumeNative: typeof json?.data?.volumeNative === "number" ? json.data.volumeNative : null,
        nativeSymbol: typeof json?.data?.nativeSymbol === "string" ? json.data.nativeSymbol : null,
      };
    },
    staleTime: 30_000,
  });
}

