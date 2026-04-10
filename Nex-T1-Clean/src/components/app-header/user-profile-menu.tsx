"use client";

import { useMemo, useState, useCallback, type ReactElement } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence } from "motion/react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/animate-ui/components/radix/dropdown-menu";
import { appHeaderLoginButtonClass } from "@/components/navigation/header-auth-button-classes";
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { useCreditsContext } from "@/components/providers/credits-provider";
import { useBilling } from "@/lib/hooks/billing/use-billing";
import { useAuthenticatedShellDataOptional } from "@/lib/hooks/user/authenticated-shell-data";
import { usePreferredAvatar } from "@/lib/hooks/user/use-preferred-avatar";
import { getSubscriptionTierLabel } from "@/lib/billing/subscription-tier";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";
import { ProfileMenuTriggerButton } from "./profile-menu/profile-menu-trigger";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/ui/use-mobile";

type UserProfileMenuProps = {
  triggerOverride?: ReactElement | null;
  showTriggerDuringLoad?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const ProfileMenuContent = dynamic(
  () => import("./profile-menu/profile-menu-content").then((mod) => mod.ProfileMenuContent),
  {
    ssr: false,
    loading: () => <ProfileMenuLoadingContent />,
  },
);

const MobileProfileModal = dynamic(
  () => import("./profile-menu/mobile-profile-modal").then((mod) => mod.MobileProfileModal),
  { ssr: false },
);

function ProfileMenuLoadingContent() {
  return (
    <DropdownMenuContent
      align="end"
      className="w-72 space-y-3 p-2"
    >
      <div className="flex items-center gap-3 rounded-xl p-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading profile…</span>
      </div>
    </DropdownMenuContent>
  );
}

export function UserProfileMenu({
  triggerOverride = null,
  showTriggerDuringLoad,
  open,
  onOpenChange,
}: UserProfileMenuProps = {}) {
  const { status } = useSupabaseAuth();
  const shellData = useAuthenticatedShellDataOptional();
  const authLoading = status === "loading";
  const profileQuery = useProfileAggregate({
    enabled: shellData ? false : undefined,
  });
  const { plan: creditsPlan } = useCreditsContext();
  const billingState = useBilling({
    enabled: shellData ? false : undefined,
  });
  const { avatarSeed, preferredAddress } = usePreferredAvatar({ includeConnectedEoa: true });
  const isMobile = useIsMobile();
  const profileData = shellData?.profileData ?? profileQuery.data;
  const profileLoading = shellData?.profileLoading ?? profileQuery.isLoading;
  const billingPlan = shellData?.billingPlan ?? billingState.plan;
  const billingLoading = shellData?.billingLoading ?? billingState.loading;
  
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const isControlled = typeof open === "boolean";
  const menuOpen = isControlled ? (open as boolean) : internalMenuOpen;
  const handleMenuOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalMenuOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const isAuthenticated = status === "authenticated";
  const isDataLoading = authLoading || profileLoading;
  const allowTriggerDuringLoad = showTriggerDuringLoad ?? Boolean(triggerOverride);

  const truncateIdentifier = useCallback((value: string | null | undefined, visible = 8) => {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized.length) return null;
    if (normalized.length <= visible) {
      return normalized;
    }
    return `${normalized.slice(0, visible)}…`;
  }, []);

  const formatWalletIdentifier = useCallback((value: string | null | undefined) => {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized.length) return null;
    if (normalized.length <= 12) {
      return normalized;
    }
    return `${normalized.slice(0, 6)}-${normalized.slice(-6)}`;
  }, []);

  const walletAddress = preferredAddress ?? avatarSeed;

  const resolvedIdentityLabel =
    profileData?.identity?.ensName ??
    profileData?.identity?.displayName ??
    profileData?.identity?.username ??
    null;
  const email = typeof profileData?.identity?.email === "string" ? profileData.identity.email : null;
  const shortAddress = useMemo(() => {
    return formatWalletIdentifier(preferredAddress);
  }, [formatWalletIdentifier, preferredAddress]);

  const displayName = truncateIdentifier(resolvedIdentityLabel, 14) ?? shortAddress ?? "Anonymous";
  const secondaryLabel = email ?? shortAddress ?? "Wallet";

  const planLabel = useMemo(() => {
    const fallbackPlan = typeof creditsPlan === "string" && creditsPlan.length > 0 ? creditsPlan : null;
    const activePlan = billingLoading && fallbackPlan ? fallbackPlan : billingPlan;
    return getSubscriptionTierLabel(activePlan);
  }, [billingLoading, billingPlan, creditsPlan]);

  if (isDataLoading && !allowTriggerDuringLoad) {
    return (
      <div className="flex h-10 w-32 items-center justify-center text-sm">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginHref = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

    return (
      <Link href={loginHref} className={appHeaderLoginButtonClass}>
        Login
      </Link>
    );
  }

  const triggerNode = triggerOverride ?? (
    <ProfileMenuTriggerButton
      displayName={displayName}
      secondaryLabel={secondaryLabel}
      walletAddress={walletAddress}
    />
  );

  // ─── Mobile: Fullscreen Modal ───
  if (isMobile) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleMenuOpenChange(!menuOpen)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMenuOpenChange(!menuOpen); } }}
          className="cursor-pointer"
        >
          {triggerNode}
        </div>
        <AnimatePresence>
          {menuOpen && (
            <MobileProfileModal
              profileData={profileData}
              displayName={displayName}
              email={email}
              isAuthenticated={isAuthenticated}
              plan={planLabel}
              walletAddress={walletAddress}
              onClose={() => handleMenuOpenChange(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Desktop: Dropdown Menu ───
  return (
    <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
      <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
      {menuOpen ? (
        <ProfileMenuContent
          profileData={profileData}
          displayName={displayName}
          email={email}
          isAuthenticated={isAuthenticated}
          plan={planLabel}
          walletAddress={walletAddress}
        />
      ) : null}
    </DropdownMenu>
  );
}

export default UserProfileMenu;
