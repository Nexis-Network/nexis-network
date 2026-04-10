"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SendStep = "form" | "confirm" | "sending" | "success" | "error";

type CdpSendModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAddress: string;
  platform: "evm" | "solana";
  chainId?: number;
};

type SendFormState = {
  recipient: string;
  amount: string;
};

type SendResult = {
  txHash: string;
  explorerUrl: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function validateAddress(value: string, platform: "evm" | "solana"): string | null {
  if (!value.trim()) return "Recipient address is required";
  if (platform === "evm" && !EVM_ADDRESS_REGEX.test(value)) {
    return "Invalid EVM address (must be 0x followed by 40 hex characters)";
  }
  if (platform === "solana" && !SOLANA_ADDRESS_REGEX.test(value)) {
    return "Invalid Solana address";
  }
  return null;
}

function validateAmount(value: string): string | null {
  if (!value.trim()) return "Amount is required";
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return "Amount must be greater than 0";
  return null;
}

function getChainLabel(platform: "evm" | "solana"): string {
  return platform === "solana" ? "Solana" : "Base (EVM)";
}

function getNativeSymbol(platform: "evm" | "solana"): string {
  return platform === "solana" ? "SOL" : "ETH";
}

function getExplorerUrl(txHash: string, platform: "evm" | "solana"): string {
  if (platform === "solana") return `https://solscan.io/tx/${txHash}`;
  return `https://basescan.org/tx/${txHash}`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CdpSendModal({
  open,
  onOpenChange,
  fromAddress,
  platform,
  chainId,
}: CdpSendModalProps) {
  const [step, setStep] = useState<SendStep>("form");
  const [form, setForm] = useState<SendFormState>({ recipient: "", amount: "" });
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({});
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const nativeSymbol = useMemo(() => getNativeSymbol(platform), [platform]);
  const chainLabel = useMemo(() => getChainLabel(platform), [platform]);

  const resetState = useCallback(() => {
    setStep("form");
    setForm({ recipient: "", amount: "" });
    setErrors({});
    setSendResult(null);
    setSendError(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState],
  );

  const handleValidateAndConfirm = useCallback(() => {
    const recipientError = validateAddress(form.recipient, platform);
    const amountError = validateAmount(form.amount);

    if (recipientError || amountError) {
      setErrors({
        recipient: recipientError ?? undefined,
        amount: amountError ?? undefined,
      });
      return;
    }

    setErrors({});
    setStep("confirm");
  }, [form, platform]);

  const handleSend = useCallback(async () => {
    setStep("sending");
    setSendError(null);

    try {
      const response = await fetch(`/api/cdp/wallets/${fromAddress}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: form.recipient,
          amount: form.amount,
          platform,
          chainId: chainId ?? (platform === "evm" ? 8453 : "solana"),
        }),
      });

      const body = (await response.json()) as {
        success?: boolean;
        data?: { txHash?: string; explorerUrl?: string };
        error?: { message?: string };
      };

      if (!response.ok || !body.success || !body.data?.txHash) {
        throw new Error(body.error?.message ?? "Transaction failed");
      }

      const result: SendResult = {
        txHash: body.data.txHash,
        explorerUrl:
          body.data.explorerUrl ?? getExplorerUrl(body.data.txHash, platform),
      };

      setSendResult(result);
      setStep("success");

      // Auto-close after 3 seconds on success
      setTimeout(() => {
        handleOpenChange(false);
      }, 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  }, [fromAddress, form, platform, chainId, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Send
          </DialogTitle>
          <DialogDescription>
            Send tokens from your Nex Wallet on {chainLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Form Step */}
        {step === "form" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="cdp-send-recipient"
                className="text-sm font-medium text-white"
              >
                Recipient Address
              </label>
              <Input
                id="cdp-send-recipient"
                placeholder={
                  platform === "evm"
                    ? "0x..."
                    : "Solana address..."
                }
                value={form.recipient}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, recipient: e.target.value }));
                  if (errors.recipient) {
                    setErrors((prev) => ({ ...prev, recipient: undefined }));
                  }
                }}
                className={cn(
                  "font-mono text-sm",
                  errors.recipient && "border-red-500 focus-visible:border-red-500",
                )}
                aria-invalid={!!errors.recipient}
                aria-describedby={errors.recipient ? "cdp-send-recipient-error" : undefined}
              />
              {errors.recipient && (
                <p id="cdp-send-recipient-error" className="text-xs text-red-400">
                  {errors.recipient}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="cdp-send-amount"
                className="text-sm font-medium text-white"
              >
                Amount
              </label>
              <div className="relative">
                <Input
                  id="cdp-send-amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, amount: e.target.value }));
                    if (errors.amount) {
                      setErrors((prev) => ({ ...prev, amount: undefined }));
                    }
                  }}
                  className={cn(
                    "pr-16",
                    errors.amount && "border-red-500 focus-visible:border-red-500",
                  )}
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? "cdp-send-amount-error" : undefined}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {nativeSymbol}
                </span>
              </div>
              {errors.amount && (
                <p id="cdp-send-amount-error" className="text-xs text-red-400">
                  {errors.amount}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Token</span>
                <span>Native ({nativeSymbol})</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Estimated gas</span>
                <span>~$0.01</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleValidateAndConfirm} className="flex-1">
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Confirmation Step */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm font-mono text-white">
                  {truncateAddress(fromAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-mono text-white">
                  {truncateAddress(form.recipient)}
                </span>
              </div>
              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-semibold text-white">
                    {form.amount} {nativeSymbol}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <span className="text-sm text-white">{chainLabel}</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSend} className="flex-1">
                Confirm &amp; Send
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Sending Step */}
        {step === "sending" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-muted-foreground">
              Submitting transaction...
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && sendResult && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">
                Transaction Submitted
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {truncateAddress(sendResult.txHash)}
              </p>
            </div>
            <a
              href={sendResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-white">
                Transaction Failed
              </p>
              <p className="text-xs text-red-400">
                {sendError ?? "An unknown error occurred"}
              </p>
            </div>
            <DialogFooter className="w-full">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="flex-1"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
