"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ShoppingCart,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useCdpCreateCharge,
  useCdpChargeStatus,
  type CdpCharge,
} from "@/lib/hooks/cdp/use-cdp-commerce";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CdpCryptoCheckoutProps = {
  /** Amount to charge (e.g. "10.00") */
  amount: string;
  /** Currency code (e.g. "USDC", "ETH") */
  currency: string;
  /** Product or charge name */
  productName: string;
  /** Optional description */
  description?: string;
  /** Called when payment is confirmed */
  onSuccess?: (charge: CdpCharge) => void;
  /** Called when user cancels or charge expires */
  onCancel?: () => void;
  /** Optional metadata to attach to the charge */
  metadata?: Record<string, string>;
};

type CheckoutPhase = "idle" | "creating" | "awaiting" | "success" | "failed" | "expired";

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CdpCharge["status"] }) {
  const config: Record<
    CdpCharge["status"],
    { label: string; className: string }
  > = {
    new: { label: "New", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    completed: { label: "Completed", className: "bg-green-500/10 text-green-400 border-green-500/20" },
    expired: { label: "Expired", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
    cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  };

  const { label, className } = config[status] ?? config.new;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CdpCryptoCheckout({
  amount,
  currency,
  productName,
  description,
  onSuccess,
  onCancel,
  metadata,
}: CdpCryptoCheckoutProps) {
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [chargeId, setChargeId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const createChargeMutation = useCdpCreateCharge();
  const { charge, isTerminal } = useCdpChargeStatus(chargeId);

  // Track terminal status changes
  useEffect(() => {
    if (!charge || !isTerminal) return;

    if (charge.status === "completed") {
      setPhase("success");
      onSuccess?.(charge);
    } else if (charge.status === "expired") {
      setPhase("expired");
    } else if (charge.status === "cancelled") {
      setPhase("failed");
    }
  }, [charge, isTerminal, onSuccess]);

  const handlePayWithCrypto = useCallback(async () => {
    setPhase("creating");
    setError(null);

    try {
      const result = await createChargeMutation.mutateAsync({
        name: productName,
        description,
        amount,
        currency,
        pricingType: "fixed_price",
        metadata,
      });

      setChargeId(result.id);
      setPhase("awaiting");

      // Open hosted checkout in new tab
      if (result.hostedUrl) {
        window.open(result.hostedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
      setPhase("failed");
    }
  }, [createChargeMutation, productName, description, amount, currency, metadata]);

  const handleCancel = useCallback(() => {
    setPhase("idle");
    setChargeId(undefined);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  const handleRetry = useCallback(() => {
    setPhase("idle");
    setChargeId(undefined);
    setError(null);
  }, []);

  return (
    <div className="rounded-xl border border-white/5 bg-[#1a1a1a] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-white">{productName}</span>
        </div>
        {charge && <StatusBadge status={charge.status} />}
      </div>

      {/* Amount display */}
      <div className="text-center py-2">
        <span className="text-xl font-semibold text-white tabular-nums">
          {amount} {currency}
        </span>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Phase: Idle */}
      {phase === "idle" && (
        <Button
          onClick={handlePayWithCrypto}
          className="w-full gap-2"
          disabled={createChargeMutation.isPending}
        >
          <ShoppingCart className="h-4 w-4" />
          Pay with Crypto
        </Button>
      )}

      {/* Phase: Creating */}
      {phase === "creating" && (
        <div className="flex flex-col items-center py-4 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <p className="text-xs text-muted-foreground">
            Creating payment request...
          </p>
        </div>
      )}

      {/* Phase: Awaiting Payment */}
      {phase === "awaiting" && charge && (
        <div className="space-y-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={charge.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Charge code</span>
              <span className="font-mono">{charge.code}</span>
            </div>
            {charge.payments.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Network</span>
                <span>{charge.payments[0]?.network}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (charge.hostedUrl) {
                  window.open(
                    charge.hostedUrl,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }
              }}
              className="flex-1 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Checkout
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            <span>Checking for payment...</span>
          </div>
        </div>
      )}

      {/* Phase: Awaiting (no charge data yet) */}
      {phase === "awaiting" && !charge && (
        <div className="flex flex-col items-center py-4 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <p className="text-xs text-muted-foreground">
            Waiting for payment confirmation...
          </p>
        </div>
      )}

      {/* Phase: Success */}
      {phase === "success" && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-white">Payment Confirmed</p>
            <p className="text-xs text-green-400">
              Your payment has been successfully processed.
            </p>
          </div>
          {charge?.payments?.[0]?.transactionHash && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                TX:{" "}
                <span className="font-mono">
                  {charge.payments[0].transactionHash.slice(0, 12)}...
                  {charge.payments[0].transactionHash.slice(-8)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Phase: Failed */}
      {phase === "failed" && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <XCircle className="h-10 w-10 text-red-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-white">Payment Failed</p>
            <p className="text-xs text-red-400">
              {error ?? "The payment could not be completed."}
            </p>
          </div>
          <Button variant="outline" onClick={handleRetry} className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* Phase: Expired */}
      {phase === "expired" && (
        <div className="flex flex-col items-center py-4 space-y-3">
          <Clock className="h-10 w-10 text-zinc-500" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-white">Payment Expired</p>
            <p className="text-xs text-zinc-400">
              The payment window has expired. Please try again.
            </p>
          </div>
          <Button variant="outline" onClick={handleRetry} className="gap-2">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
