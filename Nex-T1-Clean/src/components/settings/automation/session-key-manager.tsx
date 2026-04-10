"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldX } from "lucide-react";

import {
  AUTONOMOUS_ACTION_KEYS,
  AUTONOMOUS_ACTION_LABELS,
} from "@/modules/chat/automation-preferences";
import type { AutomationSessionKey } from "@/modules/automation/types";
import {
  useCreateSessionKey,
  useRevokeSessionKey,
  useSessionKeys,
} from "@/modules/automation/hooks";
import { useToast } from "@/hooks/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

type SessionKeyFormState = {
  agentIdentifier: string;
  chainSlug: string;
  walletAddress: string;
  sessionKeyPublic: string;
  expiresAt: string;
  scopes: Record<string, boolean>;
};

const INITIAL_FORM_STATE: SessionKeyFormState = {
  agentIdentifier: "",
  chainSlug: "",
  walletAddress: "",
  sessionKeyPublic: "",
  expiresAt: "",
  scopes: AUTONOMOUS_ACTION_KEYS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = false;
    return acc;
  }, {}),
};

export function SessionKeyManager() {
  const { data, isLoading, error, refetch, isRefetching } = useSessionKeys();
  const { toast } = useToast();
  const createMutation = useCreateSessionKey();
  const revokeMutation = useRevokeSessionKey();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] =
    useState<SessionKeyFormState>(INITIAL_FORM_STATE);
  const [revocationReason, setRevocationReason] = useState<
    Record<string, string>
  >({});

  const activeKeys = useMemo(
    () => (data ?? []).filter((entry) => !entry.revokedAt),
    [data],
  );

  const handleFormChange = <K extends keyof SessionKeyFormState>(
    key: K,
    value: SessionKeyFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleScope = (scope: string, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      scopes: {
        ...prev.scopes,
        [scope]: checked,
      },
    }));
  };

  const resetForm = () => {
    setFormState(INITIAL_FORM_STATE);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createMutation.isPending) {
      return;
    }

    const selectedScopes = AUTONOMOUS_ACTION_KEYS.filter(
      (key) => formState.scopes[key],
    );

    try {
      await createMutation.mutateAsync({
        agentIdentifier: formState.agentIdentifier.trim(),
        chainSlug: formState.chainSlug.trim(),
        walletAddress: formState.walletAddress.trim(),
        sessionKeyPublic: formState.sessionKeyPublic.trim(),
        scopes: selectedScopes,
        expiresAt:
          formState.expiresAt && formState.expiresAt.length > 0
            ? new Date(formState.expiresAt)
            : null,
      });
      toast({
        title: "Session key issued",
        description:
          "A new automation session key is now available to your agents.",
      });
      resetForm();
      setShowCreateForm(false);
    } catch (mutationError) {
      toast({
        title: "Failed to create session key",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "An unknown error occurred while creating the key.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (sessionKey: AutomationSessionKey) => {
    if (revokeMutation.isPending) return;

    const reason = revocationReason[sessionKey.id]?.trim();

    try {
      await revokeMutation.mutateAsync({
        id: sessionKey.id,
        payload: {
          revokedReason: reason && reason.length > 0 ? reason : undefined,
        },
      });
      toast({
        title: "Session key revoked",
        description: `Key ${sessionKey.agentIdentifier} is no longer usable.`,
      });
      setRevocationReason((prev) => {
        const next = { ...prev };
        delete next[sessionKey.id];
        return next;
      });
    } catch (mutationError) {
      toast({
        title: "Failed to revoke session key",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "An unknown error occurred while revoking the key.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border/60 bg-card dark:bg-[#121212]">
      <CardHeader className="space-y-2">
        <div className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Automation Session Keys</CardTitle>
            <CardDescription>
              Provision scoped session keys for autonomous actions and revoke
              them when human-in-the-loop policies change.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              aria-label="Refresh session keys"
            >
              {isRefetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
              }}
              variant={showCreateForm ? "secondary" : "default"}
            >
              <Plus className="mr-2 size-4" />
              {showCreateForm ? "Close form" : "Issue session key"}
            </Button>
          </div>
        </div>
        {activeKeys.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {activeKeys.length} active{" "}
            {activeKeys.length === 1 ? "key" : "keys"}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="grid gap-4 rounded-lg border border-border/60 bg-white/80 p-4 dark:bg-black/20"
          >
            <div className="grid gap-2">
              <Label htmlFor="automation-session-agent">Agent identifier</Label>
              <Input
                id="automation-session-agent"
                value={formState.agentIdentifier}
                onChange={(event) =>
                  handleFormChange("agentIdentifier", event.target.value)
                }
                placeholder="agent:portfolio-balancer"
                required
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="automation-session-chain">Chain slug</Label>
                <Input
                  id="automation-session-chain"
                  value={formState.chainSlug}
                  onChange={(event) =>
                    handleFormChange("chainSlug", event.target.value)
                  }
                  placeholder="base, optimism, solana, ..."
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="automation-session-wallet">
                  Wallet address
                </Label>
                <Input
                  id="automation-session-wallet"
                  value={formState.walletAddress}
                  onChange={(event) =>
                    handleFormChange("walletAddress", event.target.value)
                  }
                  placeholder="0x..."
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="automation-session-public">
                Session key (public)
              </Label>
              <Textarea
                id="automation-session-public"
                value={formState.sessionKeyPublic}
                onChange={(event) =>
                  handleFormChange("sessionKeyPublic", event.target.value)
                }
                placeholder="0x7468652d73657373696f6e2d6b6579..."
                rows={3}
                required
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="automation-session-expiry">
                  Expiration (UTC)
                </Label>
                <Input
                  id="automation-session-expiry"
                  type="datetime-local"
                  value={formState.expiresAt}
                  onChange={(event) =>
                    handleFormChange("expiresAt", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to create a non-expiring key. Session keys can be
                  revoked at any time.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Scopes</Label>
                <div className="grid gap-2 rounded-md border border-border/60 bg-white/70 p-3 text-sm dark:bg-black/30">
                  {AUTONOMOUS_ACTION_KEYS.map((scope) => {
                    const label =
                      AUTONOMOUS_ACTION_LABELS[scope]?.label ?? scope;
                    return (
                      <label key={scope} className="flex items-start gap-2">
                        <Checkbox
                          checked={formState.scopes[scope]}
                          onCheckedChange={(checked) =>
                            handleToggleScope(scope, Boolean(checked))
                          }
                        />
                        <span className="flex flex-col gap-1">
                          <span className="font-medium capitalize text-foreground">
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {AUTONOMOUS_ACTION_LABELS[scope]?.requiresApproval}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm();
                  setShowCreateForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create session key"
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-sm text-muted-foreground dark:bg-black/20">
              <Loader2 className="size-4 animate-spin" />
              Loading session keys…
            </div>
          )}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No session keys issued yet. Use the “Issue session key” button to
              give agents scoped access.
            </p>
          )}
          {(data ?? []).length > 0 && (
            <SettingsTableShell>
              <SettingsTable className="min-w-[720px]">
                <SettingsTableHeader>
                  <SettingsTableHeaderRow>
                    <SettingsTableHead>Agent</SettingsTableHead>
                    <SettingsTableHead>Chain</SettingsTableHead>
                    <SettingsTableHead>Wallet</SettingsTableHead>
                    <SettingsTableHead>Scopes</SettingsTableHead>
                    <SettingsTableHead>Status</SettingsTableHead>
                    <SettingsTableHead>Expires</SettingsTableHead>
                    <SettingsTableHead>Actions</SettingsTableHead>
                  </SettingsTableHeaderRow>
                </SettingsTableHeader>
                <SettingsTableBody>
                  {(data ?? []).map((sessionKey) => {
                    const isRevoked = Boolean(sessionKey.revokedAt);
                    const statusLabel = isRevoked ? "Revoked" : "Active";
                    const statusVariant:
                      | "default"
                      | "outline"
                      | "secondary"
                      | "destructive" = isRevoked ? "destructive" : "secondary";

                    return (
                      <SettingsTableRow
                        key={sessionKey.id}
                        className="border-border/40 hover:bg-transparent"
                      >
                        <SettingsTableCell className="text-foreground">
                          {sessionKey.agentIdentifier}
                        </SettingsTableCell>
                        <SettingsTableCell>
                          {sessionKey.chainSlug}
                        </SettingsTableCell>
                        <SettingsTableCell className="font-mono text-xs">
                          {truncateMiddle(sessionKey.walletAddress, 10)}
                        </SettingsTableCell>
                        <SettingsTableCell>
                          <div className="flex flex-wrap gap-1">
                            {sessionKey.scopes.length === 0 && (
                              <Badge
                                variant="outline"
                                className="border-dashed text-muted-foreground"
                              >
                                none
                              </Badge>
                            )}
                            {sessionKey.scopes.map((scope) => (
                              <Badge
                                key={`${sessionKey.id}-${scope}`}
                                variant="outline"
                                className="bg-white dark:bg-white/5"
                              >
                                {AUTONOMOUS_ACTION_LABELS[
                                  scope as keyof typeof AUTONOMOUS_ACTION_LABELS
                                ]?.label ?? scope}
                              </Badge>
                            ))}
                          </div>
                        </SettingsTableCell>
                        <SettingsTableCell>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </SettingsTableCell>
                        <SettingsTableCell className="text-xs">
                          {sessionKey.expiresAt
                            ? sessionKey.expiresAt.toLocaleString()
                            : "No expiry"}
                        </SettingsTableCell>
                        <SettingsTableCell>
                          <div className="flex flex-col gap-2">
                            {!isRevoked ? (
                              <>
                                <Textarea
                                  placeholder="Optional revocation reason"
                                  value={revocationReason[sessionKey.id] ?? ""}
                                  onChange={(event) =>
                                    setRevocationReason((prev) => ({
                                      ...prev,
                                      [sessionKey.id]: event.target.value,
                                    }))
                                  }
                                  className="min-h-[60px] text-xs"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevoke(sessionKey)}
                                  disabled={revokeMutation.isPending}
                                >
                                  <ShieldX className="mr-2 size-4" />
                                  Revoke
                                </Button>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Revoked {sessionKey.revokedAt?.toLocaleString()}
                                {sessionKey.revokedReason ? (
                                  <>
                                    <br />
                                    <span className="text-[0.65rem] uppercase text-muted-foreground/80">
                                      Reason:
                                    </span>{" "}
                                    {sessionKey.revokedReason}
                                  </>
                                ) : null}
                              </p>
                            )}
                          </div>
                        </SettingsTableCell>
                      </SettingsTableRow>
                    );
                  })}
                </SettingsTableBody>
              </SettingsTable>
            </SettingsTableShell>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Issued keys authenticate managed wallet sessions for on-chain
          automation.
        </span>
        <span>Remember: rotate when updating agent scopes.</span>
      </CardFooter>
    </Card>
  );
}

function truncateMiddle(value: string | null | undefined, maxLength: number) {
  const text = value ?? "";
  if (text.length <= maxLength) {
    return text;
  }
  const half = Math.floor(maxLength / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}
