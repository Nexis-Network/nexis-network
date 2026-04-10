"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { useExportEvmAccount, useExportSolanaAccount } from "@coinbase/cdp-hooks";
import { logger } from "@/lib/logger";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

const CDP_EXPORT_ENABLED = CDP_EMBEDDED_ENABLED;

interface ExportCdpWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletSnapshot | null;
}

export function ExportCdpWalletDialog({ open, onOpenChange, wallet }: ExportCdpWalletDialogProps) {
  if (!CDP_EXPORT_ENABLED || !wallet || wallet.provider !== "cdp") {
    return null;
  }

  return (
    <ExportCdpWalletDialogInner
      open={open}
      onOpenChange={onOpenChange}
      wallet={wallet}
    />
  );
}

interface ExportCdpWalletDialogInnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletSnapshot;
}

function ExportCdpWalletDialogInner({ open, onOpenChange, wallet }: ExportCdpWalletDialogInnerProps) {
  const { exportEvmAccount } = useExportEvmAccount();
  const { exportSolanaAccount } = useExportSolanaAccount();

  const [isExporting, setIsExporting] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const handleExport = async () => {
    if (!wallet?.address) return;
    setIsExporting(true);
    setPrivateKey(null);

    try {
      if (wallet.metadata?.kind === "solana") {
        const result = await exportSolanaAccount({ solanaAccount: wallet.address });
        setPrivateKey(result.privateKey);
      } else {
        const result = await exportEvmAccount({ evmAccount: wallet.address as `0x${string}` });
        setPrivateKey(result.privateKey);
      }
      toast.success("Private key exported successfully.");
    } catch (e: unknown) {
      logger.error("Failed to export Nex Wallet", e);
      const message = e instanceof Error ? e.message : "Failed to export private key.";
      toast.error(message); // May be triggered if passkey auth isn't set up yet or cancelled
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = () => {
    if (privateKey) {
      void navigator.clipboard.writeText(privateKey);
      toast.success("Private key copied to clipboard!");
      onOpenChange(false);
      setPrivateKey(null);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => setPrivateKey(null), 300); // Clear after fade out
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#121212] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-red-400" />
            Export Private Key
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Export the private key for your {wallet.metadata?.kind === "solana" ? "Nex Wallet (SOL)" : "Nex Wallet (EVM)"}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!privateKey ? (
            <>
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-400">Security Warning</p>
                    <p className="text-sm text-red-300">
                      Never share your private key with anyone. Anyone with your private key will have full control over your wallet and assets. Our team will never ask for your private key.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="destructive"
                className="w-full h-11"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  "Reveal Private Key"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-500 mb-2 font-medium">Your Private Key</p>
                <div className="break-all font-mono text-xs bg-black/40 p-3 rounded border border-white/5 select-all text-white/90">
                  {privateKey}
                </div>
              </div>

              <Button
                onClick={copyToClipboard}
                className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-medium transition-all"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy and Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
