"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { ApiResponse } from "@/lib/api-platform";
import { SendIcon } from "@/components/sidebar-03/animated-icons";
import { isNonZeroEVMAddress, isValidSolanaAddress, isValidStellarAddress } from "@/lib/utils/token-utils";
import { useCdpTransactions } from "@/lib/cdp/use-cdp-transactions";
import { parseEther } from "viem";

type WalletActionChainType = "evm" | "solana" | "stellar" | "hyperliquid";

type TestTxResponse = ApiResponse<{
  walletId: string;
  chainType: "evm" | "solana" | "stellar";
  txId: string;
  status: "simulated_success" | "simulated_failure";
  simulated: true;
}>;

interface SendAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  chainType: WalletActionChainType;
  maxAmount?: string;
  provider: string | null;
}

function isValidDestinationAddress(
  address: string,
  chainType: WalletActionChainType,
): boolean {
  if (chainType === "evm") return isNonZeroEVMAddress(address);
  if (chainType === "solana") return isValidSolanaAddress(address);
  if (chainType === "stellar") return isValidStellarAddress(address);
  return false;
}

export function SendAssetModal({
  open,
  onOpenChange,
  walletId,
  chainType,
  maxAmount,
  provider,
}: SendAssetModalProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"entry" | "confirm">("entry");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const cdpTx = useCdpTransactions();
  const isCdpWallet =
    cdpTx.enabled &&
    typeof provider === "string" &&
    provider.toLowerCase().includes("cdp");

  const isPolymarket = typeof provider === "string" && provider.toLowerCase() === "polymarket";
  const unsupportedChain = chainType === "hyperliquid";
  const validDestination = isValidDestinationAddress(address, chainType);
  const canReview = !unsupportedChain && Boolean(amount.trim()) && validDestination;
  const canConfirm = confirmationCode.trim().toUpperCase() === "CONFIRM";
  const chainLabel = useMemo(() => {
    if (chainType === "solana") return "Solana";
    if (chainType === "stellar") return "Stellar";
    if (chainType === "evm") return "EVM";
    return "Unsupported chain";
  }, [chainType]);

  useEffect(() => {
    if (!open) {
      setAddress("");
      setAmount("");
      setStep("entry");
      setConfirmationCode("");
      setErrorMessage(null);
      setLastTxId(null);
    }
  }, [open]);

  const handleReview = () => {
    if (!canReview) {
      toast.error("Enter a valid destination address and amount.");
      return;
    }
    setErrorMessage(null);
    setLastTxId(null);
    setStep("confirm");
  };

  /** Send via CDP client-side hooks (Smart Account UserOp or Solana tx) */
  const handleCdpSend = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setLastTxId(null);

    try {
      if (chainType === "evm") {
        const weiValue = parseEther(amount.trim());
        const result = await cdpTx.sendEvmUserOperation({
          calls: [{ to: address.trim(), value: weiValue }],
        });
        setLastTxId(result.userOperationHash ?? null);
        toast.success("Transaction submitted via Nex Wallet (EVM).");
      } else if (chainType === "solana") {
        // Solana sends require a pre-built base64 transaction.
        // For native SOL transfers, a future helper will construct the tx.
        // For now, surface an error prompting the server flow.
        throw new Error(
          "Direct Nex Wallet (SOL) native transfers require a serialized transaction. " +
          "Use the server-side flow or swap widget for SOL transfers."
        );
      } else {
        throw new Error(`Nex Wallet does not support chain type: ${chainType}`);
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nex Wallet transaction failed.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Send via server-side test transaction API (non-Nex Wallets) */
  const handleLegacySend = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setLastTxId(null);

    try {
      const response = await fetch("/api/wallets/test-transaction", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          walletId,
          chainType,
          to: address.trim(),
          amount: amount.trim(),
          confirmationCode: confirmationCode.trim(),
        }),
      });

      const json = (await response
        .json()
        .catch(() => null)) as TestTxResponse | null;

      if (!response.ok || !json?.success || !json.data) {
        const message =
          typeof json?.error?.message === "string"
            ? json.error.message
            : "Failed to execute test transaction";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      setLastTxId(json.data.txId);
      if (json.data.status === "simulated_failure") {
        const message =
          "Simulated failure recorded (deterministic test mode). Change amount and retry.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success("Simulated test transaction submitted.");
      onOpenChange(false);
    } catch {
      const message = "Failed to execute test transaction.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!canReview) {
      toast.error("Enter a valid destination address and amount.");
      return;
    }

    if (!canConfirm) {
      toast.error("Type CONFIRM to continue.");
      return;
    }

    if (isCdpWallet) {
      await handleCdpSend();
    } else {
      await handleLegacySend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--bento-bg)] border-[var(--bento-border)] text-[var(--bento-text-primary)]">
        <DialogHeader>
          <DialogTitle>Send Asset</DialogTitle>
          <DialogDescription className="text-[var(--bento-text-muted)]">
            {isCdpWallet
              ? "Send a transaction from your Nex Wallet."
              : "Run a non-production test transaction flow with explicit confirmation."}
            {isPolymarket && <span className="block mt-1 text-yellow-500">Polymarket withdrawals are restricted to whitelisted EoAs.</span>}
          </DialogDescription>
        </DialogHeader>

        {step === "entry" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--bento-text-muted)]">Destination Address</label>
              <Input
                placeholder={
                  chainType === "evm"
                    ? "0x..."
                    : chainType === "solana"
                      ? "Solana address"
                      : "Stellar address"
                }
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)] placeholder:text-[var(--bento-text-muted)]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--bento-text-muted)]">Amount</label>
                {maxAmount && (
                  <span className="text-[10px] text-[var(--bento-text-muted)] cursor-pointer hover:text-[var(--bento-text-primary)] transition-colors" onClick={() => setAmount(maxAmount)}>
                    Max: {maxAmount}
                  </span>
                )}
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-[var(--bento-border)] bg-[var(--settings-elevated)] font-mono font-normal text-[var(--bento-text-primary)] placeholder:text-[var(--bento-text-muted)]"
              />
            </div>

            <div className="rounded-md border border-[var(--bento-border)] bg-[var(--settings-card-bg)] p-3 text-xs text-[var(--bento-text-muted)]">
              Chain: <span className="font-medium text-[var(--bento-text-primary)]">{chainLabel}</span>
              {isCdpWallet && (
                <>
                  <br />
                  Sending via Nex Wallet (EVM) (gas sponsored).
                </>
              )}
              {!isCdpWallet && (
                <>
                  <br />
                  This submits a simulated test transaction only. No real value is broadcast.
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-[var(--bento-border)] bg-[var(--settings-card-bg)] p-3 text-xs text-[var(--bento-text-muted)]">
              <div className="font-medium text-[var(--bento-text-primary)] mb-2">Review transaction</div>
              <div>Chain: {chainLabel}</div>
              <div>Destination: {address}</div>
              <div>Amount: {amount}</div>
              {isCdpWallet && <div className="mt-1 text-emerald-400">Via Nex Wallet (EVM)</div>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--bento-text-muted)]">
                Type <span className="font-semibold text-[var(--bento-text-primary)]">CONFIRM</span> to continue
              </label>
              <Input
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="border-[var(--bento-border)] bg-[var(--settings-elevated)] text-[var(--bento-text-primary)] placeholder:text-[var(--bento-text-muted)]"
                placeholder="CONFIRM"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            ) : null}
            {lastTxId ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {isCdpWallet ? "UserOp hash" : "Simulated tx id"}: <span className="font-mono">{lastTxId}</span>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {step === "entry" ? (
            <>
              <Button variant="ghost" className="text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)]" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#00D5FF] text-black hover:bg-[#00D5FF]/90 font-medium px-6"
                onClick={handleReview}
                disabled={isSubmitting || !canReview}
              >
                <SendIcon className="w-4 h-4 mr-2" />
                Review Send
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)]"
                onClick={() => setStep("entry")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                className="bg-[#00D5FF] text-black hover:bg-[#00D5FF]/90 font-medium px-6"
                onClick={handleSend}
                disabled={isSubmitting || !canConfirm || unsupportedChain}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4 mr-2" />
                )}
                {isCdpWallet ? "Confirm Send" : "Confirm Test Transaction"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
