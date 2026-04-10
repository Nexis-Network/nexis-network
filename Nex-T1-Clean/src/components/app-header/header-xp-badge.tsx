"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { useDailyXp } from "@/lib/hooks/xp";
import { logger } from "@/lib/logger";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

import { XpTierChip } from "@/components/xp/xp-tier-chip";

type HeaderXpBadgeProps = {
  variant?: "default" | "figma";
};

export function HeaderXpBadge({ variant = "default" }: HeaderXpBadgeProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthContext();
  const { isLoading, totalXp, tier } = useDailyXp();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`xp-sync:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_leaderboard_stats",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["xp", "daily-status"] });
          void queryClient.invalidateQueries({ queryKey: ["rewards", "summary"] });
          void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          logger.warn("[XP Realtime] Failed to subscribe to user_leaderboard_stats updates");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, queryClient, userId]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        data-testid="header-xp-badge-loading"
        className={cn(
          "animate-pulse rounded-full bg-[var(--auth-menu-subtle-bg)]",
          variant === "figma"
            ? "h-8 w-[110px] hover:bg-[var(--auth-menu-hover-bg)]"
            : "h-8 w-[120px]",
        )}
      />
    );
  }

  return (
    <div data-testid="header-xp-badge">
      <XpTierChip
        tierInfo={tier}
        totalXp={totalXp ?? 0}
        iconSize={variant === "figma" ? 16 : 18}
        compact
        className={cn(
          "border-0 transition-colors",
          variant === "figma"
            ? "h-8 bg-transparent px-2 hover:bg-[var(--auth-menu-hover-bg)]"
            : "h-8 px-2",
        )}
      />
    </div>
  );
}

export default HeaderXpBadge;
