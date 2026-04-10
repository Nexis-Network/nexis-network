"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { primaryNavLinks } from "@/components/landing/landing-primary-nav-links";
import { developerLinks } from "@/components/landing/navigation-config";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { publicHeaderLoginLightButtonClassName } from "@/components/navigation/public-header-login-button-classes";
import { useTranslations } from "@/components/providers/locale-provider";
import { translateMarketingLabel } from "@/i18n/label-maps";

// developerLinks imported from config

import { HeaderTheme, HeaderVariant } from "./header-types";

const headerThemes: Record<HeaderVariant, HeaderTheme> = {
  default: {
    headerScrolled: "bg-transparent",
    headerUnscrolled: "border-transparent bg-transparent backdrop-blur-0",
    navText: "text-foreground/75",
    menuItemText: "text-foreground/75",
    menuHoverBackdrop: "bg-foreground",
    menuLabel: "text-foreground/75",
    menuLabelHover: "group-hover:text-foreground",
    menuToggleButton: "border border-border bg-card/60 text-foreground/75 hover:bg-card/80 hover:text-foreground backdrop-blur-xl",
    mobileNavContainer: "border border-border bg-card/60 text-foreground/75 drop-shadow-sm",
    mobileSectionTitle: "text-muted-foreground/60",
    mobileDeveloperLink: "border border-border bg-card/60 text-foreground/75 hover:bg-card/80 hover:text-foreground",
    mobileDeveloperIcon: "text-foreground/75 group-hover:text-foreground",
    mobileNavigateLink: "border border-border bg-card/60 text-foreground/75 hover:bg-card/80 hover:text-foreground",
    mobileLinkText: "text-foreground/75",
    developerDropdownContent: "rounded-xl p-1",
    developerItem: "group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors",
    developerItemIcon: "size-3.5 transition-colors",
    developerItemText: "text-xs transition-colors",
    logoGlow: "bg-foreground/15",
    logoSrc: "/logo/nexis-logo-full-dark.svg",
    logoClassName: "h-auto max-w-[154px] drop-shadow-[0_0_14px_rgba(255,255,255,0.2)]",
    logoWidth: 103,
    logoHeight: 21,
    navItemSeparator: "",
  },
  inverse: {
    headerScrolled: "border-b border-border bg-background/80 backdrop-blur-xl",
    headerUnscrolled: "border-b border-transparent bg-transparent backdrop-blur-0",
    navText: "text-foreground/75",
    menuItemText: "text-foreground/75",
    menuHoverBackdrop: "bg-foreground",
    menuLabel: "text-foreground/75",
    menuLabelHover: "group-hover:text-foreground",
    menuToggleButton: "border border-border bg-popover/80 text-foreground/75 hover:bg-popover/90 hover:text-foreground backdrop-blur-xl",
    mobileNavContainer: "border border-border bg-popover/80 text-foreground/75 drop-shadow-sm",
    mobileSectionTitle: "text-muted-foreground/60",
    mobileDeveloperLink: "border border-border bg-popover/80 text-foreground/75 hover:bg-popover/90 hover:text-foreground",
    mobileDeveloperIcon: "text-foreground/75 group-hover:text-foreground",
    mobileNavigateLink: "border border-border bg-popover/80 text-foreground/75 hover:bg-popover/90 hover:text-foreground",
    mobileLinkText: "text-foreground/75",
    developerDropdownContent: "rounded-xl p-1",
    developerItem: "group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors",
    developerItemIcon: "size-3.5 transition-colors",
    developerItemText: "text-xs transition-colors",
    logoGlow: "bg-muted/20",
    logoSrc: "/logo/nexis-logo-full-dark.svg",
    logoClassName: "h-auto max-w-[154px]",
    logoWidth: 103,
    logoHeight: 21,
    navItemSeparator: "",
  },
};

const baseMenuItemClass =
  "group relative inline-flex items-center gap-1.5 overflow-hidden px-4 py-1 text-[11px] font-thin transition-colors duration-300 ease-out";

const getMenuItemClass = (theme: HeaderTheme, extra?: string) => cn(baseMenuItemClass, theme.menuItemText, extra);

const MenuHoverBackdrop = ({ className }: { className: string }) => (
  <span
    aria-hidden
    className={cn(
      "pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0",
      className,
    )}
  />
);

const MenuLabel = ({ text, theme }: { text: string; theme: HeaderTheme }) => (
  <span
    className={cn(
      "relative z-10 whitespace-nowrap text-[11px] font-thin tracking-[0.08em] transition-colors duration-300",
      theme.menuLabel,
      theme.menuLabelHover,
    )}
  >
    {text}
  </span>
);

