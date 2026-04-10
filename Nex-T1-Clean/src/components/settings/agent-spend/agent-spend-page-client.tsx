"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BentoCard } from "@/components/settings/shared/bento-card";
import type { ProfileAggregate } from "@/lib/user/profile";
import type { EventRow, PolicyRow, SafeTxRequestListItem } from "@/components/settings/agent-spend/types";
import { TxRequestsTable } from "@/components/settings/agent-spend/tx-requests-table";
import { PushNotificationsPanel } from "@/components/settings/agent-spend/push-notifications-panel";
import { OwnerKeyPanel } from "@/components/settings/agent-spend/owner-key-panel";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import { MetricCard } from "@/components/settings/agent-spend/agent-spend-metrics";
import { AgentSpendTransactionsTab } from "@/components/settings/agent-spend/agent-spend-transactions-tab";
import { AgentSpendLimitsTab } from "@/components/settings/agent-spend/agent-spend-limits-tab";
import { AgentSpendEventsTab } from "@/components/settings/agent-spend/agent-spend-events-tab";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";

type AgentSpendPageClientProps = {
  initialProfile?: ProfileAggregate;
};

export default function AgentSpendPageClient({ initialProfile }: AgentSpendPageClientProps) {
  const { status } = useAuthContext();
  const isAuthenticated = status === "authenticated";

  const userId = useMemo(() => {
    const raw = initialProfile?.identity?.userId;
    return raw ? String(raw) : null;
  }, [initialProfile?.identity?.userId]);

  const managedWallets = useMemo(
    () =>
      (initialProfile?.wallets ?? []).filter((w) =>
        String(w.providerName ?? "").toLowerCase().includes("cdp") ||
        String(w.providerName ?? "").toLowerCase().includes("safe"),
      ),
    [initialProfile?.wallets],
  );

  const policiesQuery = useQuery({
    queryKey: ["agent-spend-policies"],
    queryFn: async () => {
      const res = await fetch("/api/settings/agent-spend/policies", { credentials: "include" });
      if (res.status === 401) {
        return { policies: [], error: null };
      }
      const json = await res.json();
      return json as { policies: PolicyRow[]; error?: string | null };
    },
    enabled: isAuthenticated,
  });

  const eventsQuery = useQuery({
    queryKey: ["agent-spend-events"],
    queryFn: async () => {
      const res = await fetch("/api/settings/agent-spend/events", { credentials: "include" });
      if (res.status === 401) {
        return { events: [], error: null };
      }
      const json = await res.json();
      return json as { events: EventRow[]; error?: string | null };
    },
    enabled: isAuthenticated,
  });

  // Transaction requests — Safe API routes removed; returns empty until CDP tx-requests API is built.
  const txRequestsQuery = useQuery({
    queryKey: ["tx-requests", "list"],
    queryFn: async (): Promise<{ items: SafeTxRequestListItem[]; error?: string | null }> => {
      // TODO: Replace with CDP tx-requests API when available.
      return { items: [], error: null };
    },
    enabled: isAuthenticated,
  });

  const pushSubscriptionsQuery = useQuery({
    queryKey: ["push-subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/push/subscriptions", { credentials: "include" });
      if (res.status === 401) {
        return { subscriptions: [], error: null };
      }
      const json = await res.json();
      return json as { subscriptions?: UntypedJson[]; error?: string | null };
    },
    enabled: isAuthenticated,
  });

  const [saving, setSaving] = useState<string | null>(null);

  const policyRows = policiesQuery.data?.policies ?? [];
  const eventRows = eventsQuery.data?.events ?? [];
  const txItems = txRequestsQuery.data?.items ?? [];

  const readyCount = managedWallets.length;
  const pendingCount = 0;

  const handlePolicySave = async (
    row: PolicyRow,
    next: { chainId: number; enabled: boolean; resetIntervalSeconds: number; policy: Record<string, UntypedJson> },
  ) => {
    setSaving(String(row.chain_id));
    try {
      if (!row.safe_address) {
        throw new Error("Wallet address not ready. Please wait for provisioning.");
      }

      const policyAny = next.policy;
      const allowances = Array.isArray(policyAny.allowances)
        ? policyAny.allowances
        : [];

      if (allowances.length === 0) {
        throw new Error("Policy JSON must contain 'allowances' array with at least one entry.");
      }

      const payload = {
        chainId: row.chain_id,
        safeAddress: row.safe_address,
        allowances: allowances.map((a: UntypedJson) => ({
          token: a.token,
          maxAmountWei: String(a.maxAmountWei ?? "0"),
          resetTimeMin: Number(a.resetTimeMin ?? 1440),
          resetBaseMin: Number(a.resetBaseMin ?? 0),
        })),
      };

      // TODO: Replace with CDP spend-permission policy API when available.
      const res = await fetch("/api/settings/agent-spend/policies", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || `Save failed (${res.status})`);
      }

      // Refresh data
      await policiesQuery.refetch();
      await txRequestsQuery.refetch();
    } catch (err: UntypedJson) {
      logger.error(err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-h1 text-[22.5px] font-medium tracking-[-0.6px]">Agent spend</div>
        <div className="text-sm text-[var(--bento-text-muted)]">
          Control agent execution with on-chain allowances and human approvals.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard label="Nex-T1 wallets" value={String(readyCount)} />
        <MetricCard label="Pending provisioning" value={String(pendingCount)} />
        <MetricCard label="Available allowance" value="—" subtle />
        <MetricCard label="Spent (24h)" value="—" subtle />
      </div>

      {(policiesQuery.data?.error || eventsQuery.data?.error) && (
        <Alert variant="destructive">
          <AlertTitle>Data fetch failed</AlertTitle>
          <AlertDescription>
            {policiesQuery.data?.error ?? eventsQuery.data?.error ?? "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="limits">Spend limits</TabsTrigger>
          <TabsTrigger value="events">Activity</TabsTrigger>
          <TabsTrigger value="keys">Delegates &amp; keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <OwnerKeyPanel userId={userId} />
            <PushNotificationsPanel enabledByDefault={Boolean((pushSubscriptionsQuery.data?.subscriptions ?? []).length)} />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 space-y-3">
          <TxRequestsTable
            userId={userId}
            items={txItems}
            isLoading={txRequestsQuery.isLoading}
            onRefresh={async () => {
              await txRequestsQuery.refetch();
            }}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4 space-y-3">
          <AgentSpendTransactionsTab items={txItems} isLoading={txRequestsQuery.isLoading} />
        </TabsContent>

        <TabsContent value="limits" className="mt-4 space-y-3">
          <AgentSpendLimitsTab
            rows={policyRows}
            isLoading={policiesQuery.isLoading}
            saving={saving}
            onSave={handlePolicySave}
          />
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-3">
          <AgentSpendEventsTab events={eventRows} isLoading={eventsQuery.isLoading} />
        </TabsContent>

        <TabsContent value="keys" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OwnerKeyPanel userId={userId} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-3">
          <PushNotificationsPanel enabledByDefault={Boolean((pushSubscriptionsQuery.data?.subscriptions ?? []).length)} />
          <BentoCard>
            <div className="text-sm font-medium text-[var(--bento-text-primary)]">MFA enforcement</div>
            <div className="mt-1 text-xs text-[var(--bento-text-muted)]">
              Wallet approvals and executions require AAL2 (2FA). If you see &quot;mfa_required&quot;, complete 2FA and retry.
            </div>
          </BentoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
