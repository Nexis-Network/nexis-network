"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { LogOut, X, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatUnits, isAddress } from "viem";

import type { ProfileAggregate } from "@/lib/user/profile";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { clearAuthIdentifier } from "@/lib/auth-profile";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { purgeNexWalletStorage } from "@/modules/wallets/nex/cleanup";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { useBalance } from "wagmi";
import { logger } from "@/lib/logger";
import {
  getSubscriptionTierBadgeClasses,
  getSubscriptionTierLabel,
} from "@/lib/billing/subscription-tier";

import { PROFILE_NAV_ITEMS, XpProgressDisplay } from "./profile-menu-content";
import { ProfileMenuThemeSection } from "./profile-menu-theme-section";
import { UsageCredits } from "./usage-credits";
import { AvatarUploader } from "./avatar-uploader";

type MobileProfileModalProps = {
  profileData?: ProfileAggregate;
  displayName: string;
  email: string | null;
  isAuthenticated: boolean;
  plan?: string | null;
  walletAddress?: string | null;
  onClose: () => void;
};

export function MobileProfileModal({
  profileData,
  displayName,
  email,
  isAuthenticated,
  plan = "Free",
  walletAddress,
  onClose,
}: MobileProfileModalProps) {
  const router = useRouter();
  const { user } = useAuthContext();
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

  const userId = useMemo(() => {
    if (user?.id) return user.id;
    const raw = profileData?.identity?.userId;
    return raw ? String(raw) : null;
  }, [user?.id, profileData?.identity?.userId]);

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

  const handleCopyAddress = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (address) {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [address],
  );

  const handleNavigate = useCallback(
    (href: string) => {
      onClose();
      if (href.startsWith("http")) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(href);
    },
    [router, onClose],
  );

  const handleSignOut = useCallback(async () => {
    try {
      clearAuthIdentifier();
    } catch {
      /* noop */
    }
    try {
      if (userId) purgeNexWalletStorage(userId);
    } catch {
      /* noop */
    }
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production")
        logger.warn("mobile_profile_signout_server_failed", error);
    }
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch (error) {
      if (process.env.NODE_ENV !== "production")
        logger.warn("mobile_profile_signout_failed", error);
    } finally {
      if (typeof window !== "undefined") window.location.assign("/auth/login");
      else router.replace("/auth/login");
    }
  }, [router, userId]);

  const handleResetWalletStorage = useCallback(() => {
    try {
      if (!userId) {
        toast.error("Unable to clear wallet cache (missing user id)");
        return;
      }
      purgeNexWalletStorage(userId);
      toast.success("Wallet cache cleared");
    } catch (error) {
      toast.error("Failed to clear wallet cache");
      if (process.env.NODE_ENV !== "production")
        logger.warn("mobile_profile_wallet_cache_clear_failed", error);
    }
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[200] h-[100dvh] w-full">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--auth-nav-panel-overlay)] backdrop-blur-lg"
      />

      {/* Modal Panel — full width, slides up from bottom */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="absolute inset-0 flex flex-col overflow-hidden bg-[var(--auth-menu-bg)] text-[var(--auth-menu-fg)]"
      >
        {/* ─── Scrollable Content ─── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header: Close button */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[color-mix(in_oklab,var(--auth-menu-bg)_90%,transparent)] px-5 pb-2 pt-[max(env(safe-area-inset-top,12px),12px)] backdrop-blur-xl">
            <span className="font-funnel-display text-sm font-medium tracking-wide text-[var(--auth-menu-muted)]">
              Profile
            </span>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-[var(--auth-menu-subtle-bg)] transition-colors active:bg-[var(--auth-menu-hover-bg)]"
              aria-label="Close profile menu"
            >
              <X className="size-4 text-[var(--auth-menu-muted)]" />
            </button>
          </div>

          {/* ─── User Info ─── */}
          <div className="flex items-center gap-3.5 px-5 pb-4 pt-2">
            <AvatarUploader>
              <UserAvatar
                walletAddress={walletAddress}
                src={profileData?.identity?.avatarUrl ?? null}
                className="size-14 border border-[var(--auth-menu-subtle-border)] ring-1 ring-[var(--auth-menu-border)]"
              />
            </AvatarUploader>
            <div className="flex flex-col gap-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold text-[var(--auth-menu-fg)]">
                  {displayName}
                </span>
                <Badge
                  variant="outline"
                  className={`h-[18px] px-1.5 text-[10px] font-medium uppercase tracking-wide ${planColor}`}
                >
                  {planLabel}
                </Badge>
              </div>
              {email && (
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              )}
            </div>
          </div>

          {/* ─── Wallet Info ─── */}
          {isEvmConnected && address && (
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between rounded-xl border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] p-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
                    Wallet
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground/90">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-muted-foreground transition-colors active:text-foreground outline-none"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-[#8eb94f]" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {formattedBalance !== null && (
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
                      Balance
                    </span>
                    <span className="font-mono text-xs font-medium text-foreground/90">
                      {formattedBalance.toFixed(4)} {balance?.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Credits ─── */}
          <div className="px-5 pb-3">
            <UsageCredits />
          </div>

          {/* ─── XP Progress ─── */}
          <div className="px-5 pb-5">
            <XpProgressDisplay />
          </div>

          {/* ─── Divider ─── */}
          <div className="mx-5 h-px bg-[var(--auth-menu-separator)]" />

          {/* ─── Navigation ─── */}
          <nav className="flex flex-col px-2 py-2">
            {PROFILE_NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className="group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors active:bg-[var(--auth-menu-hover-bg)]"
              >
                <item.icon className="size-[18px] text-[var(--auth-menu-muted)] transition-colors group-active:text-[var(--auth-menu-fg)]" />
                <span className="text-[13px] text-[var(--auth-menu-fg)]">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {/* ─── Divider ─── */}
          <div className="mx-5 h-px bg-[var(--auth-menu-separator)]" />

          <div className="px-5 py-4">
            <ProfileMenuThemeSection
              labelClassName="text-[var(--auth-menu-muted)]"
              switcherClassName="w-full justify-between"
            />
          </div>

          <div className="mx-5 h-px bg-[var(--auth-menu-separator)]" />

          {/* ─── Footer Actions ─── */}
          {isAuthenticated && (
            <div className="flex flex-col px-2 py-2 pb-[max(env(safe-area-inset-bottom,20px),20px)]">
              <button
                onClick={handleResetWalletStorage}
                className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-[var(--auth-menu-muted)] transition-colors active:bg-[var(--auth-menu-hover-bg)]"
              >
                <span className="text-[13px]">Clear wallet cache</span>
              </button>
              {isConnected && (
                <button
                  onClick={() => disconnectEoa()}
                  className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-[var(--auth-menu-muted)] transition-colors active:bg-[var(--auth-menu-hover-bg)]"
                >
                  <LogOut className="size-[18px] rotate-180" />
                  <span className="text-[13px]">Disconnect wallet</span>
                </button>
              )}
              <button
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-red-400 transition-colors active:bg-red-500/10"
              >
                <LogOut className="size-[18px]" />
                <span className="text-[13px]">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
