"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { SafeActivationModal } from "@/components/wallets/safe/safe-activation-modal";
import { coerceActivationPayloads, type SafeActivationTx } from "@/lib/wallets/safe-activation";

import {
  authenticateWalletPasskey,
  listWalletPasskeys,
  registerWalletPasskey,
  revokeWalletPasskey,
  type WalletPasskeyListItem,
} from "@/lib/passkeys/client";

function truncate(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

export function WalletPasskeysCard() {
  const [items, setItems] = useState<WalletPasskeyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [activationPayloads, setActivationPayloads] = useState<SafeActivationTx[]>([]);
  const [activationAfter, setActivationAfter] = useState<(() => Promise<void>) | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const next = await listWalletPasskeys();
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load passkeys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = useMemo(() => items.filter((i) => !i.revoked_at), [items]);

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

  const handleEnableApprovals = useCallback(async () => {
    setBusyId("__enable");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/wallets/safe/passkeys/enable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const activationList = coerceActivationPayloads((json)?.activation);
        if ((json)?.error === "safe_activation_required" && activationList.length) {
          setNotice("Activate your Safe to enable passkey approvals.");
          openActivationModal(activationList, handleEnableApprovals);
          return;
        }
        throw new Error(String((json)?.error ?? "enable_failed"));
      }
      const created = Array.isArray((json)?.created) ? (json).created.length : 0;
      const skipped = Array.isArray((json)?.skipped) ? (json).skipped.length : 0;
      setNotice(`Created ${created} approval request(s). Skipped ${skipped}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enable failed");
    } finally {
      setBusyId(null);
    }
  }, [openActivationModal]);

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader>
        <CardTitle className="text-base">Wallet passkeys</CardTitle>
        <CardDescription>
          Passkeys used to authorize wallet actions (approvals / step-up). This is separate from login passkeys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {notice ? <div className="text-sm text-muted-foreground">{notice}</div> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={loading || busyId !== null}
            onClick={async () => {
              setBusyId("__register");
              setError(null);
              setNotice(null);
              try {
                await registerWalletPasskey();
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Registration failed");
              } finally {
                setBusyId(null);
              }
            }}
          >
            {busyId === "__register" ? "Registering…" : "Register passkey"}
          </Button>

          <Button
            variant="outline"
            disabled={loading || busyId !== null || active.length === 0}
            onClick={async () => {
              setBusyId("__auth");
              setError(null);
              setNotice(null);
              try {
                await authenticateWalletPasskey();
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Authentication failed");
              } finally {
                setBusyId(null);
              }
            }}
          >
            {busyId === "__auth" ? "Verifying…" : "Verify with passkey"}
          </Button>

          <Button
            variant="outline"
            disabled={loading || busyId !== null || active.length === 0}
            onClick={handleEnableApprovals}
          >
            {busyId === "__enable" ? "Creating approvals…" : "Enable Safe approvals"}
          </Button>

          <Button variant="ghost" disabled={loading || busyId !== null} onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>

        <div className="rounded-md border border-border/60">
          <div className="grid grid-cols-12 gap-2 border-b border-border/60 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <div className="col-span-4">Credential</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-3">Last used</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>
          ) : items.length ? (
            items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm">
                <div className="col-span-4 font-mono text-xs">{truncate(row.credential_id)}</div>
                <div className="col-span-3 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {row.last_used_at ? new Date(row.last_used_at).toLocaleString() : "—"}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {row.revoked_at ? <Badge variant="secondary">revoked</Badge> : <Badge variant="outline">active</Badge>}
                  {!row.revoked_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={async () => {
                        setBusyId(row.id);
                        setError(null);
                        try {
                          await revokeWalletPasskey(row.id);
                          await refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Revoke failed");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">No passkeys registered.</div>
          )}
        </div>
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
