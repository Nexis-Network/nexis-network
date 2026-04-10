"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/settings/shared/settings-button";
import { SettingsPage, SettingsPageHeader, SettingsSection } from "@/components/settings-v2/primitives/page";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchApi } from "@/lib/hooks/social/fetcher";

type OverviewPayload = {
  defaultWalletAddress: string | null;
  wallets: Array<{ walletId: string; address: string | null; label: string; providerName: string; chainId: number | null }>;
  domainCatalog: Array<{ domain: string; providerNames: string[]; actionCount: number; representativeActions: string[] }>;
  history: { transactions: Array<{ id: string; action_name: string; status: string; tx_hash: string | null; created_at: string }> };
  deployments: Array<{ id: string; deployment_type: string; name: string | null; contract_address: string | null; created_at: string }>;
  positions: Array<{ id: string; protocol: string | null; symbol: string | null; size: string | null; pnl_usd: string | null; updated_at: string }>;
  automation: {
    tasks: Array<{ id: string; name: string; action_name: string; domain: string; interval_seconds: number; enabled: boolean }>;
    settings: { autonomousMode: boolean; riskTolerance: string; maxTransactionValueUsd: string | null };
  };
};

const DOMAIN_OPTIONS = [
  { value: "wallet", label: "Wallet", action: "WalletActionProvider_get_wallet_details" },
  { value: "defi", label: "DeFi", action: "CompoundActionProvider_supply" },
  { value: "builder", label: "Builder", action: "Erc721ActionProvider_mint" },
  { value: "identity", label: "Identity", action: "BasenameActionProvider_register_basename" },
  { value: "market", label: "Market", action: "PythActionProvider_fetch_price" },
] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "n/a" : date.toLocaleString();
}

async function patchAutomationSettings(body: Record<string, unknown>) {
  const response = await fetch("/api/approvals/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update automation settings.");
}

async function mutateTask(url: string, method: "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("Failed to update Coinbase AgentKit task.");
}

