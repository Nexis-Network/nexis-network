"use client";

import { QrCode, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/settings/shared/settings-button";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";

import { useState } from "react";
interface ReceiveAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string | null;
  walletLabel: string;
}

export function ReceiveAssetModal({ open, onOpenChange, address, walletLabel }: ReceiveAssetModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--bento-bg)] border-[var(--bento-border)] text-[var(--bento-text-primary)]">
        <DialogHeader>
          <DialogTitle>Receive Assets</DialogTitle>
          <DialogDescription className="text-[var(--bento-text-muted)]">
            Send assets to your {walletLabel} address on supported networks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          <div className="rounded-xl border border-[var(--bento-border)] bg-[var(--settings-card-bg)] p-4">
             {/* Fallback QR Icon if library not installed, but standard QR code placeholder for now */}
             <QrCode className="h-40 w-40 text-[var(--settings-foreground-strong)]" />
          </div>
          <div className="w-full">
            <p className="text-xs font-medium text-[var(--bento-text-muted)] mb-2 uppercase tracking-wider">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-3 py-2 text-sm text-[var(--bento-text-muted)] overflow-x-auto">
                {address || "Address unavailable"}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)] hover:bg-[var(--settings-elevated)]/80"
                onClick={handleCopy}
                disabled={!address}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
