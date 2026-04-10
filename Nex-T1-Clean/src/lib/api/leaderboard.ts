import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import type { LeaderboardEntry, LeaderboardResponse, LeaderboardWalletType } from "@/types/leaderboard";


import { logger } from '@/lib/logger';
const leaderboardEntrySchema = z.object({
  rank: z.number().int().nonnegative(),
  wallet_address: z.string(),
  wallet_type: z.string().nullable().optional(),
  pnl_usd: z.number().finite().nullable().optional(),
  xp: z.number().finite().nullable().optional(),
  referral_fees_usd: z.number().finite().nullable().optional(),
  volume_usd: z.number().finite().nullable().optional(),
  active_chains: z.array(z.string()).optional(),
  avatar_url: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  level: z.number().int().nullable().optional(),
  login_streak: z.number().int().nullable().optional(),
});

const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  updated_at: z.string().nullable().optional(),
  sample_size: z.number().finite().nullable().optional(),
  source: z.enum(["realtime", "seeded"]).optional(),
});

type RawLeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
type RawLeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

const normalizeWalletType = (value: RawLeaderboardEntry["wallet_type"]): LeaderboardWalletType => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "solana" || normalized === "sol") {
      return "solana";
    }
  }
  return "evm";
};

const normalizeNumber = (value: number | null | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const normalizeEntry = (entry: RawLeaderboardEntry): LeaderboardEntry => {
  return {
    rank: entry.rank,
    walletAddress: entry.wallet_address,
    walletType: normalizeWalletType(entry.wallet_type),
    pnlUsd: normalizeNumber(entry.pnl_usd),
    xp: normalizeNumber(entry.xp),
    referralFeesUsd: normalizeNumber(entry.referral_fees_usd),
    volumeUsd: normalizeNumber(entry.volume_usd),
    activeChains: Array.isArray(entry.active_chains) ? entry.active_chains.filter(Boolean) : [],
    avatarUrl: entry.avatar_url ?? null,
    displayName: entry.display_name ?? null,
    level: typeof entry.level === "number" ? entry.level : undefined,
    loginStreak: typeof entry.login_streak === "number" ? entry.login_streak : undefined,
  };
};

const toLeaderboardResponse = (raw: RawLeaderboardResponse): LeaderboardResponse => {
  const normalizedEntries = raw.entries.map(normalizeEntry).slice(0, 100);
  const sortedEntries = normalizedEntries.sort((a, b) => a.rank - b.rank);

  return {
    entries: sortedEntries,
    updatedAt: raw.updated_at ?? null,
    sampleSize: raw.sample_size ?? null,
    source: raw.source ?? "seeded",
  };
};

export async function fetchLeaderboard(options?: { signal?: AbortSignal }): Promise<LeaderboardResponse> {
  const res = await fetch("/api/nex/leaderboard", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load leaderboard (${res.status})`);
  }

  const data = await res.json();
  const parsed = leaderboardResponseSchema.safeParse(data);

  if (!parsed.success) {
    logger.error("leaderboard: unable to parse response", parsed.error.flatten());
    throw new Error("Leaderboard response is malformed");
  }

  return toLeaderboardResponse(parsed.data);
}

export function useLeaderboardQuery(options?: { 
  enableRealtime?: boolean;
  refetchInterval?: number;
}): UseQueryResult<LeaderboardResponse> {
  const { enableRealtime = true, refetchInterval = 30_000 } = options ?? {};
  
  return useQuery({
    queryKey: ["leaderboard", "top-100"],
    queryFn: ({ signal }) => fetchLeaderboard({ signal }),
    staleTime: 30 * 1000, // 30 seconds for fresher data
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    // Enable real-time polling when enabled (every 30 seconds by default)
    refetchInterval: enableRealtime ? refetchInterval : false,
    refetchIntervalInBackground: false, // Save resources when tab not active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}