export function SettingsCoinbaseAgentKitSection() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<OverviewPayload>(
    "/api/settings/coinbase-agentkit/overview",
    fetchApi,
  );
  const [taskDomain, setTaskDomain] = useState<(typeof DOMAIN_OPTIONS)[number]["value"]>("wallet");
  const [taskName, setTaskName] = useState("");
  const [taskActionName, setTaskActionName] = useState<string>(DOMAIN_OPTIONS[0].action);
  const [taskInterval, setTaskInterval] = useState("3600");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async () => {
    setIsSubmitting(true);
    try {
      await mutateTask("/api/settings/coinbase-agentkit/tasks", "POST", {
        name: taskName || `${taskDomain} automation`,
        domain: taskDomain,
        actionName: taskActionName,
        intervalSeconds: Number(taskInterval),
      });
      setTaskName("");
      toast.success("Coinbase AgentKit task created.");
      await mutate();
    } catch (submissionError) {
      toast.error(submissionError instanceof Error ? submissionError.message : "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-[var(--settings-foreground-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading Coinbase AgentKit settings...
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-sm text-red-500">Failed to load Coinbase AgentKit settings.</div>;
  }

  return (
    <SettingsPage className="space-y-8">
      <SettingsPageHeader
        title="Coinbase AgentKit"
        description="EVM-only embedded wallet execution, activity history, deployments, positions, and automation."
        action={
          <Button size="sm" variant="outline" onClick={() => mutate()}>
            <RefreshCcw className={`mr-2 size-4 ${isValidating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SettingsPanel title="Primary EVM Wallet" description={data.defaultWalletAddress ?? "No embedded EVM wallet found."}>
          <p className="text-sm text-[var(--settings-foreground-muted)]">Default embedded EVM signer for Coinbase AgentKit execution.</p>
        </SettingsPanel>
        <SettingsPanel title="Wallets" description={`${data.wallets.length} embedded or linked EVM wallets`}>
          <p className="text-sm text-[var(--settings-foreground-muted)]">Only EVM wallets are shown here. Solana stays on Solana AgentKit.</p>
        </SettingsPanel>
        <SettingsPanel title="Capabilities" description={`${data.domainCatalog.reduce((sum, entry) => sum + entry.actionCount, 0)} AgentKit actions`}>
          <p className="text-sm text-[var(--settings-foreground-muted)]">Live domain counts are loaded from the installed Coinbase AgentKit providers.</p>
        </SettingsPanel>
        <SettingsPanel title="Transactions" description={`${data.history.transactions.length} recorded executions`}>
          <p className="text-sm text-[var(--settings-foreground-muted)]">Recent EVM AgentKit executions and persisted approvals.</p>
        </SettingsPanel>
      </div>

      <SettingsSection title="Wallets & Domains" description="Primary EVM wallets and the currently loaded Coinbase AgentKit capability domains.">
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsPanel title="Wallets">
            <div className="space-y-3 text-sm">
              {data.wallets.map((wallet) => (
                <div key={wallet.walletId} className="rounded-lg border border-[var(--settings-border-soft)] p-3">
                  <div className="font-medium">{wallet.label}</div>
                  <div className="text-[var(--settings-foreground-muted)]">{wallet.address ?? "pending"}</div>
                </div>
              ))}
            </div>
          </SettingsPanel>
          <SettingsPanel title="Domains">
            <div className="space-y-3 text-sm">
              {data.domainCatalog.map((entry) => (
                <div key={entry.domain} className="rounded-lg border border-[var(--settings-border-soft)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{entry.domain}</span>
                    <Badge variant="outline">{entry.actionCount} actions</Badge>
                  </div>
                  <div className="mt-2 text-[var(--settings-foreground-muted)]">{entry.representativeActions.join(", ")}</div>
                </div>
              ))}
            </div>
          </SettingsPanel>
        </div>
      </SettingsSection>

      <SettingsSection title="Automation" description="Autonomous mode status and recurring Coinbase AgentKit tasks.">
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsPanel title="Mode">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autonomous mode</p>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  Risk {data.automation.settings.riskTolerance}, max ${data.automation.settings.maxTransactionValueUsd ?? "n/a"}
                </p>
              </div>
              <Switch
                checked={data.automation.settings.autonomousMode}
                onCheckedChange={async (checked) => {
                  try {
                    await patchAutomationSettings({ autonomousMode: checked });
                    await mutate();
                  } catch {
                    toast.error("Failed to update autonomous mode.");
                  }
                }}
              />
            </div>
          </SettingsPanel>
          <SettingsPanel title="Create task">
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Recurring WETH wrap" /></div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={taskDomain} onValueChange={(value) => {
                  const next = DOMAIN_OPTIONS.find((option) => option.value === value) ?? DOMAIN_OPTIONS[0];
                  setTaskDomain(next.value);
                  setTaskActionName(next.action);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOMAIN_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Action</Label><Input value={taskActionName} onChange={(event) => setTaskActionName(event.target.value)} /></div>
              <div className="space-y-2"><Label>Interval Seconds</Label><Input value={taskInterval} onChange={(event) => setTaskInterval(event.target.value)} /></div>
              <Button disabled={isSubmitting} onClick={handleCreateTask}>{isSubmitting ? "Creating..." : "Create task"}</Button>
            </div>
          </SettingsPanel>
        </div>
        <div className="mt-4 space-y-3">
          {data.automation.tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg border border-[var(--settings-border-soft)] p-3 text-sm">
              <div>
                <div className="font-medium">{task.name}</div>
                <div className="text-[var(--settings-foreground-muted)]">{task.action_name} every {task.interval_seconds}s</div>
              </div>
              <Switch
                checked={task.enabled}
                onCheckedChange={async (checked) => {
                  try {
                    await mutateTask(`/api/settings/coinbase-agentkit/tasks/${task.id}`, "PATCH", { enabled: checked });
                    await mutate();
                  } catch {
                    toast.error("Failed to update task.");
                  }
                }}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Execution State" description="Recent Coinbase AgentKit transactions, deployments, and tracked EVM positions.">
        <div className="grid gap-4 lg:grid-cols-3">
          <SettingsPanel title="Transactions">{data.history.transactions.slice(0, 5).map((entry) => <div key={entry.id} className="mb-3 text-sm"><div className="font-medium">{entry.action_name}</div><div className="text-[var(--settings-foreground-muted)]">{entry.tx_hash ?? entry.status} • {formatDate(entry.created_at)}</div></div>)}</SettingsPanel>
          <SettingsPanel title="Deployments">{data.deployments.slice(0, 5).map((entry) => <div key={entry.id} className="mb-3 text-sm"><div className="font-medium">{entry.name ?? entry.deployment_type}</div><div className="text-[var(--settings-foreground-muted)]">{entry.contract_address ?? "pending"} • {formatDate(entry.created_at)}</div></div>)}</SettingsPanel>
          <SettingsPanel title="Positions">{data.positions.slice(0, 5).map((entry) => <div key={entry.id} className="mb-3 text-sm"><div className="font-medium">{entry.symbol ?? entry.protocol ?? "position"}</div><div className="text-[var(--settings-foreground-muted)]">{entry.size ?? "n/a"} • PnL {entry.pnl_usd ?? "n/a"} • {formatDate(entry.updated_at)}</div></div>)}</SettingsPanel>
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
