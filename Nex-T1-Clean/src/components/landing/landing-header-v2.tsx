"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import React, { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { loginDesktopButtonClass } from "@/components/navigation/login-button-classes";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";
import { MenuGridIcon } from "@/components/icons/menu-grid-icon";
import { useTranslations } from "@/components/providers/locale-provider";
import { translateMarketingLabel } from "@/i18n/label-maps";

import {
  LandingHeaderV2Dropdown,
  type LandingHeaderDropdownContent,
} from "@/components/landing/landing-header-v2-dropdown";
import { MENU_CONTENT, NAVIGATION_ITEMS } from "@/components/landing/menu-data";
import { MobileMenuV2 } from "@/components/landing/mobile-menu-v2";
import { AppsDropdownMenu } from "@/components/landing/apps-dropdown-menu";

const LANDING_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export function LandingHeaderV2() {
  const t = useTranslations("marketing");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrolledRef = useRef<boolean | null>(null);

  React.useEffect(() => {
    const update = () => {
      scrollRafRef.current = null;
      const nextIsScrolled = window.scrollY > 8;
      if (lastScrolledRef.current === nextIsScrolled) return;
      lastScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const currentContent: LandingHeaderDropdownContent | null = hoveredItem
    ? MENU_CONTENT[hoveredItem]
    : null;
  const showDropdown = Boolean(hoveredItem) && !isMenuOpen;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => {
    setIsMenuOpen(false);
    setHoveredItem(null);
  };
  const showElevatedHeader = isScrolled || isMenuOpen || showDropdown;

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 flex w-full flex-col items-center justify-center border-b transition-all duration-300",
        showElevatedHeader
          ? "border-white/8 bg-transparent"
          : "border-transparent bg-transparent",
      )}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <div className="relative z-[56] flex w-full items-center justify-center">
        <div className="flex px-16 h-[60px] w-full items-center justify-between">
          <Link
            href="/"
            aria-label="Nexis Network"
            className="relative z-50 flex items-center gap-3"
            onClick={closeMenu}
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full blur-2xl bg-foreground/10"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Nexis"
              src="/logo/nexis-logo-full-dark.svg"
              width={103}
              height={21}
              className="h-auto max-w-none"
              style={{ width: 103, height: "auto" }}
            />
          </Link>

          <div className="menubar relative z-[57] hidden h-auto md:flex">
            {NAVIGATION_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  hoveredItem === item
                    ? "menubar-item-active"
                    : "menubar-item",
                )}
                onMouseEnter={() => setHoveredItem(item)}
              >
                {translateMarketingLabel(t, item)}
              </button>
            ))}
          </div>

          <div className="z-50 flex items-center gap-4">
            <Link
              href="https://portal.nex-t1.ai/"
              target="_blank"
              className={cn(
                loginDesktopButtonClass,
                "hidden rounded-lg border border-border/80 bg-transparent text-foreground/70 hover:border-foreground hover:text-foreground md:flex",
              )}
            >
              {t("portal")}
            </Link>
            <AppsDropdownMenu />

            <button
              className="block text-foreground/80 hover:text-foreground md:hidden"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <Plus className="size-6 rotate-45 transition-transform" />
              ) : (
                <MenuGridIcon className="size-6 text-foreground/80 transition-transform group-hover:text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <LandingHeaderV2Dropdown
        activeKey={hoveredItem}
        currentContent={currentContent}
        loginHref={LANDING_LOGIN_HREF}
        onClose={() => setHoveredItem(null)}
        onOpen={setHoveredItem}
        showDropdown={showDropdown}
        translateLabel={(label) => translateMarketingLabel(t, label)}
      />

      <MobileMenuV2 isOpen={isMenuOpen} onClose={closeMenu} />
    </nav>
  );
}
