"use client";

import { useEffect } from "react";
import { MenuIcon, XIcon } from "lucide-react";

import { Portal, PortalBackdrop } from "@/components/ui/portal";
import { Button } from "@/components/ui/button";
import {
  hobbesHeaderOutlinePillActionClassName,
  hobbesHeaderSolidPillActionClassName,
} from "@/components/new-header/hobbes-header-action-styles";
import { cn } from "@/lib/utils";

type NavLink = {
  label: string;
  href: string;
};

type ActionLink = NavLink & {
  external?: boolean;
};

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navLinks: NavLink[];
  primaryAction: ActionLink;
  secondaryAction?: ActionLink;
  progress: number;
  panelTop: number;
  state: "resting" | "transitioning" | "compact" | "menu-open";
}

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;

export function MobileNav({
  open,
  onOpenChange,
  navLinks,
  primaryAction,
  secondaryAction,
  progress,
  panelTop,
  state,
}: MobileNavProps) {
  const compactProgress = Math.min(1, Math.max(0, progress));
  const triggerSize = interpolate(40, 34, compactProgress);
  const panelRadius = interpolate(26, 20, compactProgress);
  const panelPadding = interpolate(16, 12, compactProgress);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onOpenChange(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onOpenChange]);

  const close = () => onOpenChange(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        aria-controls="hobbes-mobile-menu"
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="rounded-md border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-menu-fg)] shadow-none transition-[width,height,background-color] duration-300 hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-hover-fg)]"
        data-state={state}
        onClick={() => onOpenChange(!open)}
        size="icon-sm"
        style={{
          width: `${triggerSize}px`,
          height: `${triggerSize}px`,
        }}
        variant="outline"
      >
        {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
      </Button>

      {open ? (
        <Portal className="top-0 overflow-y-auto px-3 pb-6 md:px-4" id="hobbes-mobile-menu">
          <PortalBackdrop onClick={close} />
          <div className="relative mx-auto w-full max-w-5xl" style={{ paddingTop: `${panelTop}px` }}>
            <div
              className="border border-[var(--auth-menu-border)] bg-[var(--auth-menu-bg)] shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-radius,padding,transform] duration-300"
              data-state={state}
              style={{
                borderRadius: `${panelRadius}px`,
                padding: `${panelPadding}px`,
                transform: `translateY(${interpolate(0, -2, compactProgress)}px)`,
              }}
            >
              <div className="grid gap-2">
                {navLinks.map((link) => (
                  <Button
                    key={link.label}
                    asChild
                    variant="ghost"
                    className="h-11 justify-start rounded-md px-4 text-sm font-medium text-[color-mix(in_oklab,var(--auth-menu-fg)_82%,transparent)] hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-hover-fg)]"
                  >
                    <a href={link.href} onClick={close}>
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>

              <div className="mt-6 grid gap-2">
                {secondaryAction ? (
                  <a
                    className={cn("min-h-11 w-full", hobbesHeaderSolidPillActionClassName)}
                    href={secondaryAction.href}
                    target={secondaryAction.external ? "_blank" : undefined}
                    rel={secondaryAction.external ? "noreferrer" : undefined}
                    onClick={close}
                  >
                    {secondaryAction.label}
                  </a>
                ) : null}

                <a className={cn("min-h-11 w-full", hobbesHeaderOutlinePillActionClassName)} href={primaryAction.href} onClick={close}>
                  {primaryAction.label}
                </a>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