type LandingHeaderProps = {
  variant?: HeaderVariant;
  layout?: "content" | "hero";
  className?: string;
};

export function LandingHeader({ variant = "default", layout = "content", className }: LandingHeaderProps) {
  const theme = headerThemes[variant];
  const marketingT = useTranslations("marketing");
  const footerT = useTranslations("footer");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => setIsMenuOpen((previous) => !previous);
  const closeMenu = () => setIsMenuOpen(false);

  const containerClassName =
    layout === "hero"
      ? "w-full pt-2 pb-0.2 md:pt-4 md:pb-[0.1rem]"
      : "mx-auto w-full max-w-[1232px] px-6 pt-2 pb-0.2 md:pt-4 md:pb-[0.1rem]";

  return (
    <header
      className={cn(
        "pointer-events-none w-full z-60 transition-all duration-300",
        layout === "hero" ? "absolute inset-x-0 top-0" : "relative",
        isScrolled ? theme.headerScrolled : theme.headerUnscrolled,
        className,
      )}
    >
      <div className="pointer-events-auto px-6">
        <div className={containerClassName}>
          <div className="flex items-center gap-6">
            <Link href="/" aria-label={footerT("homeAria")} className="relative flex items-center gap-3 text-md font-regular">
              <span aria-hidden className={cn("absolute inset-0 -z-10 rounded-full blur-2xl", theme.logoGlow)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Nexis"
                className={theme.logoClassName}
                height={theme.logoHeight}
                src={theme.logoSrc}
                style={{ width: theme.logoWidth, height: "auto" }}
                width={theme.logoWidth}
              />
            </Link>

            <div className="flex-1" />

            <div className="flex items-center justify-end gap-1">
              <NavigationLinks className="hidden md:flex border-transparent" onNavigate={closeMenu} theme={theme} />
              <button
                type="button"
                aria-label={marketingT(isMenuOpen ? "closeMenu" : "openMenu")}
                aria-expanded={isMenuOpen}
                onClick={toggleMenu}
                className={cn(
                  "pointer-events-auto rounded-full border p-2 backdrop-blur md:hidden transition-colors duration-300",
                  theme.menuToggleButton,
                )}
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isMenuOpen ? <MobileNav onNavigate={closeMenu} theme={theme} /> : null}
        </div>
      </div>
    </header>
  );
}

const NavigationLinks = ({
  className,
  onNavigate,
  theme,
}: {
  className?: string;
  onNavigate?: () => void;
  theme: HeaderTheme;
}) => {
  const t = useTranslations("marketing");
  return (
    <nav className={cn("flex items-center gap-1 text-[11px] font-sans font-thin", theme.navText, className)}>
      <div className="menubar h-auto w-auto">
        <DevelopersDropdown className={cn(theme.navItemSeparator, "ml-0 bg-transparent")} theme={theme} />
        {primaryNavLinks.map((link) => {
          const isCta = "variant" in link && link.variant === "cta";
          return isCta ? (
            <Link
              key={link.label}
              href={link.href}
              className={cn(publicHeaderLoginLightButtonClassName)}
              onClick={onNavigate}
            >
              {translateMarketingLabel(t, link.label)}
            </Link>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="menubar-item !text-[11px] !font-thin !tracking-[0.08em]"
              onClick={onNavigate}
            >
              {translateMarketingLabel(t, link.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const DevelopersDropdown = ({ className, theme }: { className?: string; theme: HeaderTheme }) => {
  const t = useTranslations("marketing");
  // Delay DropdownMenu render until after hydration to prevent ID mismatch
  // between server and client (Radix uses useId() internally)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a static placeholder during SSR/hydration to match server output
  if (!mounted) {
    return (
      <button type="button" className={getMenuItemClass(theme, className)}>
        <MenuHoverBackdrop className={theme.menuHoverBackdrop} />
        <MenuLabel text={`[ ${t("developers")} ]`} theme={theme} />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={getMenuItemClass(theme, className)}>
          <MenuHoverBackdrop className={theme.menuHoverBackdrop} />
          <MenuLabel text={`[ ${t("developers")} ]`} theme={theme} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className={cn("w-52 space-y-1", theme.developerDropdownContent)}>
        {developerLinks.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="p-0 focus:bg-transparent">
            <Link
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              className={cn(
                "transition no-underline border-none outline-none ring-0",
                theme.developerItem,
              )}
            >
              <span className={cn("transition", theme.developerItemIcon)}><item.icon className="size-4" /></span>
              <span className={cn("transition", theme.developerItemText)}>{translateMarketingLabel(t, item.label)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// MobileNav component removed - using imported version
