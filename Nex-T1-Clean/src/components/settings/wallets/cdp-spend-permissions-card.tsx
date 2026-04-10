"use client";

import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/settings/shared/settings-button";
import { logger } from "@/lib/logger";
import { TrashIcon } from "@/components/sidebar-03/animated-icons";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BentoCard } from "@/components/settings/shared/bento-card";
const CDP_ENABLED = CDP_EMBEDDED_ENABLED;

type SpendPermissionItem = {
  permissionHash: string;
  spender: string;
  token: string;
  allowance: string;
  period: string;
  start: string;
  end: string;
  network: string;
  revoked: boolean;
  revokedAt: string | null;
  createdAt: string;
};

const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".toLowerCase();

function formatToken(address: string): string {
  if (address.toLowerCase() === NATIVE_ETH) return "ETH (native)";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatPeriod(seconds: string): string {
  const s = Number(seconds);
  if (s <= 0) return "—";
  const days = Math.floor(s / 86400);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""}`;
  const hours = Math.floor(s / 3600);
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

function formatDate(unixSeconds: string): string {
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CdpSpendPermissionsCard() {
  if (!CDP_ENABLED) return null;

  return <CdpSpendPermissionsInner />;
}

function CdpSpendPermissionsInner() {
  const queryClient = useQueryClient();
  const [revokingHash, setRevokingHash] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["cdp-spend-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/wallets/cdp/spend-permission");
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load permissions");
      }
      return json.data.permissions as SpendPermissionItem[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const activePermissions = (data ?? []).filter((p) => !p.revoked);
  const revokedPermissions = (data ?? []).filter((p) => p.revoked);

  const handleRevoke = async (permissionHash: string, network: string) => {
    setRevokingHash(permissionHash);
    try {
      const res = await fetch("/api/wallets/cdp/spend-permission", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissionHash, network }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Revoke failed");
      }
      toast.success("Spend permission revoked.");
      queryClient.invalidateQueries({ queryKey: ["cdp-spend-permissions"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to revoke";
      logger.error("cdp_spend_permission_revoke_ui_failed", message);
      toast.error(message);
    } finally {
      setRevokingHash(null);
    }
  };

  return (
    <BentoCard>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#00D5FF]" />
        <h3 className="settings-card-title">AI Agent Spend Permissions</h3>
      </div>

      <p className="settings-card-description">
        Active on-chain permissions that allow AI agents to spend tokens from your Nex Wallet (EVM) within set limits.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--bento-text-muted)]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading permissions...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {error instanceof Error ? error.message : "Failed to load permissions"}
        </div>
      )}

      {!isLoading && !error && activePermissions.length === 0 && (
        <div className="text-xs text-[var(--bento-text-muted)] py-2">
          No active spend permissions. AI agents can request permissions during chat.
        </div>
      )}

      {activePermissions.length > 0 && (
        <div className="settings-inline-list">
          {activePermissions.map((p) => (
            <div
              key={p.permissionHash}
              className="settings-inline-row space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--bento-text-primary)] font-medium">
                  Spender: <span className="mono-value">{p.spender.slice(0, 6)}...{p.spender.slice(-4)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleRevoke(p.permissionHash, p.network)}
                  disabled={revokingHash === p.permissionHash}
                >
                  {revokingHash === p.permissionHash ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <TrashIcon className="w-3 h-3" />
                  )}
                  <span className="ml-1 text-[10px]">Revoke</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[var(--bento-text-muted)]">
                <div>Token: <span className="text-[var(--bento-text-primary)]">{formatToken(p.token)}</span></div>
                <div>Allowance: <span className="text-[var(--bento-text-primary)]">{p.allowance}</span></div>
                <div>Period: <span className="text-[var(--bento-text-primary)]">{formatPeriod(p.period)}</span></div>
                <div>Network: <span className="text-[var(--bento-text-primary)]">{p.network}</span></div>
                <div>Start: <span className="text-[var(--bento-text-primary)]">{formatDate(p.start)}</span></div>
                <div>End: <span className="text-[var(--bento-text-primary)]">{formatDate(p.end)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {revokedPermissions.length > 0 && (
        <details className="settings-inline-section text-xs">
          <summary className="text-[var(--bento-text-muted)] cursor-pointer hover:text-[var(--bento-text-muted)] transition-colors">
            {revokedPermissions.length} revoked permission{revokedPermissions.length > 1 ? "s" : ""}
          </summary>
          <div className="settings-inline-list mt-2">
            {revokedPermissions.map((p) => (
              <div
                key={p.permissionHash}
                className="settings-inline-row text-[var(--bento-text-muted)]"
              >
                <span className="mono-value">{p.spender.slice(0, 6)}...{p.spender.slice(-4)}</span>
                {" "}— {formatToken(p.token)} — revoked {p.revokedAt ? new Date(p.revokedAt).toLocaleDateString() : ""}
              </div>
            ))}
          </div>
        </details>
      )}
    </BentoCard>
  );
}
