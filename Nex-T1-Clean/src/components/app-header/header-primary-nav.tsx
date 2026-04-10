"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Store,
  Trophy,
  Monitor,
  Droplets,
  User,
  Cpu,
  WalletCards,
  Globe,
  BarChart,
  Timer,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/providers/locale-provider";
import { translateAppNavLabel } from "@/i18n/label-maps";
import { DAO_NAV_ITEMS } from "@/components/app-header/dao-nav-items";

type HeaderSubmenuItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
};

type HeaderNavItem = {
  id: string;
  title: string;
  href?: string;
  submenu?: HeaderSubmenuItem[];
};

const HEADER_NAV_ITEMS: HeaderNavItem[] = [
  { id: "chat", title: "Chat", href: "/app" },
  {
    id: "trade",
    title: "Trade",
    submenu: [
      { id: "trade-terminal", title: "Trading Terminal", href: "/screener", icon: Monitor },
      { id: "trade-liquidity", title: "Liquidity", href: "/defi/liquidity", icon: Droplets },
    ],
  },
  {
    id: "daos",
    title: "DAOs",
    submenu: DAO_NAV_ITEMS,
  },
  {
    id: "agents",
    title: "Agents",
    submenu: [
      { id: "agents-marketplace", title: "Agent Marketplace", href: "/marketplace", icon: Store },
      { id: "agents-leaderboard", title: "AI Leaderboard", href: "/ai-leaderboard", icon: Trophy },
      { id: "agents-my-agents", title: "My Agents", href: "/settings/agents", icon: User },
      { id: "agents-mcp", title: "MCP Directory", href: "/mcp", icon: Cpu },
      { id: "agents-analytics", title: "Agent Analytics", href: "/analytics", icon: BarChart },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    submenu: [
      { id: "profile-wallets", title: "Agent Wallets", href: "/settings/wallets", icon: WalletCards },
      { id: "profile-my-agents", title: "My Agents", href: "/settings/agents", icon: User },
      { id: "profile-vesting", title: "Vesting", href: "/vesting", icon: Timer },
      { id: "profile-portal", title: "Nexis Portal", href: "https://portal.nex-t1.ai", icon: Globe },
      { id: "profile-settings", title: "Settings", href: "/settings", icon: Settings },
    ],
  },
  { id: "docs", title: "Docs", href: "/docs" },
];

const CLOSE_DELAY_MS = 110;

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type HeaderPrimaryNavProps = {
  className?: string;
};

export function HeaderPrimaryNav({ className }: HeaderPrimaryNavProps) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("appNav");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openDropdown = useCallback((itemId: string) => {
    clearCloseTimer();
    setActiveDropdownId(itemId);
  }, [clearCloseTimer]);

  const closeDropdownSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setActiveDropdownId(null);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const closeDropdownImmediately = useCallback(() => {
    clearCloseTimer();
    setActiveDropdownId(null);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  return (
    <nav
      className={cn("relative", className)}
      aria-label="Primary navigation"
      onMouseLeave={closeDropdownSoon}
    >
      <div className="flex items-center gap-0">
        {HEADER_NAV_ITEMS.map((item) => {
          const submenu = item.submenu ?? [];
          const hasSubmenu = submenu.length > 0;
          const isActive = hasSubmenu
            ? submenu.some((subItem) => isPathActive(pathname, subItem.href))
            : Boolean(item.href && isPathActive(pathname, item.href));

          if (hasSubmenu) {
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => openDropdown(item.id)}
                onMouseLeave={closeDropdownSoon}
              >
                <button
                  type="button"
                  onFocus={() => openDropdown(item.id)}
                  onBlur={closeDropdownSoon}
                  aria-expanded={activeDropdownId === item.id}
                  aria-haspopup="menu"
                  className={cn(
                    "inline-flex h-[2.85rem] items-center whitespace-nowrap px-3 text-[13px] font-medium text-[var(--auth-nav-text)] transition-colors hover:text-[var(--auth-nav-text-active)]",
                    isActive && "text-[var(--auth-nav-text-active)]",
                    activeDropdownId === item.id &&
                      "text-[var(--auth-nav-text-active)]",
                  )}
                >
                  {translateAppNavLabel(t, item.title)}
                </button>

                {activeDropdownId === item.id ? (
                  <div
                    data-testid="header-nav-dropdown-panel"
                    className="absolute left-0 top-full z-45 mt-1 w-[256px] max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--auth-menu-border)] bg-[var(--auth-menu-bg)] p-2 text-[var(--auth-menu-fg)] shadow-[var(--auth-menu-shadow)] !backdrop-blur-lg"
                    onMouseEnter={() => openDropdown(item.id)}
                    onMouseLeave={closeDropdownSoon}
                  >
                    <div
                      data-testid="header-nav-dropdown-row"
                      className="flex flex-col items-stretch"
                    >
                      {submenu.map((submenuItem) => {
                        const isSubmenuActive = isPathActive(pathname, submenuItem.href);
                        const ItemIcon = submenuItem.icon;

                        return (
                          <Link
                            key={submenuItem.id}
                            href={submenuItem.href}
                            onClick={closeDropdownImmediately}
                            className={cn(
                              "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--auth-menu-muted)] transition-colors hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-fg)] focus-visible:bg-[var(--auth-menu-hover-bg)] focus-visible:text-[var(--auth-menu-fg)]",
                              isSubmenuActive &&
                                "bg-[var(--auth-menu-hover-bg)] text-[var(--auth-menu-fg)]",
                            )}
                          >
                            <ItemIcon
                              aria-hidden="true"
                              className="size-3.5 shrink-0 text-[var(--auth-menu-muted)] transition-colors group-hover:text-[var(--auth-menu-fg)]"
                            />
                            {translateAppNavLabel(t, submenuItem.title)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href ?? "/app"}
              onMouseEnter={closeDropdownSoon}
              className={cn(
                "inline-flex h-[2.85rem] items-center whitespace-nowrap px-3 text-[13px] font-medium text-[var(--auth-nav-text)] transition-colors hover:text-[var(--auth-nav-text-active)]",
                isActive && "text-[var(--auth-nav-text-active)]",
              )}
            >
              {translateAppNavLabel(t, item.title)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
