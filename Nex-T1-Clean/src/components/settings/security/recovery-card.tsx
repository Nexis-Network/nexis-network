"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWalletSummaries } from "@/lib/hooks/wallets/profile/use-wallet-summaries";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { SafeActivationModal } from "@/components/wallets/safe/safe-activation-modal";
import { coerceActivationPayloads, type SafeActivationTx } from "@/lib/wallets/safe-activation";

type RecoveryConfigPayload = {
  ok?: boolean;
  chainId?: number;
  moduleAddress?: string | null;
  safe?: { safeAddress: string; status: string } | null;
  config?: { enabled?: boolean; guardians?: string[]; threshold?: number; updated_at?: string } | null;
  onchain?: { enabled?: boolean; guardians?: string[]; request?: UntypedJson } | null;
  activeRequest?: { id: string; status: string; execute_after?: string; new_owners?: string[] } | null;
};

type SafeOption = {
  chainId: number;
  safeAddress: string;
  status: string | null;
};

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

function parseGuardianInput(value: string): string[] {
  return value
    .split(/[\n,\s]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function RecoveryCard() {
  const queryClient = useQueryClient();
  const walletSummaries = useWalletSummaries();

  const safeOptions = useMemo<SafeOption[]>(() => {
    const wallets = walletSummaries.data?.wallets ?? [];
    return wallets
      .map((wallet) => {
        const meta = (wallet.metadata ?? {}) as Record<string, UntypedJson>;
        const chainId = typeof meta.chainId === "number" ? meta.chainId : null;
        const status = typeof meta.status === "string" ? String(meta.status) : null;
        const providerMeta = typeof meta.provider === "string" ? meta.provider.toLowerCase() : "";
        const providerName = typeof wallet.provider === "string" ? wallet.provider.toLowerCase() : "";
        const isSafe = providerMeta === "safe" || providerName.includes("safe") || wallet.type === "agent_generated";
        if (!isSafe || !chainId || !wallet.address || !isNonZeroEVMAddress(wallet.address)) return null;
        return { chainId, safeAddress: wallet.address, status };
      })
      .filter((entry): entry is SafeOption => entry !== null);
  }, [walletSummaries.data?.wallets]);

  const [selectedChainId, setSelectedChainId] = useState<number | null>(safeOptions[0]?.chainId ?? null);
  const [open, setOpen] = useState(false);
  const [guardiansInput, setGuardiansInput] = useState("");
  const [threshold, setThreshold] = useState("1");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [activationOpen, setActivationOpen] = useState(false);
  const [activationPayloads, setActivationPayloads] = useState<SafeActivationTx[]>([]);
  const [activationAfter, setActivationAfter] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!safeOptions.length) {
      setSelectedChainId(null);
      return;
    }
    if (!selectedChainId || !safeOptions.some((option) => option.chainId === selectedChainId)) {
      setSelectedChainId(safeOptions[0]?.chainId ?? null);
    }
  }, [safeOptions, selectedChainId]);

  const selectedSafe = useMemo(
    () => safeOptions.find((option) => option.chainId === selectedChainId) ?? null,
    [safeOptions, selectedChainId],
  );

  const recoveryQuery = useQuery<RecoveryConfigPayload>({
    queryKey: ["safe-recovery-config", selectedChainId],
    enabled: Boolean(selectedChainId),
    queryFn: async () => {
      if (!selectedChainId) return {};
      const res = await fetch(`/api/wallets/safe/recovery/config?chainId=${selectedChainId}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const jsonRecord = json as Record<string, UntypedJson>;
        const message =
          (typeof jsonRecord.error === "string" ? jsonRecord.error : null) ??
          (typeof jsonRecord.message === "string" ? jsonRecord.message : null) ??
          "Failed to load recovery configuration.";
        throw new Error(message);
      }
      return json as RecoveryConfigPayload;
    },
  });

  useEffect(() => {
    if (hydrated) return;
    const config = recoveryQuery.data?.config;
    if (config?.guardians && Array.isArray(config.guardians)) {
      setGuardiansInput(config.guardians.join("\n"));
    }
    if (typeof config?.threshold === "number") {
      setThreshold(String(config.threshold));
    }
    if (config) {
      setHydrated(true);
    }
  }, [hydrated, recoveryQuery.data?.config]);

  const statusLabel = useMemo(() => {
    if (!selectedSafe) return "No Safe wallet";
    if (selectedSafe.status && selectedSafe.status !== "ready") return "Pending activation";
    const enabled = Boolean(recoveryQuery.data?.onchain?.enabled || recoveryQuery.data?.config?.enabled);
    return enabled ? "Configured (Deprecated)" : "Not configured";
  }, [selectedSafe, recoveryQuery.data?.onchain?.enabled, recoveryQuery.data?.config?.enabled]);

  const openActivationModal = useCallback((payloads: SafeActivationTx[], after: () => Promise<void>) => {
    setActivationPayloads(payloads);
    setActivationAfter(() => after);
    setActivationOpen(true);
  }, []);

  const handleActivationOpenChange = useCallback((next: boolean) => {
    setActivationOpen(next);
    if (!next) {
      setActivationPayloads([]);
      setActivationAfter(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedChainId) {
      setFormError("Select a Safe chain to configure recovery.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setFormNotice(null);

    try {
      const guardians = parseGuardianInput(guardiansInput);
      const invalid = guardians.filter((address) => !isNonZeroEVMAddress(address));
      if (!guardians.length) {
        throw new Error("Add at least one guardian address.");
      }
      if (invalid.length) {
        throw new Error(`Invalid guardian address: ${invalid[0]}`);
      }
      const deduped = guardians.filter(
        (address, index) => guardians.findIndex((entry) => entry.toLowerCase() === address.toLowerCase()) === index,
      );
      const thresholdValue = Number.parseInt(threshold, 10);
      if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
        throw new Error("Threshold must be a positive number.");
      }
      if (thresholdValue > deduped.length) {
        throw new Error("Threshold cannot exceed guardian count.");
      }

      const res = await fetch("/api/wallets/safe/recovery/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: selectedChainId,
          guardians: deduped,
          threshold: thresholdValue,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const jsonRecord = json as Record<string, UntypedJson>;
        const activationList = coerceActivationPayloads(jsonRecord.activation);
        if (jsonRecord.error === "safe_activation_required" && activationList.length) {
          setFormNotice("Activate your Safe to configure recovery.");
          openActivationModal(activationList, handleSave);
          return;
        }
        const message =
          (typeof jsonRecord.error === "string" ? jsonRecord.error : null) ??
          (typeof jsonRecord.message === "string" ? jsonRecord.message : null) ??
          "Recovery configuration failed.";
        throw new Error(message);
      }

      setFormNotice("Recovery configuration proposed. Approvals required.");
      setOpen(false);
      setHydrated(false);
      await recoveryQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update recovery configuration.");
    } finally {
      setSaving(false);
    }
  }, [selectedChainId, guardiansInput, threshold, openActivationModal, recoveryQuery, queryClient]);

  const guardiansCount = parseGuardianInput(guardiansInput).length;
  const isPendingSafe = selectedSafe?.status && selectedSafe.status !== "ready";
  const executeAfterTimestamp = (recoveryQuery.data?.onchain?.request)?.executeAfter;

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader>
        <CardTitle className="text-base">Social Recovery</CardTitle>
        <CardDescription>
          Designate trusted guardians to recover your Safe if you lose access. Changes require Safe approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Recovery Module</div>
            <div className="text-xs text-muted-foreground">
              {selectedChainId ? `Chain: ${resolveChainLabel(selectedChainId)} · ` : ""}
              Status: {statusLabel}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {isPendingSafe ? "pending" : statusLabel.toLowerCase()}
          </Badge>
        </div>

        {recoveryQuery.error ? (
          <div className="text-xs text-destructive">
            {(recoveryQuery.error as Error).message ?? "Failed to load recovery configuration."}
          </div>
        ) : null}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!selectedChainId}>
              Configure guardians
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Recovery</DialogTitle>
              <DialogDescription>
                Add guardian addresses and set the approval threshold. This creates a Safe approval request.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {safeOptions.length > 1 ? (
                <div className="grid gap-2">
                  <Label>Safe chain</Label>
                  <Select
                    value={selectedChainId ? String(selectedChainId) : ""}
                    onValueChange={(value) => setSelectedChainId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeOptions.map((option) => (
                        <SelectItem key={option.chainId} value={String(option.chainId)}>
                          {resolveChainLabel(option.chainId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="guardians">Guardian addresses</Label>
                <Textarea
                  id="guardians"
                  value={guardiansInput}
                  onChange={(event) => setGuardiansInput(event.target.value)}
                  placeholder="0xabc...\n0xdef..."
                  rows={4}
                />
                <div className="text-xs text-muted-foreground">
                  {guardiansCount} guardian{guardiansCount === 1 ? "" : "s"} detected.
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="threshold">Approval threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                />
              </div>
            </div>

            {formError ? <div className="text-sm text-destructive">{formError}</div> : null}
            {formNotice ? <div className="text-sm text-muted-foreground">{formNotice}</div> : null}

            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Submitting..." : "Submit recovery update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------------ */}
        {/* DEPRECATED: Safe recovery operations are no longer available.        */}
        {/* CDP V2 embedded wallets replace Safe Core. Historical records are    */}
        {/* preserved in wallet_recovery_requests for audit purposes.            */}
        {/* ------------------------------------------------------------------ */}
        {recoveryQuery.data?.onchain?.enabled && (
          <div className="border-t border-border/60 pt-4 mt-4 space-y-2">
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-sm font-medium text-amber-600">Feature Deprecated</div>
              <p className="text-xs text-muted-foreground mt-1">
                Safe Core recovery is no longer available. Smart wallet functionality is migrating to Nex Wallets.
                Existing recovery configurations are preserved for audit purposes but
                new recovery operations cannot be initiated or finalized.
              </p>
            </div>

            {/* Active Request Display (read-only, no action buttons) */}
            {(recoveryQuery.data?.activeRequest || (recoveryQuery.data?.onchain?.request)) && (
              <div className="rounded border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="text-sm font-semibold text-yellow-500">Historical recovery request</div>
                <div className="text-xs text-muted-foreground mt-1">
                  New Owners: {(recoveryQuery.data?.activeRequest?.new_owners ?? (recoveryQuery.data?.onchain?.request)?.newOwners)?.join(", ")}<br/>
                  Execute After: {
                    recoveryQuery.data?.activeRequest?.execute_after
                    ? new Date(recoveryQuery.data.activeRequest.execute_after).toLocaleString()
                    : (executeAfterTimestamp ? new Date(Number(executeAfterTimestamp) * 1000).toLocaleString() : "Unknown")
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <SafeActivationModal
        open={activationOpen}
        onOpenChange={handleActivationOpenChange}
        activation={activationPayloads}
        onActivated={async () => {
          if (activationAfter) {
            await activationAfter();
          }
        }}
      />
    </Card>
  );
}
