"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, type FocusEvent, type RefObject } from "react";

import { HyperText } from "@/components/ui/hyper-text";
import { cn } from "@/lib/utils";

import { HeaderDivider } from "./header-divider";
import { HEADER_MAIN_NAV_ITEMS } from "./header-main-nav-data";

const navLinkClassName =
  "relative pt-[2px] text-[11px] leading-[11px] text-[var(--auth-nav-text)] transition-colors duration-200 hover:text-[var(--auth-nav-text-active)]";

type HeaderMainNavLinksProps = {
  activeDropdownId: string | null;
  closeDropdownImmediately: () => void;
  isDocsActive: boolean;
  onOpen: (itemId: string) => void;
  translateLabel: (label: string) => string;
};

function HeaderMainNavLinks({
  activeDropdownId,
  closeDropdownImmediately,
  isDocsActive,
  onOpen,
  translateLabel,
}: HeaderMainNavLinksProps) {
  return (
    <>
      <Link
        href="/app"
        className={navLinkClassName}
        onMouseEnter={closeDropdownImmediately}
      >
        <HyperText text={translateLabel("Chat")} />
      </Link>

      {HEADER_MAIN_NAV_ITEMS.map((item) => (
        <div key={item.id} className="flex items-center gap-4">
          <HeaderDivider />
          <button
            type="button"
            onMouseEnter={() => onOpen(item.id)}
            className={cn(
              navLinkClassName,
              "flex items-center",
              activeDropdownId === item.id &&
                "text-[var(--auth-nav-text-active)]",
            )}
            onFocus={() => onOpen(item.id)}
            aria-expanded={activeDropdownId === item.id}
            aria-haspopup="menu"
          >
            <HyperText text={translateLabel(item.title)} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <HeaderDivider />
        <Link
          href="/docs"
          onMouseEnter={closeDropdownImmediately}
          className={cn(
            navLinkClassName,
            isDocsActive && "text-[var(--auth-nav-text-active)]",
          )}
        >
          <HyperText text={translateLabel("Docs")} />
        </Link>
      </div>
    </>
  );
}

type HeaderMainNavProps = {
  activeDropdownId: string | null;
  className?: string;
  clearCloseTimer: () => void;
  closeDropdownImmediately: () => void;
  closeDropdownSoon: () => void;
  focusBoundaryRef: RefObject<HTMLElement | null>;
  openDropdown: (itemId: string) => void;
  translateLabel: (label: string) => string;
};

export function HeaderMainNav({
  activeDropdownId,
  className,
  clearCloseTimer,
  closeDropdownImmediately,
  closeDropdownSoon,
  focusBoundaryRef,
  openDropdown,
  translateLabel,
}: HeaderMainNavProps) {
  const pathname = usePathname();
  const isDocsActive = pathname === "/docs" || pathname?.startsWith("/docs/");

  const handleNavBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;

      if (
        nextTarget instanceof Node &&
        focusBoundaryRef.current?.contains(nextTarget)
      ) {
        return;
      }

      closeDropdownImmediately();
    },
    [closeDropdownImmediately, focusBoundaryRef],
  );

  return (
    <nav
      className={cn(
        "relative z-[56] flex min-w-0 flex-1 flex-col justify-center font-sans",
        className,
      )}
      aria-label="Main navigation"
      onBlurCapture={handleNavBlur}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={closeDropdownSoon}
    >
      <div className="relative z-[56] flex w-full items-center justify-start">
        <div className="flex w-full items-center gap-4 px-5 text-xs xl:px-0">
          <HeaderMainNavLinks
            activeDropdownId={activeDropdownId}
            closeDropdownImmediately={closeDropdownImmediately}
            isDocsActive={isDocsActive}
            onOpen={openDropdown}
            translateLabel={translateLabel}
          />
        </div>
      </div>
    </nav>
  );
}
