"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type WalletCardReceiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  chainName: string;
};

export function WalletCardReceiveDialog({
  open,
  onOpenChange,
  address,
  chainName,
}: WalletCardReceiveDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(address)}`;

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="wallet-card-receive-dialog"
        className="max-w-sm border-white/10 bg-[#121212] text-white"
      >
        <DialogHeader>
          <DialogTitle>Receive {chainName}</DialogTitle>
          <DialogDescription className="text-white/58">
            Scan the QR code or copy the wallet address to receive funds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-[24px] bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            {address ? (
              <Image
                src={qrUrl}
                alt="Wallet receive QR code"
                width={196}
                height={196}
                unoptimized
              />
            ) : (
              <div className="h-[196px] w-[196px] animate-pulse rounded-[18px] bg-zinc-200" />
            )}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">
              Wallet Address
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-xs text-white/80">
                {address || "Address unavailable"}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                onClick={handleCopy}
                disabled={!address}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#9dde4a]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
