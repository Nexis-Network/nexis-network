"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Settings,
  Wallet,
  User,
  Shield,
  FileText,
  Key,
  CreditCard,
  Award,
  LayoutGrid,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { formatUnits, isAddress } from "viem";

import type { ProfileAggregate } from "@/lib/user/profile";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { clearAuthIdentifier } from "@/lib/auth-profile";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { purgeNexWalletStorage } from "@/modules/wallets/nex/cleanup";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProfileMenuThemeSection } from "./profile-menu-theme-section";
import { UsageCredits } from "./usage-credits";
import { AvatarUploader } from "./avatar-uploader";
import { Progress } from "@/components/ui/progress";
import { useDailyXp } from "@/lib/hooks/xp/use-daily-xp";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { useBalance } from "wagmi";
import { useState } from "react";
import { XpTierChip } from "@/components/xp/xp-tier-chip";
import {
  getSubscriptionTierBadgeClasses,
  getSubscriptionTierLabel,
} from "@/lib/billing/subscription-tier";

import { logger } from "@/lib/logger";
// Domain: auth, wallets
// Responsibility: Profile dropdown menu content (Supabase auth + Nex wallets)
// Updated with Credits, Voice, and Safe Wallets

type ProfileMenuContentProps = {
  profileData?: ProfileAggregate;
  displayName: string;
  email: string | null;
  isAuthenticated: boolean;
  plan?: string | null;
  walletAddress?: string | null;
};

export const PROFILE_NAV_ITEMS = [
  { label: "Account settings", href: "/settings", icon: User },
  { label: "Agent settings", href: "/settings/assistant", icon: Settings },
  { label: "Smart Wallets", href: "/settings/wallets", icon: Wallet },
  { label: "Agents", href: "/agents", icon: LayoutGrid },
  { label: "Earn rewards", href: "/rewards", icon: Award },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "API Keys", href: "/settings/api-keys", icon: Key },
  { label: "Security", href: "/settings/security", icon: Shield },
  { label: "Changelog", href: "/changelog", icon: FileText },
];

