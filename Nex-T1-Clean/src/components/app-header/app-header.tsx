"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";

import { appShellClasses } from "@/components/app/app-shell-primitives";
import {
  HEADER_MAIN_NAV_ITEMS,
  type HeaderMainNavItem,
} from "@/components/app-header/header-main-nav-data";
import { HeaderMainNavDropdown } from "@/components/app-header/header-main-nav-dropdown";
import { HeaderPrimaryNav } from "@/components/app-header/header-primary-nav";
import { useHeaderMainNavDropdownState } from "@/components/app-header/use-header-main-nav-dropdown-state";
import { useTranslations } from "@/components/providers/locale-provider";
import { Logo } from "@/components/shared/branding/logo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { translateAppNavLabel } from "@/i18n/label-maps";
import { cn } from "@/lib/utils";

import { AppHeaderSearch } from "./app-header-search";
import { HeaderDivider } from "./header-divider";
import { HeaderMainNav } from "./header-main-nav";
import { MobileNavTrigger } from "./mobile-nav-trigger";

type AppHeaderProps = { className?: string };

const APP_LAYOUT_HEADER_PATHS = new Set(["/create", "/screener", "/portfolio", "/agents/new", "/daos", "/agents/strategy-lab", "/defi/swap", "/defi/liquidity", "/ai-leaderboard"]);

const HeaderNotifications = dynamic(
  () => import("@/components/app-header/header-notifications").then((mod) => mod.HeaderNotifications),
  { ssr: false, loading: () => <div className="size-9 animate-pulse rounded-full border border-border/60 bg-muted/80" /> },
);
const UserProfileMenu = dynamic(
  () => import("@/components/app-header/user-profile-menu").then((mod) => mod.UserProfileMenu),
  { ssr: false, loading: () => <div className="flex h-9 w-32 items-center justify-center rounded-md border border-border/60 bg-muted/80 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">Loading...</div> },
);
const HeaderWalletControl = dynamic(
  () => import("@/components/app-header/header-wallet-control").then((mod) => mod.HeaderWalletControl),
  { ssr: false, loading: () => <div className="h-8 w-24 animate-pulse rounded-md bg-muted/20" /> },
);
const HeaderXpBadge = dynamic(
  () => import("@/components/app-header/header-xp-badge").then((mod) => mod.HeaderXpBadge),
  { ssr: false, loading: () => <div className="h-8 w-24 animate-pulse rounded-full bg-muted/20" /> },
);
const ActiveWalletBalance = dynamic(
  () => import("@/components/app-header/active-wallet-balance").then((mod) => mod.ActiveWalletBalance),
  { ssr: false, loading: () => <div className="hidden h-8 w-20 animate-pulse rounded-md bg-muted/20 md:block" /> },
);

