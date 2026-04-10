// Domain: gamification
// Responsibility: Client-side hook for daily XP claiming
// Depends on: react-query

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform/payload";
import { resolveXpTier, type XpTierInfo } from "@/lib/xp/tier";


import { logger } from '@/lib/logger';
const DEFAULT_XP_TIER: XpTierInfo = resolveXpTier(0);

export type XpClaimStatus = {
  canClaim: boolean;
  lastClaimDate: string | null;
  currentStreak: number;
  nextReward: number;
  totalXp: number;
  level: number;
  tier: XpTierInfo;
};

export type XpClaimResult = {
  success: boolean;
  xpEarned: number;
  streakDay: number;
  totalXp: number;
  newLevel: number;
  message: string;
  // Indicates the user had already claimed and no XP was granted this call
  alreadyClaimed?: boolean;
  tier: XpTierInfo;
};

function isAlreadyClaimedMessage(message?: string) {
  return typeof message === "string" && message.toLowerCase().includes("already claimed");
}

function isXpTierLike(value: unknown): value is XpTierInfo {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.tier === "number" &&
    typeof candidate.badgePath === "string" &&
    typeof candidate.minXp === "number" &&
    (typeof candidate.nextMinXp === "number" || candidate.nextMinXp === null) &&
    typeof candidate.xpToNextTier === "number" &&
    typeof candidate.tierProgressPct === "number"
  );
}

function resolveTierPayload(value: unknown, totalXp: number): XpTierInfo {
  if (isXpTierLike(value)) return value;
  return resolveXpTier(totalXp);
}

function isClientTestMode(): boolean {
  const envTestMode =
    process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true";
  if (envTestMode) return true;

  if (typeof window === "undefined") return false;

  const maybeWindow = window as Window & { __TEST_MODE?: boolean };
  return maybeWindow.__TEST_MODE === true;
}

function normalizeClaimStatus(payload: unknown): XpClaimStatus {
  const unwrapped = unwrapApiPayload<Partial<XpClaimStatus>>(payload) ?? {};
  const totalXp = Number.isFinite(unwrapped.totalXp as number) ? Number(unwrapped.totalXp) : 0;

  return {
    canClaim: unwrapped.canClaim ?? true,
    lastClaimDate: unwrapped.lastClaimDate ?? null,
    currentStreak: unwrapped.currentStreak ?? 0,
    nextReward: unwrapped.nextReward ?? 100,
    totalXp,
    level: unwrapped.level ?? 1,
    tier: resolveTierPayload(unwrapped.tier, totalXp),
  };
}

function normalizeClaimResult(payload: unknown): XpClaimResult {
  const unwrapped = unwrapApiPayload<Partial<XpClaimResult>>(payload) ?? {};
  const totalXp = Number.isFinite(unwrapped.totalXp as number) ? Number(unwrapped.totalXp) : 0;

  return {
    success: Boolean(unwrapped.success),
    xpEarned: Number.isFinite(unwrapped.xpEarned as number) ? Number(unwrapped.xpEarned) : 0,
    streakDay: Number.isFinite(unwrapped.streakDay as number) ? Number(unwrapped.streakDay) : 0,
    totalXp,
    newLevel: Number.isFinite(unwrapped.newLevel as number) ? Number(unwrapped.newLevel) : 1,
    message: typeof unwrapped.message === "string" ? unwrapped.message : "XP processed",
    alreadyClaimed: unwrapped.alreadyClaimed === true,
    tier: resolveTierPayload(unwrapped.tier, totalXp),
  };
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return isClientTestMode() ? "test-mode-token" : null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    const token = data.session?.access_token ?? null;
    if (token) return token;
    return isClientTestMode() ? "test-mode-token" : null;
  } catch {
    return isClientTestMode() ? "test-mode-token" : null;
  }
}

async function fetchClaimStatus(): Promise<XpClaimStatus> {
  const accessToken = await getAccessToken();

  // If no access token, user is not authenticated - don't show popup
  if (!accessToken) {
    return {
      canClaim: false, // Don't show popup for unauthenticated users
      lastClaimDate: null,
      currentStreak: 0,
      nextReward: 100,
      totalXp: 0,
      level: 1,
      tier: DEFAULT_XP_TIER,
    };
  }

  const response = await fetch("/api/xp/claim", {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Silently handle 401 (unauthorized/not logged in) to avoid console spam
    if (response.status !== 401) {
      logger.warn("[XP Status] Fetch failed:", payload);
    }
    // Return canClaim: false on auth errors to prevent popup from showing
    return {
      canClaim: false,
      lastClaimDate: null,
      currentStreak: 0,
      nextReward: 100,
      totalXp: 0,
      level: 1,
      tier: DEFAULT_XP_TIER,
    };
  }

  return normalizeClaimStatus(payload);
}

async function claimDailyXp(): Promise<XpClaimResult> {
  const accessToken = await getAccessToken();

  const response = await fetch("/api/xp/claim", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const payload = await response.json().catch(() => null);
  const normalized = normalizeClaimResult(payload);
  const alreadyClaimed = normalized.alreadyClaimed === true || isAlreadyClaimedMessage(normalized.message);
  const errorMessage = getApiErrorMessage(payload, "Failed to claim XP");
  
  // Check both HTTP status and response body for errors
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please sign in to claim XP");
    }
    throw new Error(errorMessage);
  }

  // Treat the "already claimed" case as a soft success so we don't spam console errors
  if (normalized.success === false && !alreadyClaimed) {
    throw new Error(errorMessage);
  }

  return {
    ...normalized,
    alreadyClaimed,
  };
}

export function useDailyXpStatus() {
  return useQuery({
    queryKey: ["xp", "daily-status"],
    queryFn: fetchClaimStatus,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useClaimDailyXp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimDailyXp,
    onSuccess: (_data) => {
      // Invalidate and refetch XP status
      queryClient.invalidateQueries({ queryKey: ["xp", "daily-status"] });
      // Also invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useDailyXp() {
  const status = useDailyXpStatus();
  const claim = useClaimDailyXp();

  return {
    status: status.data,
    isLoading: status.isLoading,
    isError: status.isError,
    canClaim: status.data?.canClaim ?? true,
    currentStreak: status.data?.currentStreak ?? 0,
    nextReward: status.data?.nextReward ?? 100,
    totalXp: status.data?.totalXp ?? 0,
    level: status.data?.level ?? 1,
    tier: status.data?.tier ?? DEFAULT_XP_TIER,
    claimXp: claim.mutateAsync,
    isClaiming: claim.isPending,
    claimError: claim.error,
    lastClaimResult: claim.data,
    refetch: status.refetch,
  };
}