export function ProfileMenuContent({
  profileData,
  displayName,
  email,
  isAuthenticated,
  plan = "Free",
  walletAddress,
}: ProfileMenuContentProps) {
  const router = useRouter();
  const {
    isConnected,
    isEvmConnected,
    address,
    chainId,
    disconnect: disconnectEoa,
  } = useConnectEoaWallet();
  const canQueryBalance =
    isEvmConnected && typeof address === "string" && isAddress(address);
  const { data: balance } = useBalance({
    address: canQueryBalance ? (address as `0x${string}`) : undefined,
    chainId: canQueryBalance ? chainId : undefined,
    query: { enabled: canQueryBalance },
  });

  const [copied, setCopied] = useState(false);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* Logic Verification Block:
   * Claim: The wallet system uses Supabase UUIDs for storage keys (via `useNexAccount`), so we must use the UUID to clear it.
   * Reasoning: `profileData.identity.userId` is an integer ID which may be 0/null or simply mismatch the storage keys.
   * Verification: `useNexAccount` uses `userId` from Supabase (UUID) for `SIGNER_STORAGE_KEY`.
   * Result: Verified. We must switch to using `user.id` from `useAuthContext`.
   */
  const { user } = useAuthContext();

  const userId = useMemo(() => {
    if (user?.id) return user.id;
    const raw = profileData?.identity?.userId;
    return raw ? String(raw) : null;
  }, [user?.id, profileData?.identity?.userId]);

  const handleNavigate = useCallback(
    (href: string) => () => {
      if (href.startsWith("http")) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(href);
    },
    [router],
  );

  const handleSignOut = useCallback(async () => {
    try {
      clearAuthIdentifier();
    } catch {
      // noop
    }

    try {
      if (userId) {
        purgeNexWalletStorage(userId);
      }
    } catch {
      // noop
    }

    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("profile_menu_server_signout_failed", error);
      }
    }

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("profile_menu_signout_failed", error);
      }
    } finally {
      if (typeof window !== "undefined") {
        window.location.assign("/auth/login");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [router, userId]);

  const handleResetWalletStorage = useCallback(
    (event: UntypedJson) => {
      const evt = event as {
        preventDefault?: () => void;
        stopPropagation?: () => void;
      } | null;
      evt?.preventDefault?.();
      evt?.stopPropagation?.();

      try {
        if (!userId) {
          toast.error("Unable to clear wallet cache (missing user id)");
          return;
        }
        purgeNexWalletStorage(userId);
        toast.success("Wallet cache cleared");
      } catch (error) {
        toast.error("Failed to clear wallet cache");
        if (process.env.NODE_ENV !== "production") {
          logger.warn("profile_menu_wallet_cache_clear_failed", error);
        }
      }
    },
    [userId],
  );

  const formattedBalance = useMemo(() => {
    if (!balance) return null;
    try {
      const raw = formatUnits(balance.value, balance.decimals);
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [balance]);

  const planColor = getSubscriptionTierBadgeClasses(plan);
  const planLabel = getSubscriptionTierLabel(plan);

  const navItems = PROFILE_NAV_ITEMS;

  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-[256px] max-h-[85vh] overflow-y-auto p-2"
    >
      {/* 1. User Info Header */}
      <div className="flex items-center gap-2.5 p-2 pb-1.5">
        <AvatarUploader>
          <UserAvatar
            walletAddress={walletAddress}
            src={profileData?.identity?.avatarUrl ?? null}
            className="size-8 border border-[var(--auth-menu-subtle-border)] ring-1 ring-[var(--auth-menu-border)]"
          />
        </AvatarUploader>
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate text-xs">
              {displayName}
            </span>
            <Badge
              variant="outline"
              className={`h-4 px-1 text-[9px] font-medium uppercase tracking-wide ${planColor}`}
            >
              {planLabel}
            </Badge>
          </div>
          {email && <span className="text-[10px] truncate">{email}</span>}
        </div>
      </div>

      {/* 2. Usage Credits */}
      <div className="px-1.5 pb-1.5">
        <UsageCredits />
      </div>

      {/* 3. XP & Level */}
      <div className="px-2 pb-2">
        <XpProgressDisplay />
      </div>

      {isEvmConnected && address && (
        <div className="px-2 pb-2">
          <div className="flex items-center justify-between rounded-xl border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] p-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-medium uppercase tracking-wider">Wallet</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px]">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="transition-colors outline-none"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
            </div>
            {formattedBalance !== null && (
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[9px] font-medium uppercase tracking-wider">Balance</span>
                <div className="text-[10px] font-medium">
                  {formattedBalance.toFixed(4)} {balance?.symbol}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <DropdownMenuSeparator />

      {/* 4. Navigation Menu */}
      <div className="p-1">
        {navItems.map((item) => (
          <DropdownMenuItem
            key={item.href}
            onSelect={handleNavigate(item.href)}
            className="group flex items-center gap-2.5 rounded-xl py-1.5"
          >
            <item.icon className="size-3.5 fill-current/10 transition-colors" />
            <span className="text-xs">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </div>

      <DropdownMenuSeparator />

      <div className="px-2 pb-2 pt-1.5">
        <ProfileMenuThemeSection switcherClassName="w-full gap-0.5 p-[2px] [&_button]:h-[30px] [&_button]:min-w-0 [&_button]:flex-1" />
      </div>

      <DropdownMenuSeparator />

      {/* 6. Footer Actions */}
      {isAuthenticated ? (
        <div className="p-1">
          <DropdownMenuItem
            onSelect={handleResetWalletStorage}
            className="rounded-xl py-1.5"
          >
            <span className="text-xs">Clear wallet cache</span>
          </DropdownMenuItem>
          {isConnected && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                disconnectEoa();
              }}
              className="rounded-xl py-1.5"
            >
              <LogOut className="mr-2 size-3.5 rotate-180" />
              <span className="text-xs">Disconnect wallet</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleSignOut();
            }}
            className="rounded-xl py-1.5"
          >
            <LogOut className="mr-2 size-3.5" />
            <span className="text-xs">Sign out</span>
          </DropdownMenuItem>
        </div>
      ) : (
        <div className="p-1">
          <DropdownMenuItem
            onSelect={handleNavigate("/auth/login")}
            className="rounded-xl py-1.5"
          >
            <span className="text-xs">Sign in</span>
          </DropdownMenuItem>
        </div>
      )}
    </DropdownMenuContent>
  );
}

export function XpProgressDisplay() {
  const { totalXp, isLoading, tier } = useDailyXp();
  const normalizedTotalXp = Math.max(0, Math.floor(totalXp || 0));
  const hasNextTier = tier.nextMinXp !== null;
  const xpToNextTier = Math.max(0, Math.floor(tier.xpToNextTier));
  const progressPct = hasNextTier
    ? Math.max(0, Math.min(100, tier.tierProgressPct))
    : 100;

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-12 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted-foreground/20" />
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted-foreground/10" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-start">
        <XpTierChip
          tierInfo={tier}
          totalXp={normalizedTotalXp}
          iconSize={14}
          className="h-6 px-1.5 py-0 text-[10px]"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="text-foreground tabular-nums">
          {normalizedTotalXp.toLocaleString()} XP
        </span>
        <span className="text-muted-foreground tabular-nums">
          {hasNextTier
            ? `${xpToNextTier.toLocaleString()} XP to Tier ${tier.tier + 1}`
            : "Max tier reached"}
        </span>
      </div>
      <Progress
        value={progressPct}
        className="h-1.5 bg-muted/50"
        indicatorClassName="bg-[color-mix(in_oklab,var(--auth-nav-text-active)_70%,transparent)]"
      />
    </div>
  );
}
