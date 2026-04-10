"use client";

/**
 * ConnectWalletModal
 *
 * Domain: Web3/Wallet UI
 * Responsibility: Modal for connecting EOA wallets (MetaMask, WalletConnect, etc.)
 * Dependencies: useConnectEoaWallet hook, shadcn/ui components
 */

import { useCallback, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { cn } from "@/lib/utils";

type ConnectWalletModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (address: string) => void;
};

type ConnectionStep = "select" | "connecting" | "connected" | "error";

/**
 * Modal component for connecting EOA wallets.
 *
 * Features:
 * - Grid of wallet options (MetaMask, WalletConnect, etc.)
 * - Loading state during connection
 * - Success/error feedback
 * - Automatic wallet linking on success
 */
export function ConnectWalletModal({
  open,
  onOpenChange,
  onSuccess,
}: ConnectWalletModalProps) {
  const [step, setStep] = useState<ConnectionStep>("select");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const {
    connect,
    linkWallet,
    isConnecting,
    address,
    error,
    resetError,
    disconnect,
    walletOptions,
  } = useConnectEoaWallet();

  const handleWalletSelect = useCallback(
    async (walletId: string) => {
      setSelectedWallet(walletId);
      setStep("connecting");
      resetError();

      try {
        const connectedWallet = await connect(walletId);
        setStep("connected");

        // Auto-link the wallet to user account
        await linkWallet(connectedWallet);

        const resolvedAddress = connectedWallet?.address ?? address;
        if (resolvedAddress) {
          onSuccess?.(resolvedAddress);
        }

        // Close modal after short delay to show success
        setTimeout(() => {
          onOpenChange(false);
          setStep("select");
          setSelectedWallet(null);
        }, 1500);
      } catch {
        setStep("error");
      }
    },
    [connect, linkWallet, address, onSuccess, onOpenChange, resetError]
  );

  const handleRetry = useCallback(() => {
    resetError();
    setStep("select");
    setSelectedWallet(null);
  }, [resetError]);

  const handleClose = useCallback(() => {
    if (step === "error") {
      disconnect();
    }
    onOpenChange(false);
    setStep("select");
    setSelectedWallet(null);
    resetError();
  }, [step, disconnect, onOpenChange, resetError]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Connect Wallet"}
            {step === "connecting" && "Connecting..."}
            {step === "connected" && "Connected!"}
            {step === "error" && "Connection Failed"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Choose a wallet to connect. Your wallet will be linked to your account."}
            {step === "connecting" &&
              `Approve the connection request in your ${selectedWallet ?? "wallet"} app.`}
            {step === "connected" && "Your wallet has been connected and linked."}
            {step === "error" && (error ?? "Failed to connect wallet. Please try again.")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "select" && (
            <div className="grid grid-cols-3 gap-3">
              {walletOptions.map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className={cn(
                    "flex flex-col items-center justify-center h-24 gap-2",
                    "hover:border-primary hover:bg-primary/5",
                    "transition-all duration-200"
                  )}
                  onClick={() => handleWalletSelect(wallet.id)}
                  disabled={isConnecting}
                >
                  <div className="relative w-10 h-10">
                    <Image
                      src={wallet.icon}
                      alt={wallet.name}
                      fill
                      sizes="40px"
                      className="object-contain rounded-md"
                      onError={(e) => {
                        // Fallback to generic wallet icon
                        (e.target as HTMLImageElement).src =
                          "/assets/wallet-logos/Safe-Wallet.svg";
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium truncate max-w-full">
                    {wallet.name}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {step === "connecting" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Waiting for wallet confirmation...
              </p>
            </div>
          )}

          {step === "connected" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="text-sm font-medium">Wallet Connected</p>
                {address && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {step === "select" && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Need a wallet?</span>
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
