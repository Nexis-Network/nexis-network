"use client";

import { ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TrashIcon } from "@/components/sidebar-03/animated-icons";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/settings/shared/bento-card";

/* ------------------------------------------------------------------ */
/*  Geoblock check hook                                                */
/* ------------------------------------------------------------------ */

type GeoblockStatus = { blocked: boolean; country: string; region: string };

function useGeoblockCheck() {
  return useQuery<GeoblockStatus>({
    queryKey: ["polymarket-geoblock"],
    queryFn: async () => {
      const res = await fetch("/api/polymarket/geoblock", { credentials: "include" });
      if (!res.ok) return { blocked: true, country: "unknown", region: "unknown" };
      return res.json() as Promise<GeoblockStatus>;
    },
    staleTime: 300_000,
    retry: false,
  });
}

/* ------------------------------------------------------------------ */
/*  Credentials API                                                    */
/* ------------------------------------------------------------------ */

type SaveCredsPayload = {
  polyAddress: string;
  apiKey: string;
  secret: string;
  passphrase: string;
};

async function saveCredentials(payload: SaveCredsPayload): Promise<void> {
  const res = await fetch("/api/polymarket/creds", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Failed to save" }));
    throw new Error((body as { error?: string }).error ?? "Failed to save credentials");
  }
}

async function deleteCredentials(): Promise<void> {
  const res = await fetch("/api/polymarket/creds", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to remove credentials");
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PolymarketSettingsClient() {
  const queryClient = useQueryClient();
  const geoblock = useGeoblockCheck();

  const [polyAddress, setPolyAddress] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const saveMutation = useMutation({
    mutationFn: saveCredentials,
    onSuccess: () => {
      toast.success("Polymarket credentials saved");
      setPolyAddress("");
      setApiKey("");
      setSecret("");
      setPassphrase("");
      queryClient.invalidateQueries({ queryKey: ["polymarket-creds"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCredentials,
    onSuccess: () => {
      toast.success("Polymarket credentials removed");
      queryClient.invalidateQueries({ queryKey: ["polymarket-creds"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = useCallback(() => {
    if (!polyAddress || !apiKey || !secret || !passphrase) {
      toast.error("All fields are required");
      return;
    }
    saveMutation.mutate({ polyAddress, apiKey, secret, passphrase });
  }, [polyAddress, apiKey, secret, passphrase, saveMutation]);

  const canSave = polyAddress.trim() && apiKey.trim() && secret.trim() && passphrase.trim();

  return (
    <div className="space-y-4">
      {/* Geoblock Status */}
      <BentoCard>
        <div className="flex items-center gap-3">
          {geoblock.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--bento-text-muted)]" />
          ) : geoblock.data?.blocked ? (
            <ShieldAlert className="h-5 w-5 text-red-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
          <div>
            <p className="text-sm font-medium text-[var(--bento-text-primary)]">Trading Eligibility</p>
            <p className="text-xs text-[var(--bento-text-muted)]">
              {geoblock.isLoading
                ? "Checking..."
                : geoblock.data?.blocked
                  ? `Trading is restricted in your region (${geoblock.data.country}).`
                  : `Eligible for trading (${geoblock.data?.country ?? "—"}).`}
            </p>
          </div>
          {!geoblock.isLoading && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {geoblock.data?.blocked ? "Blocked" : "Active"}
            </Badge>
          )}
        </div>
      </BentoCard>

      {/* Credentials Form */}
      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">L2 API Credentials</h3>
            <p className="text-xs text-[var(--bento-text-muted)]">
              Enter your Polymarket CLOB API credentials. These are encrypted and stored server-side.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="poly-address" className="text-xs">Polymarket Address</Label>
              <Input
                id="poly-address"
                placeholder="0x..."
                value={polyAddress}
                onChange={(e) => setPolyAddress(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poly-api-key" className="text-xs">API Key</Label>
              <Input
                id="poly-api-key"
                type="password"
                placeholder="API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poly-secret" className="text-xs">Secret</Label>
              <Input
                id="poly-secret"
                type="password"
                placeholder="HMAC secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poly-passphrase" className="text-xs">Passphrase</Label>
              <Input
                id="poly-passphrase"
                type="password"
                placeholder="Passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
              ) : (
                "Save Credentials"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <TrashIcon className="mr-1.5 h-3.5 w-3.5" />
              )}
              Remove Credentials
            </Button>
          </div>
        </div>
      </BentoCard>
    </div>
  );
}
