"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentWallet = {
  id: string;
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
};

type FundingMode = "deposit" | "withdrawal";

type AgentFundingFlowProps = {
  agentId: string;
  wallets: AgentWallet[];
  onSuccess?: () => void;
  className?: string;
};

type FundingPayload = {
  walletId: string;
  mode: FundingMode;
  amount: string;
  chain: string;
};

type FundingResult = {
  txHash: string | null;
  status: "submitted" | "confirmed" | "failed";
  message: string;
};

/* ------------------------------------------------------------------ */
/*  Chain options                                                       */
/* ------------------------------------------------------------------ */

type ChainOption = {
  id: string;
  label: string;
};

const CHAIN_OPTIONS: ChainOption[] = [
  { id: "eip155:1", label: "Ethereum" },
  { id: "eip155:8453", label: "Base" },
  { id: "eip155:10", label: "Optimism" },
  { id: "eip155:42161", label: "Arbitrum" },
  { id: "solana:101", label: "Solana" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function walletDisplayName(wallet: AgentWallet): string {
  if (wallet.label) return wallet.label;
  return `${wallet.platform} - ${truncateAddress(wallet.address)}`;
}

/* ------------------------------------------------------------------ */
/*  API call                                                           */
/* ------------------------------------------------------------------ */

async function submitFunding(
  agentId: string,
  payload: FundingPayload,
): Promise<FundingResult> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`/api/agents/${agentId}/wallet/fund`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || "Funding request failed");
  }

  const raw = (await response.json()) as Record<string, UntypedJson>;
  const data = (raw.data ?? raw) as Record<string, UntypedJson>;

  return {
    txHash: typeof data.txHash === "string" ? data.txHash : null,
    status:
      (["submitted", "confirmed", "failed"] as const).includes(
        data.status as "submitted",
      )
        ? (data.status as FundingResult["status"])
        : "submitted",
    message: typeof data.message === "string" ? data.message : "Funding event created",
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentFundingFlow({
  agentId,
  wallets,
  onSuccess,
  className,
}: AgentFundingFlowProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FundingMode>("deposit");
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState(CHAIN_OPTIONS[0]?.id ?? "eip155:1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FundingResult | null>(null);

  const activeWallets = useMemo(
    () => wallets.filter((w) => w.status === "active"),
    [wallets],
  );

  const resetForm = useCallback(() => {
    setSelectedWallet("");
    setAmount("");
    setChain(CHAIN_OPTIONS[0]?.id ?? "eip155:1");
    setError(null);
    setResult(null);
    setSubmitting(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        resetForm();
      }
    },
    [resetForm],
  );

  const handleSubmit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!selectedWallet) {
      setError("Please select a wallet.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setSubmitting(true);

    try {
      const fundingResult = await submitFunding(agentId, {
        walletId: selectedWallet,
        mode,
        amount: String(parsedAmount),
        chain,
      });

      setResult(fundingResult);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  }, [agentId, selectedWallet, amount, chain, mode, onSuccess]);

  const isValid =
    selectedWallet.length > 0 &&
    Number.isFinite(parseFloat(amount)) &&
    parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          Fund Agent
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "deposit" ? "Deposit to Agent" : "Withdraw from Agent"}
          </DialogTitle>
          <DialogDescription>
            {mode === "deposit"
              ? "Send funds to one of the agent's managed wallets."
              : "Withdraw funds from an agent wallet back to your account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "deposit" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("deposit")}
            >
              <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
              Deposit
            </Button>
            <Button
              variant={mode === "withdrawal" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("withdrawal")}
            >
              <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" />
              Withdraw
            </Button>
          </div>

          {/* Wallet select */}
          <div className="space-y-1.5">
            <label
              htmlFor="funding-wallet"
              className="text-xs font-medium text-muted-foreground"
            >
              Wallet
            </label>
            <Select
              value={selectedWallet}
              onValueChange={setSelectedWallet}
            >
              <SelectTrigger id="funding-wallet" className="w-full">
                <SelectValue placeholder="Select a wallet" />
              </SelectTrigger>
              <SelectContent>
                {activeWallets.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No active wallets
                  </SelectItem>
                ) : (
                  activeWallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {walletDisplayName(w)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Chain select */}
          <div className="space-y-1.5">
            <label
              htmlFor="funding-chain"
              className="text-xs font-medium text-muted-foreground"
            >
              Network
            </label>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger id="funding-chain" className="w-full">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {CHAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label
              htmlFor="funding-amount"
              className="text-xs font-medium text-muted-foreground"
            >
              Amount (USD)
            </label>
            <Input
              id="funding-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/40 font-mono"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Success */}
          {result && (
            <div
              className={cn(
                "rounded-md border p-3 text-xs",
                result.status === "failed"
                  ? "border-destructive/50 text-destructive"
                  : "border-emerald-500/50 text-emerald-300",
              )}
            >
              <p className="font-medium">{result.message}</p>
              {result.txHash && (
                <p className="mt-1 font-mono text-muted-foreground">
                  TX: {result.txHash}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : mode === "deposit" ? (
              "Deposit"
            ) : (
              "Withdraw"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
