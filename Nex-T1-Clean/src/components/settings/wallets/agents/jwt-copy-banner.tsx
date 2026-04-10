"use client";

import { Check } from "lucide-react";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";
import { useMemo, useState, useCallback } from "react";

import { Button } from "@/components/settings/shared/settings-button";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type JwtCopyBannerProps = {
  jwt: string;
  expiresAt: string;
  onDismiss: () => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function JwtCopyBanner({ jwt, expiresAt, onDismiss }: JwtCopyBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jwt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [jwt]);

  const expiresLabel = useMemo(() => {
    try {
      const date = new Date(expiresAt);
      return date.toLocaleTimeString();
    } catch {
      return expiresAt;
    }
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/70 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--settings-accent)]">JWT Exported</p>
        <p className="text-xs text-[var(--settings-foreground-muted)] truncate font-mono">
          {jwt.slice(0, 40)}...
        </p>
        <p className="text-[10px] text-[var(--settings-foreground-muted)] opacity-60">
          Expires at {expiresLabel}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--settings-accent)]" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-[var(--settings-foreground-muted)]"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
