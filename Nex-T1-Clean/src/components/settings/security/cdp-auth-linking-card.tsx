"use client";

import { Loader2, Link2 } from "lucide-react";
import { PlusIcon, TrashIcon } from "@/components/sidebar-03/animated-icons";
import { cn } from "@/lib/utils";
import { useCdpAuthLinking, type LinkedAuthMethod } from "@/lib/hooks/cdp/use-cdp-auth-linking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Separator } from "@/components/ui/separator";
import { BentoCard } from "@/components/settings/shared/bento-card";

import { getMethodIcon, getMethodLabel, formatDate } from "./cdp-auth/auth-method-helpers";
import { LinkEmailDialog } from "./cdp-auth/link-email-dialog";
import { UnlinkConfirmDialog } from "./cdp-auth/unlink-confirm-dialog";

import { useCallback, useState } from "react";
export function CdpAuthLinkingCard() {
  const {
    methods,
    isLoading,
    error,
    linkEmail,
    verifyEmailLink,
    unlinkMethod,
    isLinkingEmail,
    isVerifying,
    isUnlinking,
  } = useCdpAuthLinking();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<LinkedAuthMethod | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const handleUnlinkRequest = useCallback((method: LinkedAuthMethod) => {
    setSelectedMethod(method);
    setUnlinkError(null);
    setUnlinkDialogOpen(true);
  }, []);

  const handleConfirmUnlink = useCallback(async () => {
    if (!selectedMethod) return;
    setUnlinkError(null);
    try {
      await unlinkMethod(selectedMethod.id);
      setUnlinkDialogOpen(false);
      setSelectedMethod(null);
    } catch (err) {
      setUnlinkError(err instanceof Error ? err.message : "Failed to remove method");
    }
  }, [selectedMethod, unlinkMethod]);

  return (
    <>
      <BentoCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-400" />
            <h3 className="settings-card-title">Linked Authentication Methods</h3>
          </div>
          <Badge variant="outline" className="text-[10px] bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
            {isLoading ? "Loading..." : error ? "Unavailable" : `${methods.length} linked`}
          </Badge>
        </div>

        <p className="settings-card-description">
          Manage the authentication methods linked to your account. You can add email addresses for additional sign-in options.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--bento-text-muted)]" />
          </div>
        ) : error ? (
          <div className="settings-inline-section rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-4">
            <p className="text-sm text-red-300">Unable to load linked authentication methods.</p>
            <p className="mt-1 text-xs text-red-200/80">{error.message}</p>
          </div>
        ) : methods.length > 0 ? (
          <div className="settings-inline-list">
            {methods.map((method, index) => (
              <div
                key={method.id}
                className={cn(
                  "settings-inline-row flex items-center justify-between gap-3",
                  index === 0 && "pt-0",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getMethodIcon(method.type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--bento-text-primary)] truncate">{method.identifier}</span>
                      {method.isPrimary && (
                        <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--bento-text-muted)]">
                      <span>{getMethodLabel(method.type)}</span>
                      <span>--</span>
                      <span>Linked {formatDate(method.linkedAt)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-[var(--bento-text-muted)] hover:text-red-400"
                  onClick={() => handleUnlinkRequest(method)}
                  disabled={isUnlinking}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="settings-inline-section px-1 py-2 text-center">
            <p className="text-sm text-[var(--bento-text-muted)]">No authentication methods linked yet.</p>
          </div>
        )}

        {unlinkError && <p className="text-xs text-red-400">{unlinkError}</p>}

        <Separator className="bg-[var(--bento-border)]" />

        <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)} disabled={isLoading}>
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Link Email Address
        </Button>
      </BentoCard>

      <LinkEmailDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onLinkEmail={linkEmail}
        onVerify={verifyEmailLink}
        isLinking={isLinkingEmail}
        isVerifying={isVerifying}
      />

      <UnlinkConfirmDialog
        open={unlinkDialogOpen}
        onOpenChange={setUnlinkDialogOpen}
        method={selectedMethod}
        onConfirm={handleConfirmUnlink}
        isUnlinking={isUnlinking}
      />
    </>
  );
}
