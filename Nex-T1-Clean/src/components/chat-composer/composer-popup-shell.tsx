"use client";

import { type ReactNode, type RefObject, useEffect } from "react";
import { Command } from "cmdk";

import { COMPOSER_POPUP_SHELL_SURFACE_CLASS } from "@/components/chat-composer/composer-theme";
import { useCspNonce } from "@/lib/security/client-nonce";
import { cn } from "@/lib/utils";

type ComposerPopupShellProps = {
  open: boolean;
  label: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  searchPlaceholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  afterSearch?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function ComposerPopupShell({
  open,
  label,
  query,
  onQueryChange,
  onClose,
  searchPlaceholder,
  inputRef,
  afterSearch,
  children,
  footer,
}: ComposerPopupShellProps) {
  const nonce = useCspNonce();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    onQueryChange("");
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [inputRef, onQueryChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[320]" onClick={onClose} role="presentation">
      <div
        className="pointer-events-none absolute left-1/2 bottom-full w-full max-w-2xl -translate-x-1/2 -translate-y-4"
        role="presentation"
      >
        <div
          className={cn(
            "pointer-events-auto",
            COMPOSER_POPUP_SHELL_SURFACE_CLASS,
            "!border-[var(--auth-composer-menu-border)]",
          )}
          onClick={(event) => event.stopPropagation()}
          role="presentation"
        >
          <Command
            label={label}
            className="w-full bg-transparent text-foreground"
            shouldFilter={false}
          >
            <div className="border-b border-border px-4 py-3">
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={onQueryChange}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {afterSearch}
            <Command.List className="max-h-80 overflow-y-auto">{children}</Command.List>
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              {footer ?? (
                <span>Use ↑ ↓ to navigate • Enter to select • Esc to close</span>
              )}
            </div>
          </Command>
        </div>
      </div>
      <style jsx global nonce={nonce ?? undefined}>{`
        .nex-command-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow: hidden;
        }

        .nex-command-item::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.05);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .nex-command-item:hover::before,
        .nex-command-item:focus-visible::before {
          transform: scaleX(1);
        }
      `}</style>
    </div>
  );
}
