"use client";

import { Eye, KeyRound, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/settings/shared/settings-button";
import { toast } from "sonner";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";

import { useState } from "react";
interface ExportKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  provider: string | null;
  walletType: string;
  /** Nex Wallets use server-side key export via /api/cdp/wallets/[address]/export-keys */
  walletAddress?: string;
}

/**
 * Determines if a wallet type supports key export.
 *
 * Only Nex Wallets support server-side key export through
 * the CDP SDK. All other wallet types either:
 *   - Are contract wallets with no single private key (smart account/multisig)
 *   - Are externally-connected wallets managed by the user's own provider (EoA)
 *   - Are unknown/unsupported wallet types
 *
 * SECURITY: We must NEVER return fake/zero keys for unsupported wallet types.
 * Returning a zero key (0x000...0) would mislead users into thinking they have
 * exported a real key, potentially causing loss of funds or false security confidence.
 */
function getExportUnsupportedReason(
  provider: string | null,
  walletType: string,
): string | null {
  const providerLower = typeof provider === "string" ? provider.toLowerCase() : "";

  const isSmartAccount =
    providerLower === "safe" || walletType === "multiSig";
  if (isSmartAccount) {
    return "Smart Account wallets are contract-based wallets on the blockchain and do not have a single extractable private key.";
  }

  const isEoA = walletType === "eoa" || walletType === "external_connected";
  if (isEoA) {
    return "This wallet is an externally-connected account (EoA). Please use your wallet provider (e.g., MetaMask, Phantom) to manage your private key.";
  }

  // CDP (Nex Wallets) support server-side key export.
  // Check both the UI category and the actual provider identity.
  const isCdpWallet = walletType === "cdp" || providerLower === "cdp";
  if (!isCdpWallet) {
    return `Key export is not supported for this wallet type (${walletType || "unknown"}). Only Nex Wallets support server-side key export.`;
  }

  return null; // Nex Wallets are supported
}

export function ExportKeyModal({
  open,
  onOpenChange,
  walletId: _walletId,
  provider,
  walletType,
  walletAddress,
}: ExportKeyModalProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const unsupportedReason = getExportUnsupportedReason(provider, walletType);
  const isExportSupported = unsupportedReason === null;

  const handleReveal = async () => {
    if (!isExportSupported) return;
    if (!walletAddress) {
      setExportError("Wallet address is required for key export.");
      return;
    }

    setIsExtracting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/cdp/wallets/${walletAddress}/export-keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const errorMsg =
          typeof json.message === "string"
            ? json.message
            : typeof json.error === "string"
              ? json.error
              : "Failed to export wallet keys. Please try again.";
        throw new Error(errorMsg);
      }

      const data = json.data as { privateKey?: string } | undefined;
      if (!data?.privateKey) {
        throw new Error("No private key was returned from the server.");
      }

      setPrivateKey(data.privateKey);
      setIsRevealed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export wallet keys.";
      setExportError(message);
      toast.error("Key export failed", { description: message });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      toast.success("Private key copied to clipboard.", {
        description: "Never share your private key with anyone.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          setIsRevealed(false);
          setPrivateKey(null);
          setExportError(null);
        }
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md bg-[var(--bento-bg)] border-[var(--bento-border)] text-[var(--bento-text-primary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <KeyRound className="w-5 h-5" />
            Export Private Key
          </DialogTitle>
          <DialogDescription className="text-[var(--bento-text-muted)]">
            {unsupportedReason ? (
              unsupportedReason
            ) : (
              <span className="text-rose-400">
                Warning: Never disclose this key. Anyone with your private key
                has full control over your assets.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Unsupported wallet type: show clear explanation, no reveal button */}
        {!isExportSupported && (
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-500">
                  Export Not Available
                </p>
                <p className="text-xs text-[var(--bento-text-muted)]">
                  {unsupportedReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nex Wallet: real export flow */}
        {isExportSupported && (
          <div className="py-4">
            {isRevealed && privateKey ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--bento-text-muted)] uppercase tracking-wider">
                  Private Key
                </p>
                <code className="block p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs break-all">
                  {privateKey}
                </code>
                <Button
                  variant="outline"
                  className="w-full border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)] hover:bg-[var(--settings-elevated)]/80"
                  onClick={handleCopy}
                >
                  <CopyIcon className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {exportError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-400">{exportError}</p>
                  </div>
                )}
                <Button
                  className="w-full bg-rose-500 hover:bg-rose-600 text-[var(--bento-text-primary)] font-medium"
                  onClick={handleReveal}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Reveal Private Key
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="w-full text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
