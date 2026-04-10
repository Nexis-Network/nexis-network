"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AppHeaderSearch } from "@/components/app-header/app-header-search";
import { HeaderDivider } from "@/components/app-header/header-divider";
import { useTranslations } from "@/components/providers/locale-provider";
import { SettingsMobileDrawer } from "@/components/settings-v2/nav/settings-mobile-drawer";
import { SettingsTabStrip } from "@/components/settings-v2/nav/settings-tab-strip";
import { SettingsHeaderWalletSwitcher } from "@/components/settings-v2/shell/settings-header-wallet-switcher";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";
import {
  getSettingsSubpageByPathname,
  settingsSectionRegistry,
} from "@/modules/settings/registry";
import type { SettingsTabConfig } from "@/modules/settings/types";

const SETTINGS_BODY_CLASS = "settings-v2-body";

const HEADER_TABS: readonly SettingsTabConfig[] = settingsSectionRegistry.map(
  (section) => ({
    id: section.id,
    label: section.label,
    href: section.href,
  }),
);

const HeaderNotifications = dynamic(
  () =>
    import("@/components/app-header/header-notifications").then(
      (mod) => mod.HeaderNotifications,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="size-5 animate-pulse rounded-full bg-white/10" />
    ),
  },
);

const UserProfileMenu = dynamic(
  () =>
    import("@/components/app-header/user-profile-menu").then(
      (mod) => mod.UserProfileMenu,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
    ),
  },
);

const HeaderXpBadge = dynamic(
  () =>
    import("@/components/app-header/header-xp-badge").then(
      (mod) => mod.HeaderXpBadge,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
    ),
  },
);

export function SettingsAppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("settingsNav");
  const pathname = usePathname() ?? "/settings";
  const searchParams = useSearchParams();
  const activeSubpage = getSettingsSubpageByPathname(pathname);
  const hasSubnav = activeSubpage.tabs.length > 0;

  useEffect(() => {
    document.body.classList.add(SETTINGS_BODY_CLASS);

    return () => {
      document.body.classList.remove(SETTINGS_BODY_CLASS);
    };
  }, []);

  return (
    <div className="settings-v2-theme h-[100dvh] overflow-hidden bg-[var(--settings-app-bg)]">
      <div className="flex h-full w-full flex-col overflow-hidden">
        <header className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-4">
          <div className="flex min-h-8 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="lg:hidden">
                <SettingsMobileDrawer pathname={pathname} />
              </div>

              <Link
                href="/app"
                aria-label={t("backToApp")}
                className="inline-flex items-center py-1"
              >
                <Image
                  src="/assets/settings-sidebar-logo.svg"
                  alt="Settings"
                  width={128}
                  height={28}
                  className="h-7 w-auto"
                  priority
                />
              </Link>

              <SettingsHeaderWalletSwitcher />
            </div>

            <div className="ml-auto flex items-center gap-2 md:gap-4">
              <div className="hidden md:block">
                <AppHeaderSearch variant="figma" />
              </div>
              <HeaderDivider className="hidden md:block" />
              <div className="hidden md:block">
                <HeaderNotifications
                  triggerClassName="size-4 text-muted-foreground hover:text-foreground"
                  iconClassName="size-4 text-muted-foreground"
                />
              </div>
              <HeaderDivider className="hidden md:block" />
              <div className="hidden sm:block">
                <HeaderXpBadge variant="figma" />
              </div>
              <HeaderDivider className="hidden lg:block" />
              <div className="flex items-center gap-3">
                <UserProfileMenu />
              </div>
            </div>
          </div>

          <div className="px-4 pt-3">
            <SettingsTabStrip
              tabs={HEADER_TABS}
              pathname={pathname}
              searchParams={searchParams}
              variant="header"
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 px-2 pb-1">
          <SettingsSurfaceShell
            withThemeScope={false}
            className="min-h-0 flex-1"
            canvasClassName="rounded-t-[var(--settings-panel-radius)] rounded-b-none border-0 bg-transparent"
            stackClassName="max-w-none px-0 py-0"
            topSlot={
              hasSubnav ? (
                <SettingsTabStrip
                  tabs={activeSubpage.tabs}
                  pathname={pathname}
                  searchParams={searchParams}
                  variant="content"
                />
              ) : null
            }
            topSlotClassName="pb-6"
          >
            {children}
          </SettingsSurfaceShell>
        </div>
      </div>
    </div>
  );
}
