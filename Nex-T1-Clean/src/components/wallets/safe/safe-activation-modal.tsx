"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useWalletClient } from "wagmi";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConnectWalletModal } from "@/components/wallets/connect-wallet-modal";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { truncateAddress } from "@/lib/utils";
import {
  coerceActivationPayloads,
  confirmSafeActivation,
  parseActivationValue,
  requestSafeActivation,
  type SafeActivationTx,
} from "@/lib/wallets/safe-activation";

type SafeActivationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activation?: SafeActivationTx | SafeActivationTx[] | null;
  target?: { chainId: number; safeAddress: `0x${string}` } | null;
  title?: string;
  description?: string;
  onActivated?: (safeAddress: `0x${string}`) => Promise<void> | void;
};

type ActivationStatus = "idle" | "loading" | "ready" | "sending" | "confirming" | "pending" | "success" | "error";

function resolveChainLabel(chainId: number) {
  if (chainId === 1) return "Ethereum";
  if (chainId === 10) return "Optimism";
  if (chainId === 56) return "BNB Chain";
  if (chainId === 137) return "Polygon";
  if (chainId === 42161) return "Arbitrum";
  if (chainId === 42220) return "Celo";
  if (chainId === 8453) return "Base";
  if (chainId === 130) return "Unichain";
  if (chainId === 43114) return "Avalanche";
  return `Chain ${chainId}`;
}

export function SafeActivationModal({
  open,
  onOpenChange,
  activation,
  target,
  title = "Activate Safe",
  description = "Activate your Safe on-chain. You will pay the network fee from your connected wallet.",
  onActivated,
}: SafeActivationModalProps) {
  const [payloads, setPayloads] = useState<SafeActivationTx[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const { isEvmConnected, address, chainId, switchChain } = useConnectEoaWallet();
  const { data: walletClient } = useWalletClient();

  const activationList = useMemo(() => coerceActivationPayloads(activation), [activation]);
  const activationItem = payloads[selectedIndex];
  const isWalletReady = Boolean(isEvmConnected && walletClient && address);

  const resetState = useCallback(() => {
    setPayloads([]);
    setSelectedIndex(0);
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const finalizeActivation = useCallback(
    async (safeAddress: `0x${string}`) => {
      setStatus("success");
      try {
        await onActivated?.(safeAddress);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Activation completed, but follow-up action failed.");
      }
    },
    [onActivated, onOpenChange],
  );

  const loadActivation = useCallback(async () => {
    if (!target) return;
    const { chainId: targetChainId, safeAddress } = target;
    if (!Number.isFinite(targetChainId) || targetChainId <= 0) {
      setStatus("error");
      setError("Invalid chain selection for Safe activation.");
      return;
    }
    if (!isNonZeroEVMAddress(safeAddress)) {
      setStatus("error");
      setError("Safe address is invalid or missing.");
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const response = await requestSafeActivation({
        chainId: targetChainId,
        safeAddress,
      });
      if (response.status === "ready") {
        await finalizeActivation(response.safeAddress);
        return;
      }
      setPayloads([response.activation]);
      setSelectedIndex(0);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load Safe activation details.");
    }
  }, [target, finalizeActivation]);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (activationList.length) {
      setPayloads(activationList);
      setSelectedIndex(0);
      setStatus("ready");
      setError(null);
      return;
    }

    if (target) {
      void loadActivation();
      return;
    }

    setStatus("error");
    setError("Activation details are unavailable.");
  }, [open, activationList, target, loadActivation, resetState]);

  const handleActivate = useCallback(async () => {
    if (!activationItem) return;
    if (!walletClient || !address || !isEvmConnected) {
      setConnectOpen(true);
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      if (chainId !== activationItem.chainId) {
        await switchChain(activationItem.chainId);
      }

      const submitted = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: activationItem.to,
        data: activationItem.data,
        value: parseActivationValue(activationItem.value),
      });

      setTxHash(submitted);
      setStatus("confirming");

      const confirm = await confirmSafeActivation({
        chainId: activationItem.chainId,
        safeAddress: activationItem.safeAddress,
        txHash: submitted,
      });

      if (confirm.ok) {
        await finalizeActivation(confirm.safeAddress);
        return;
      }

      setStatus("pending");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Activation transaction failed.");
    }
  }, [activationItem, walletClient, address, isEvmConnected, chainId, switchChain, finalizeActivation]);

  const handleConfirm = useCallback(async () => {
    if (!activationItem) return;
    setStatus("confirming");
    setError(null);
    try {
      const confirm = await confirmSafeActivation({
        chainId: activationItem.chainId,
        safeAddress: activationItem.safeAddress,
        txHash: txHash ?? undefined,
      });
      if (confirm.ok) {
        await finalizeActivation(confirm.safeAddress);
        return;
      }
      setStatus("pending");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to confirm activation status.");
    }
  }, [activationItem, txHash, finalizeActivation]);

  const valueDisplay = useMemo(() => {
    if (!activationItem) return null;
    const value = parseActivationValue(activationItem.value);
    const formatted = value > 0n ? formatUnits(value, 18) : "0";
    return `${formatted} native`;
  }, [activationItem]);

  const handleDialogChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resetState();
      }
      onOpenChange(next);
    },
    [onOpenChange, resetState],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching activation details…
            </div>
          ) : null}

          {status !== "loading" && activationItem ? (
            <div className="space-y-3">
              {payloads.length > 1 ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Select Safe</span>
                  <Select
                    value={String(selectedIndex)}
                    onValueChange={(value) => setSelectedIndex(Number(value))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose Safe" />
                    </SelectTrigger>
                    <SelectContent>
                      {payloads.map((item, index) => (
                        <SelectItem key={`${item.chainId}-${item.safeAddress}`} value={String(index)}>
                          {resolveChainLabel(item.chainId)} • {truncateAddress(item.safeAddress, 6, 4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Chain</span>
                  <Badge variant="outline">{resolveChainLabel(activationItem.chainId)}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Safe</span>
                  <span className="font-mono">{truncateAddress(activationItem.safeAddress, 8, 6)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-mono">{truncateAddress(activationItem.to, 8, 6)}</span>
                </div>
                {valueDisplay ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-mono">{valueDisplay}</span>
                  </div>
                ) : null}
              </div>

              {!isWalletReady ? (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Connect an EVM wallet to pay gas and activate your Safe.
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Connected wallet: {truncateAddress(address ?? "", 6, 4)} • Chain{" "}
                  {chainId ? resolveChainLabel(chainId) : "unknown"}
                </div>
              )}
            </div>
          ) : null}

          {status === "pending" ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
              Activation transaction submitted. It can take a moment to confirm. Check again once the transaction is mined.
            </div>
          ) : null}

          {status === "success" ? (
            <div className="rounded-md border border-emerald-500/30 bg-[#8eb94f]/10 p-3 text-xs text-emerald-600">
              Safe activation confirmed.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            {status === "ready" && !isWalletReady ? (
              <Button type="button" variant="outline" onClick={() => setConnectOpen(true)}>
                Connect wallet
              </Button>
            ) : null}

            {status === "ready" && isWalletReady ? (
              <Button type="button" onClick={handleActivate}>
                Activate Safe
              </Button>
            ) : null}

            {status === "sending" || status === "confirming" ? (
              <Button type="button" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "sending" ? "Submitting…" : "Confirming…"}
              </Button>
            ) : null}

            {status === "pending" ? (
              <Button type="button" variant="outline" onClick={handleConfirm}>
                Check again
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  );
}
