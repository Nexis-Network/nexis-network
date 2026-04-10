"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {

  AdminPromptLogListResponse,
  AdminSessionRevokeResponse,
  AdminSupportTicketListResponse,
  AdminUserBlacklistResponse,
  AdminUserDetail,
  AdminAuditLogListResponse,
} from "@/types/admin";

import { logger } from '@/lib/logger';
interface AdminUserDetailProps {
  userId: number | null;
  open: boolean;
}

export function AdminUserDetailView({ userId, open }: AdminUserDetailProps) {
  const enabled = open && Boolean(userId);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditAdminFilter, setAuditAdminFilter] = useState<string>("");
  const [auditPage, setAuditPage] = useState<number>(1);
  const [revokeSessionTarget, setRevokeSessionTarget] = useState<string | null>(null);

  const detailQuery = useQuery<AdminUserDetail>({
    queryKey: ["admin", "users", userId, "detail"],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        throw new Error("Failed to load user detail");
      }
      return (await res.json()) as AdminUserDetail;
    },
    staleTime: 60_000,
  });

  const promptsQuery = useQuery<AdminPromptLogListResponse>({
    queryKey: ["admin", "users", userId, "prompts"],
    enabled: enabled && activeTab === "prompts",
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/prompts`);
      if (!res.ok) {
        throw new Error("Failed to load prompt logs");
      }
      return (await res.json()) as AdminPromptLogListResponse;
    },
    staleTime: 30_000,
  });

  const supportQuery = useQuery<AdminSupportTicketListResponse>({
    queryKey: ["admin", "users", userId, "support"],
    enabled: enabled && activeTab === "support",
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/support`);
      if (!res.ok) {
        throw new Error("Failed to load support tickets");
      }
      return (await res.json()) as AdminSupportTicketListResponse;
    },
    staleTime: 30_000,
  });

  const auditPageSize = 25;
  const auditQueryKey = useMemo(
    () => ["admin", "users", userId, "audit", auditPage, auditActionFilter, auditAdminFilter] as const,
    [userId, auditPage, auditActionFilter, auditAdminFilter],
  );

  const auditQuery = useQuery<AdminAuditLogListResponse>({
    queryKey: auditQueryKey,
    enabled: enabled && activeTab === "audit",
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(auditPageSize),
        offset: String((auditPage - 1) * auditPageSize),
      });
      if (auditActionFilter !== "all") {
        params.set("action", auditActionFilter);
      }
      if (auditAdminFilter.trim()) {
        params.set("admin_user_id", auditAdminFilter.trim());
      }
      const res = await fetch(`/api/admin/users/${userId}/audit?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load audit log");
      }
      return (await res.json()) as AdminAuditLogListResponse;
    },
    staleTime: 15_000,
  });

  const auditTotalPages = useMemo(() => {
    if (!auditQuery.data) return 1;
    return Math.max(1, Math.ceil(auditQuery.data.total / auditPageSize));
  }, [auditQuery.data, auditPageSize]);

  const handleAuditActionChange = useCallback((value: string) => {
    setAuditActionFilter(value);
    setAuditPage(1);
  }, []);

  const handleAuditAdminChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setAuditAdminFilter(sanitized);
    setAuditPage(1);
  }, []);

  const resetAuditFilters = useCallback(() => {
    setAuditActionFilter("all");
    setAuditAdminFilter("");
    setAuditPage(1);
  }, []);

  const highRiskActions = useMemo(
    () => new Set(["user_blacklist_toggled", "user_role_updated", "user_session_revoked"]),
    [],
  );

  const auditPageOneKey = useMemo(
    () => ["admin", "users", userId, "audit", 1, auditActionFilter, auditAdminFilter] as const,
    [userId, auditActionFilter, auditAdminFilter],
  );

  const handleAudit = useCallback(
    (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          id: number;
          created_at: string | null;
          admin_user_id: number;
          admin_user_email?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Record<string, UntypedJson> | null;
          ip?: string | null;
          user_agent?: string | null;
        };

        if (payload.resource_type !== "user" || String(payload.resource_id) !== String(userId)) {
          return;
        }

        const actionMatches = auditActionFilter === "all" || payload.action === auditActionFilter;
        const adminMatches = !auditAdminFilter.trim() || auditAdminFilter.trim() === String(payload.admin_user_id);

        if (!actionMatches || !adminMatches) {
          return;
        }

        const entry = {
          id: payload.id,
          created_at: payload.created_at ?? new Date().toISOString(),
          admin_user_id: payload.admin_user_id,
          admin_user_email: payload.admin_user_email ?? null,
          action: payload.action,
          resource_type: payload.resource_type ?? "user",
          resource_id: payload.resource_id ?? String(userId),
          metadata: payload.metadata ?? null,
          ip: payload.ip ?? null,
          user_agent: payload.user_agent ?? null,
        };

        queryClient.setQueryData<AdminAuditLogListResponse | undefined>(auditPageOneKey, (current) => {
          if (!current) {
            return {
              results: [entry],
              total: 1,
            };
          }
          if (current.results.some((existing) => existing.id === entry.id)) {
            return current;
          }
          const results = [entry, ...current.results];
          if (results.length > auditPageSize) {
            results.pop();
          }
          return {
            results,
            total: current.total + 1,
          };
        });

        if (auditPage !== 1) {
          setAuditPage(1);
        }

        if (highRiskActions.has(payload.action)) {
          const adminLabel = payload.admin_user_email ?? `admin ${payload.admin_user_id}`;
          toast({
            title: "Sensitive admin action",
            description: `${payload.action.replace(/_/g, " ")} by ${adminLabel}`,
          });
        }
      } catch (error) {
        logger.error("Failed to process audit event", error);
      }
    },
    [
      auditActionFilter,
      auditAdminFilter,
      auditPage,
      auditPageOneKey,
      auditPageSize,
      highRiskActions,
      queryClient,
      setAuditPage,
      toast,
      userId,
    ],
  );

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    let retryMs = 2000;
    let active = true;
    let source: EventSource | null = null;

    const connect = () => {
      if (!active) return;
      source = new EventSource("/api/admin/audit/stream");

      source.addEventListener("audit", handleAudit);

      source.addEventListener("ping", () => {
        // heartbeat noop
      });

      source.addEventListener("error", () => {
        source?.close();
        if (!active) return;
        setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30000);
      });
    };

    connect();

    return () => {
      active = false;
      if (source) {
        source.removeEventListener("audit", handleAudit);
        source.close();
      }
    };
  }, [handleAudit, enabled, userId]);

  const blacklistMutation = useMutation<AdminUserBlacklistResponse, Error, { active: boolean; reason?: string }>(
    {
      mutationFn: async ({ active, reason }) => {
        const res = await fetch(`/api/admin/users/${userId}/blacklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active, reason }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.detail || "Failed to update blacklist state");
        }
        return (await res.json()) as AdminUserBlacklistResponse;
      },
      onSuccess: () => {
        toast({ title: "Blacklist state updated", duration: 2000 });
        detailQuery.refetch();
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      },
      onError: (error) => {
        toast({ title: "Blacklist update failed", description: error.message, variant: "destructive" });
      },
    },
  );

  const revokeSessionMutation = useMutation<AdminSessionRevokeResponse, Error, string>({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/sessions/${sessionId}/revoke`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.detail || "Failed to revoke session");
      }
      return (await res.json()) as AdminSessionRevokeResponse;
    },
    onSuccess: () => {
      toast({ title: "Session revoked", duration: 2000 });
      detailQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Unable to revoke session", description: error.message, variant: "destructive" });
    },
  });

  const detail = detailQuery.data;

  const sessionSummary = useMemo(() => {
    if (!detail) return null;
    if (!detail.session_count) return "No sessions recorded";
    const latest = detail.last_session_at ? new Date(detail.last_session_at).toLocaleString() : "Unknown";
    return `${detail.session_count} sessions · Last active ${latest}`;
  }, [detail]);

  const handleBlacklistToggle = useCallback(async () => {
    if (!detail || blacklistMutation.isPending) return;
    const nextActive = !detail.is_blacklisted;
    let reason: string | undefined;
    if (nextActive) {
      reason = window.prompt("Provide an optional reason for blacklisting", "") || undefined;
    }
    await blacklistMutation.mutateAsync({ active: nextActive, reason });
  }, [detail, blacklistMutation]);

  const handleSessionRevoke = useCallback(
    (sessionId: string) => {
      if (revokeSessionMutation.isPending) return;
      setRevokeSessionTarget(sessionId);
    },
    [revokeSessionMutation],
  );

  const confirmSessionRevoke = useCallback(async () => {
    if (!revokeSessionTarget) return;
    const sessionId = revokeSessionTarget;
    setRevokeSessionTarget(null);
    await revokeSessionMutation.mutateAsync(sessionId);
  }, [revokeSessionTarget, revokeSessionMutation]);

  if (!enabled) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Select a user to inspect their profile.</p>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-32 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-destructive">Unable to load user detail. Please try again.</p>
        <button
          type="button"
          onClick={() => detailQuery.refetch()}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const createdDate = new Date(detail.created_at).toLocaleString();
  const deletedDate = detail.deleted_at ? new Date(detail.deleted_at).toLocaleString() : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-2 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base font-regular">{detail.email ?? `User #${detail.id}`}</p>
            </div>
            <Button
              size="sm"
              variant={detail.is_blacklisted ? "outline" : "destructive"}
              onClick={handleBlacklistToggle}
              disabled={blacklistMutation.isPending}
            >
              {detail.is_blacklisted ? "Reinstate user" : "Blacklist user"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="uppercase">
              {detail.role.replace("_", " ")}
            </Badge>
            {detail.is_blacklisted ? <Badge variant="destructive">Blacklisted</Badge> : null}
            <Badge variant="secondary">ID: {detail.id}</Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Created {createdDate}</p>
          {deletedDate ? <p>Deleted {deletedDate}</p> : null}
          {sessionSummary ? <p>{sessionSummary}</p> : null}
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-4 pb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Logs</TabsTrigger>
          <TabsTrigger value="support">Support Tickets</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="space-y-3">
            <header>
              <h3 className="text-sm font-regular">Wallets</h3>
              <p className="text-xs text-muted-foreground">Linked identities across chains.</p>
            </header>
            {detail.wallets.length ? (
              <ul className="space-y-2">
                {detail.wallets.map((wallet) => (
                  <li key={wallet.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium uppercase">{wallet.chain}</span>
                      {wallet.is_primary ? <Badge variant="secondary">Primary</Badge> : null}
                      {wallet.verified ? <Badge variant="outline">Verified</Badge> : null}
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{wallet.address}</p>
                    {wallet.label ? <p className="mt-1 text-xs text-muted-foreground">Label: {wallet.label}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No wallets linked.</p>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <header>
              <h3 className="text-sm font-regular">Subscriptions</h3>
              <p className="text-xs text-muted-foreground">Tracked plans and renewal metadata.</p>
            </header>
            {detail.subscriptions.length ? (
              <ul className="space-y-2 text-sm">
                {detail.subscriptions.map((sub) => (
                  <li key={sub.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{sub.plan_id}</span>
                      <Badge variant={sub.status === "active" ? "secondary" : "outline"}>{sub.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trial ends {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : "—"} · Renewal {sub.renewal_at ? new Date(sub.renewal_at).toLocaleDateString() : "—"}
                    </p>
                    {sub.canceled_at ? (
                      <p className="text-xs text-muted-foreground">Canceled {new Date(sub.canceled_at).toLocaleDateString()}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No active subscriptions on record.</p>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <header>
              <h3 className="text-sm font-regular">Recent Sessions</h3>
              <p className="text-xs text-muted-foreground">Last 10 sessions recorded for this user.</p>
            </header>
            {detail.recent_sessions.length ? (
              <ul className="space-y-2 text-sm">
                {detail.recent_sessions.map((session) => (
                  <li key={session.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{session.name || session.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleString()}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSessionRevoke(session.id)}
                        disabled={revokeSessionMutation.isPending}
                      >
                        End
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No sessions available.</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-3">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-regular">Prompt history</h3>
              <p className="text-xs text-muted-foreground">Latest prompts ingested for compliance review.</p>
            </div>
            {userId ? (
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/admin/users/${userId}/prompts/export`} target="_blank" rel="noopener noreferrer">
                  Export CSV
                </a>
              </Button>
            ) : null}
          </header>
          {promptsQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ) : promptsQuery.isError ? (
            <div className="space-y-2 text-sm text-destructive">
              <p>Failed to load prompt logs.</p>
              <Button size="sm" variant="outline" onClick={() => promptsQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : promptsQuery.data && promptsQuery.data.results.length ? (
            <ul className="space-y-3 text-sm">
              {promptsQuery.data.results.map((entry) => (
                <li key={entry.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{new Date(entry.created_at).toLocaleString()}</span>
                    <Badge variant="outline">{entry.model ?? "unknown"}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{entry.prompt}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Tokens: {entry.tokens_prompt + entry.tokens_completion}</span>
                    {entry.detected_topics?.length ? (
                      <span>
                        Topics:
                        {entry.detected_topics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="ml-1 uppercase">
                            {topic}
                          </Badge>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No prompt history recorded.</p>
          )}
        </TabsContent>

        <TabsContent value="support" className="space-y-3">
          <header>
            <h3 className="text-sm font-regular">Support interactions</h3>
            <p className="text-xs text-muted-foreground">Recent tickets involving this user.</p>
          </header>
          {supportQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ) : supportQuery.isError ? (
            <div className="space-y-2 text-sm text-destructive">
              <p>Failed to load support tickets.</p>
              <Button size="sm" variant="outline" onClick={() => supportQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : supportQuery.data && supportQuery.data.results.length ? (
            <ul className="space-y-3 text-sm">
              {supportQuery.data.results.map((ticket) => (
                <li key={ticket.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Opened {new Date(ticket.created_at).toLocaleString()} · Status {ticket.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Classification: {ticket.classification ?? "—"} · Priority: {ticket.priority ?? "—"}
                      </p>
                    </div>
                    <Badge variant="outline">{ticket.status}</Badge>
                  </div>
                  <div className="mt-3 space-y-2 rounded-md bg-muted/40 p-3">
                    {ticket.messages.map((message) => (
                      <div key={message.id} className="rounded border bg-background p-2 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-medium capitalize">{message.author_type}</span>
                          <span>{new Date(message.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-foreground">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No support activity recorded.</p>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          <header className="space-y-1">
            <h3 className="text-sm font-regular">Audit Trail</h3>
            <p className="text-xs text-muted-foreground">Recent administrator actions involving this account.</p>
          </header>
          <div className="flex flex-col gap-3 rounded-lg border bg-card/40 p-3 text-xs text-muted-foreground md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">Action</span>
                <Select value={auditActionFilter} onValueChange={handleAuditActionChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="user_role_updated">Role updates</SelectItem>
                    <SelectItem value="user_blacklist_toggled">Blacklist toggles</SelectItem>
                    <SelectItem value="user_session_revoked">Session revocations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">Admin ID</span>
                <Input
                  animateNumeric
                  value={auditAdminFilter}
                  onChange={(event) => handleAuditAdminChange(event.target.value)}
                  placeholder="Any"
                  className="w-32"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetAuditFilters}>
                Reset
              </Button>
            </div>
          </div>
          {auditQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ) : auditQuery.isError ? (
            <div className="space-y-2 text-sm text-destructive">
              <p>Failed to load audit trail.</p>
              <Button size="sm" variant="outline" onClick={() => auditQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : auditQuery.data && auditQuery.data.results.length ? (
            <>
              <ul className="space-y-3 text-sm">
                {auditQuery.data.results.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Admin: {entry.admin_user_email ?? `#${entry.admin_user_id}`} (ID {entry.admin_user_id})
                    {entry.ip ? ` · IP ${entry.ip}` : ""}
                  </p>
                    {entry.metadata ? (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    ) : null}
                    {entry.user_agent ? (
                      <p className="mt-2 text-xs text-muted-foreground">UA: {entry.user_agent}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {auditPage} of {auditTotalPages}
                </span>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={auditPage === 1 || auditQuery.isLoading}
                    onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={auditPage >= auditTotalPages || auditQuery.isLoading}
                    onClick={() => setAuditPage((prev) => Math.min(auditTotalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No audit entries yet.</p>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={revokeSessionTarget !== null} onOpenChange={(open) => { if (!open) setRevokeSessionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately terminate the user&apos;s session. They will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSessionRevoke} className="bg-red-600 hover:bg-red-700">
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
