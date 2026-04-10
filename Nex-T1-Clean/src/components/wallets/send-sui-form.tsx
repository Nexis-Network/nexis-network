"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuiWalletSupport } from "@/modules/wallets/sui/use-sui-wallet-support";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import { cn, truncateAddress } from "@/lib/utils";

const MIST_PER_SUI = 1_000_000_000n;
const SUI_ADDRESS_REGEX = /^0x[0-9a-fA-F]{2,}$/;

type SendSuiFormProps = {
  initialFrom?: string | null;
};

function parseAmountToMist(value: string): bigint | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d*(?:\.\d{0,9})?$/.test(normalized)) {
    return null;
  }
  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const paddedFraction = `${fractionalPart}000000000`.slice(0, 9);
  try {
    const whole = wholePart ? BigInt(wholePart) : 0n;
    const fraction = paddedFraction ? BigInt(paddedFraction) : 0n;
    return whole * MIST_PER_SUI + fraction;
  } catch {
    return null;
  }
}

export function SendSuiForm({ initialFrom }: SendSuiFormProps) {
  const router = useRouter();
  const { currentAccount } = useSuiWalletSupport();
  const connectedAddress = currentAccount?.address ?? null;
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const activeFromAddress = connectedAddress ?? initialFrom ?? "";

  const { data: balanceData, isPending: balanceLoading } = useSuiClientQuery(
    "getBalance",
    { owner: connectedAddress ?? "" },
    {
      enabled: Boolean(connectedAddress),
    },
  );

  const availableBalanceDisplay = useMemo(() => {
    if (!balanceData?.totalBalance) {
      return balanceLoading ? "Loading…" : "Unknown";
    }
    const raw = Number(balanceData.totalBalance) / Number(MIST_PER_SUI);
    return `${formatNativeBalance(raw, 4)} SUI`;
  }, [balanceData?.totalBalance, balanceLoading]);

  const availableBalanceMist = useMemo(() => {
    try {
      return balanceData?.totalBalance ? BigInt(balanceData.totalBalance) : null;
    } catch {
      return null;
    }
  }, [balanceData?.totalBalance]);

  const { mutateAsync: signAndExecuteTransaction, isPending: sending } = useSignAndExecuteTransaction();

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!connectedAddress) {
        toast.error("Connect your Sui wallet to continue");
        return;
      }

      const normalizedRecipient = recipient.trim();
      if (!SUI_ADDRESS_REGEX.test(normalizedRecipient)) {
        setFormError("Enter a valid Sui address (0x…)");
        return;
      }

      const amountInMist = parseAmountToMist(amount);
      if (amountInMist == null || amountInMist <= 0n) {
        setFormError("Enter a positive amount (up to 9 decimal places)");
        return;
      }

      if (availableBalanceMist != null && amountInMist > availableBalanceMist) {
        setFormError("Amount exceeds available balance");
        return;
      }

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
      tx.transferObjects([coin], tx.pure.address(normalizedRecipient));

      try {
        const result = await signAndExecuteTransaction({ transaction: tx });
        toast.success("SUI transfer submitted", {
          description: result?.digest ? `Digest: ${result.digest}` : undefined,
        });
        setAmount("");
        setRecipient("");
        router.refresh();
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unknown error";
        toast.error("Failed to send SUI", { description });
      }
    },
    [amount, availableBalanceMist, connectedAddress, recipient, router, signAndExecuteTransaction],
  );

  const addressMismatch = Boolean(initialFrom && connectedAddress && initialFrom.toLowerCase() !== connectedAddress.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send SUI</CardTitle>
        <CardDescription>Transfer SUI to another address from your connected wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" value={activeFromAddress} readOnly placeholder="Connect your Sui wallet" />
            <p className="text-xs text-muted-foreground">
              Connected wallet: {connectedAddress ? truncateAddress(connectedAddress, 6, 6) : "Not connected"}
            </p>
            {addressMismatch ? (
              <p className="text-xs text-amber-500">
                The connected wallet differs from the requested address. Switch accounts to send from {truncateAddress(initialFrom ?? "", 6, 6)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient address</Label>
            <Input
              id="recipient"
              placeholder="0xRecipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (SUI)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Available: {availableBalanceDisplay}</p>
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <div className="flex items-center justify-end">
            <Button type="submit" disabled={sending || !connectedAddress} className={cn(sending && "opacity-80") }>
              {sending ? "Sending…" : "Send SUI"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