export function AppHeader({ className }: AppHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("appNav");
  const headerDropdownBoundaryRef = useRef<HTMLDivElement | null>(null);
  const isAppRoute = pathname === "/app" || pathname?.startsWith("/app/") || APP_LAYOUT_HEADER_PATHS.has(pathname ?? "");
  const isDocsRoute = pathname === "/docs" || pathname?.startsWith("/docs/");
  const { activeDropdownId, clearCloseTimer, closeDropdownImmediately, closeDropdownSoon, openDropdown } =
    useHeaderMainNavDropdownState();
  const activeItem: HeaderMainNavItem | null =
    HEADER_MAIN_NAV_ITEMS.find((item) => item.id === activeDropdownId) ?? null;
  const translateLabel = useCallback((label: string) => translateAppNavLabel(t, label), [t]);

  if (isAppRoute) {
    return (
      <header className={cn(appShellClasses.header, className)}>
        <div ref={headerDropdownBoundaryRef} className="relative h-full w-full">
          <div className={cn(appShellClasses.headerInner, "relative z-[61] bg-[var(--auth-header-bg)] md:gap-11")}>
            <div className={appShellClasses.headerLogoSlot}>
              <Link href="/app" className="flex size-8 items-center justify-center">
                <Logo width={28} height={28} priority />
              </Link>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between pr-0 md:pr-6">
              <HeaderMainNav
                activeDropdownId={activeDropdownId}
                className="hidden md:flex"
                clearCloseTimer={clearCloseTimer}
                closeDropdownImmediately={closeDropdownImmediately}
                closeDropdownSoon={closeDropdownSoon}
                focusBoundaryRef={headerDropdownBoundaryRef}
                openDropdown={openDropdown}
                translateLabel={translateLabel}
              />
              <div
                className={cn(appShellClasses.headerActions, "relative z-[61] md:gap-4")}
                onFocusCapture={closeDropdownImmediately}
                onMouseEnter={closeDropdownImmediately}
              >
                <div className="hidden md:block">
                  <AppHeaderSearch variant="figma" />
                </div>
                <HeaderDivider className="hidden md:block" />
                <div className="hidden md:block">
                  <HeaderNotifications
                    triggerClassName="size-4 flex items-center justify-center rounded-full bg-glass-white dark:bg-transparent glass-edge dark:border-none shadow-liquid-soft dark:shadow-none text-black dark:text-muted-foreground transition-all hover:-translate-y-0.5 dark:hover:translate-y-0 hover:text-black dark:hover:text-foreground"
                    iconClassName="size-4"
                  />
                </div>
                <HeaderDivider className="hidden md:block" />
                <div className="hidden md:block">
                  <ActiveWalletBalance />
                </div>
                <div className="flex items-center gap-3">
                  <UserProfileMenu />
                  <div className="md:hidden">
                    <MobileNavTrigger />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <HeaderMainNavDropdown activeItem={activeItem} onPointerEnterTray={clearCloseTimer} onCloseImmediately={closeDropdownImmediately} onCloseSoon={closeDropdownSoon} translateLabel={translateLabel} />
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-[60] flex h-[2.85rem] w-full items-center bg-background/80 backdrop-blur-xl",
        isDocsRoute ? "bg-background/90" : null,
        className,
      )}
      style={{ height: "2.85rem" }}
    >
      <div className="mx-auto flex w-full max-w-[1968px] flex-col px-3 sm:px-4 md:pl-2 md:pr-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 py-2 md:flex-nowrap md:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isDocsRoute ? (
              <div className="md:hidden">
                <SidebarTrigger className="size-8 text-muted-foreground hover:bg-foreground/5 hover:text-foreground" />
              </div>
            ) : null}
            <div className="flex w-[2.4rem] items-center justify-center">
              <Link href="/app" className="flex items-center">
                <Logo width={23} height={23} priority />
              </Link>
            </div>
            <HeaderPrimaryNav className={cn(isDocsRoute ? "hidden lg:flex" : "hidden md:flex")} />
          </div>
          <div className={cn("flex min-w-0 items-center gap-2 sm:gap-3", isDocsRoute ? "max-w-full" : "shrink-0")}>
            {isDocsRoute ? (
              <>
                <div className="hidden xl:block">
                  <AppHeaderSearch variant="default" />
                </div>
                <div className="hidden lg:block">
                  <HeaderNotifications
                    triggerClassName="size-4 flex items-center justify-center rounded-full bg-glass-white dark:bg-transparent glass-edge dark:border-none shadow-liquid-soft dark:shadow-none text-black dark:text-muted-foreground transition-all hover:-translate-y-0.5 dark:hover:translate-y-0 hover:text-black dark:hover:text-foreground"
                    iconClassName="size-4"
                  />
                </div>
                <div className="hidden xl:block">
                  <HeaderWalletControl />
                </div>
                <div className="hidden xl:block">
                  <HeaderXpBadge />
                </div>
                <UserProfileMenu />
              </>
            ) : (
              <>
                <AppHeaderSearch variant="default" />
                <HeaderNotifications
                  triggerClassName="size-4 flex items-center justify-center rounded-full bg-glass-white dark:bg-transparent glass-edge dark:border-none shadow-liquid-soft dark:shadow-none text-black dark:text-muted-foreground transition-all hover:-translate-y-0.5 dark:hover:translate-y-0 hover:text-black dark:hover:text-foreground"
                  iconClassName="size-4"
                />
                <HeaderWalletControl />
                <HeaderXpBadge />
                <UserProfileMenu />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
