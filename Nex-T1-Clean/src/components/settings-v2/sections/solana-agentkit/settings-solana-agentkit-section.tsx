"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsPage, SettingsPageHeader, SettingsSection } from "@/components/settings-v2/primitives/page";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { fetchApi } from "@/lib/hooks/social/fetcher";

type OverviewPayload = {
  defaultWalletAddress: string | null;
  domainCatalog: Array<{
    domain: string;
    pluginName: string;
    actionCount: number;
    representativeActions: string[];
  }>;
  balances: {
    tokens: Array<{
      walletAddress: string;
      symbol: string | null;
      name: string | null;
      balance: number;
      valueUsd: number | null;
    }>;
    nfts: Array<{
      walletAddress: string;
    }>;
  };
  history: {
    events: Array<{
      id: string;
      timestamp: number | null;
      type: string;
      walletAddress: string;
      symbol: string | null;
      amount: string | null;
      txHash?: string | null;
      source: string;
    }>;
    transactions: Array<{
      id: string;
      action_name: string;
      protocol: string | null;
      status: string;
      tx_signature: string | null;
      created_at: string;
    }>;
  };
  deployments: Array<{
    id: string;
    deployment_type: string;
    symbol: string | null;
    name: string | null;
    mint: string | null;
    created_at: string;
  }>;
  positions: Array<{
    id: string;
    protocol: string | null;
    position_kind: string;
    symbol: string | null;
    size: string | null;
    pnl_usd: string | null;
    pnl_percent: string | null;
    status: string;
    updated_at: string;
  }>;
  automation: {
    tasks: Array<{
      id: string;
      name: string;
      action_name: string;
      domain: string;
      interval_seconds: number;
      enabled: boolean;
      last_run_at: string | null;
      next_run_at: string | null;
      last_error: string | null;
    }>;
    settings: {
      autonomousMode: boolean;
      riskTolerance: "conservative" | "moderate" | "aggressive";
      maxTransactionValueUsd: string | null;
      preferredChains: string[];
      autonomousActions: Record<"bridge" | "deploy" | "buy" | "sell" | "stake", boolean>;
    };
  };
};

const AUTOMATION_ACTIONS: Array<{
  key: "bridge" | "deploy" | "buy" | "sell" | "stake";
  label: string;
  description: string;
}> = [
  { key: "buy", label: "Buy / swap", description: "Jupiter swaps, token buys, perp openings, and similar accumulation flows." },
  { key: "sell", label: "Sell / close", description: "Disposals, position closes, or liquidity exits routed through Solana AgentKit." },
  { key: "stake", label: "Stake / lend", description: "Staking, lending, and yield-seeking actions such as JupSOL, Solayer, or Lulo." },
  { key: "deploy", label: "Deploy / launch", description: "Token launches, collection deployment, and other publish actions." },
  { key: "bridge", label: "Bridge", description: "Cross-chain bridging through deBridge or Wormhole style actions." },
];

const TASK_DOMAIN_OPTIONS = [
  { value: "token", label: "Token" },
  { value: "nft", label: "NFT" },
  { value: "defi", label: "DeFi" },
  { value: "misc", label: "Misc" },
  { value: "blinks", label: "Blinks" },
] as const;

const DEFAULT_ACTION_BY_DOMAIN: Record<string, string> = {
  token: "TRANSFER",
  nft: "MINT_NFT",
  defi: "LULO_LEND",
  misc: "RESOLVE_SOL_DOMAIN",
  blinks: "PLAY_ROCK_PAPER_SCISSORS",
};

function formatUsd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value: string | number | null | undefined): string {
  if (!value && value !== 0) {
    return "n/a";
  }

  const date =
    typeof value === "number"
      ? new Date(value * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function truncateMiddle(value: string | null | undefined, start = 6, end = 4): string {
  if (!value) {
    return "n/a";
  }

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--settings-border-soft)] bg-[#0f0f10] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--settings-foreground-subtle)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--settings-foreground-strong)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-[var(--settings-foreground-muted)]">{detail}</p>
    </div>
  );
}

async function patchAutomationSettings(body: Record<string, unknown>) {
  const response = await fetch("/api/approvals/settings", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to update Solana automation settings.");
  }
}

async function mutateTask(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to update Solana AgentKit task.");
  }
}

export function SettingsSolanaAgentKitSection() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<OverviewPayload>(
    "/api/settings/solana-agentkit/overview",
    fetchApi,
  );
  const [taskName, setTaskName] = useState("");
  const [taskDomain, setTaskDomain] = useState<(typeof TASK_DOMAIN_OPTIONS)[number]["value"]>("token");
  const [taskActionName, setTaskActionName] = useState(DEFAULT_ACTION_BY_DOMAIN.token);
  const [taskIntervalSeconds, setTaskIntervalSeconds] = useState("3600");
  const [taskWalletAddress, setTaskWalletAddress] = useState("");
  const [taskParameters, setTaskParameters] = useState("{}");
  const [taskMutationPending, setTaskMutationPending] = useState(false);

  const balances = data?.balances.tokens ?? [];
  const positions = data?.positions ?? [];
  const deployments = data?.deployments ?? [];
  const automationSettings = data?.automation.settings ?? {
    autonomousMode: false,
    riskTolerance: "conservative" as const,
    maxTransactionValueUsd: null,
    preferredChains: [],
    autonomousActions: {
      bridge: false,
      deploy: false,
      buy: false,
      sell: false,
      stake: false,
    },
  };
  const totalValueUsd = balances.reduce((sum, token) => sum + (token.valueUsd ?? 0), 0);

  const updateMasterToggle = async (checked: boolean) => {
    try {
      await patchAutomationSettings({ autonomousMode: checked, preferredChains: ["solana"] });
      toast.success(`Solana autonomous mode ${checked ? "enabled" : "disabled"}.`);
      await mutate();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Failed to update autonomous mode.");
    }
  };

  const updateActionToggle = async (
    key: "bridge" | "deploy" | "buy" | "sell" | "stake",
    checked: boolean,
  ) => {
    try {
      await patchAutomationSettings({
        preferredChains: ["solana"],
        autonomousActions: { [key]: checked },
      });
      toast.success(`Solana automation updated for ${key}.`);
      await mutate();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Failed to update autonomous action.");
    }
  };

  const createTask = async () => {
    let parsedParameters: Record<string, unknown> = {};

    try {
      const trimmed = taskParameters.trim();
      parsedParameters = trimmed ? (JSON.parse(trimmed) as Record<string, unknown>) : {};
      if (parsedParameters === null || Array.isArray(parsedParameters)) {
        throw new Error("Parameters JSON must be an object.");
      }
    } catch (parseError) {
      toast.error(parseError instanceof Error ? parseError.message : "Invalid parameters JSON.");
      return;
    }

    setTaskMutationPending(true);
    try {
      await mutateTask("/api/settings/solana-agentkit/tasks", "POST", {
        name: taskName,
        actionName: taskActionName,
        domain: taskDomain,
        intervalSeconds: taskIntervalSeconds,
        walletAddress: taskWalletAddress || null,
        parameters: parsedParameters,
      });
      toast.success("Solana AgentKit automation task created.");
      setTaskName("");
      setTaskIntervalSeconds("3600");
      setTaskWalletAddress("");
      setTaskParameters("{}");
      setTaskActionName(DEFAULT_ACTION_BY_DOMAIN[taskDomain]);
      await mutate();
    } catch (taskError) {
      toast.error(taskError instanceof Error ? taskError.message : "Failed to create Solana AgentKit task.");
    } finally {
      setTaskMutationPending(false);
    }
  };

  const toggleTask = async (taskId: string, enabled: boolean) => {
    setTaskMutationPending(true);
    try {
      await mutateTask(`/api/settings/solana-agentkit/tasks/${taskId}`, "PATCH", {
        enabled,
      });
      toast.success(`Task ${enabled ? "enabled" : "disabled"}.`);
      await mutate();
    } catch (taskError) {
      toast.error(taskError instanceof Error ? taskError.message : "Failed to update task.");
    } finally {
      setTaskMutationPending(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    setTaskMutationPending(true);
    try {
      await mutateTask(`/api/settings/solana-agentkit/tasks/${taskId}`, "DELETE");
      toast.success("Task removed.");
      await mutate();
    } catch (taskError) {
      toast.error(taskError instanceof Error ? taskError.message : "Failed to delete task.");
    } finally {
      setTaskMutationPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--settings-foreground-muted)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Solana AgentKit"
          description="AgentKit-backed Solana execution, balances, positions, and autonomous controls."
        />
        <SettingsPanel title="Unavailable">
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : "Failed to load Solana AgentKit settings."}
          </p>
        </SettingsPanel>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage className="space-y-8">
      <SettingsPageHeader
        title="Solana AgentKit"
        description="Manage the Solana AgentKit tool surface wired into the AI SDK v6 chat runtime, backed by CDP embedded Solana signing and approval controls."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void mutate()}
            disabled={isValidating}
          >
            {isValidating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Default wallet"
          value={truncateMiddle(data.defaultWalletAddress)}
          detail="Primary embedded Solana wallet resolved for AgentKit write actions."
        />
        <StatCard
          label="Token balances"
          value={String(balances.length)}
          detail={`${formatUsd(totalValueUsd)} indexed across the current embedded Solana wallet view.`}
        />
        <StatCard
          label="Tracked positions"
          value={String(positions.length)}
          detail="Open staking, lending, perp, or liquidity records captured from successful AgentKit actions."
        />
        <StatCard
          label="Deployments"
          value={String(deployments.length)}
          detail="Tokens, NFT collections, and launch records captured in the Solana AgentKit deployment ledger."
        />
      </div>

      <SettingsSection
        title="Loaded domains"
        description="Only the relevant Solana AgentKit plugin domains should be loaded for a given request."
        badge={<Badge variant="outline">{data.domainCatalog.length} domains</Badge>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {data.domainCatalog.map((domain) => (
            <SettingsPanel
              key={domain.domain}
              title={`${domain.domain} domain`}
              description={`${domain.pluginName} · ${domain.actionCount}+ supported flows`}
            >
              <div className="flex flex-wrap gap-2">
                {domain.representativeActions.map((action) => (
                  <Badge key={action} variant="outline" className="rounded-full">
                    {action}
                  </Badge>
                ))}
              </div>
            </SettingsPanel>
          ))}
        </div>
      </SettingsSection>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SettingsPanel title="Solana balances" description="Current token balances routed from the settings wallet aggregator.">
          {balances.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">No Solana token balances indexed yet.</p>
          ) : (
            <div className="space-y-3">
              {balances.slice(0, 8).map((token) => (
                <div key={`${token.walletAddress}:${token.symbol ?? token.name ?? "token"}`} className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--settings-foreground-strong)]">
                      {token.symbol ?? token.name ?? "Unknown token"}
                    </p>
                    <p className="text-xs text-[var(--settings-foreground-muted)]">
                      {truncateMiddle(token.walletAddress)} · {token.balance.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                    {formatUsd(token.valueUsd)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel title="Automation guardrails" description="Master Solana autonomous mode plus action-specific toggles that feed the approval engine.">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">Solana autonomous mode</p>
                <p className="mt-1 text-sm text-[var(--settings-foreground-muted)]">
                  Risk profile: {automationSettings.riskTolerance}. Max auto-approved notional: {automationSettings.maxTransactionValueUsd ?? "n/a"} USD.
                </p>
              </div>
              <Switch
                checked={automationSettings.autonomousMode}
                onCheckedChange={(checked) => void updateMasterToggle(checked)}
              />
            </div>

            {AUTOMATION_ACTIONS.map((action) => (
              <div key={action.key} className="flex items-start justify-between gap-4 rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">{action.label}</p>
                  <p className="mt-1 text-sm text-[var(--settings-foreground-muted)]">{action.description}</p>
                </div>
                <Switch
                  checked={Boolean(automationSettings.autonomousActions[action.key])}
                  onCheckedChange={(checked) => void updateActionToggle(action.key, checked)}
                />
              </div>
            ))}
          </div>
        </SettingsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsPanel title="Tracked positions" description="Open Solana AgentKit positions and the latest stored PnL snapshot.">
          {positions.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">No Solana AgentKit positions have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {positions.slice(0, 8).map((position) => (
                <div key={position.id} className="rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                      {position.symbol ?? position.protocol ?? position.position_kind}
                    </p>
                    <Badge variant="outline">{position.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                    {position.protocol ?? "protocol n/a"} · {position.position_kind} · size {position.size ?? "n/a"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--settings-foreground-strong)]">
                    PnL {formatUsd(position.pnl_usd)} {position.pnl_percent ? `(${position.pnl_percent}%)` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                    Updated {formatDate(position.updated_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel title="Deployments" description="Recently launched tokens, collections, and other deployment artifacts captured by Solana AgentKit.">
          {deployments.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">No deployments have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {deployments.slice(0, 8).map((deployment) => (
                <div key={deployment.id} className="rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                      {deployment.symbol ?? deployment.name ?? deployment.deployment_type}
                    </p>
                    <Badge variant="outline">{deployment.deployment_type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                    Mint {truncateMiddle(deployment.mint)} · Created {formatDate(deployment.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsPanel title="AgentKit transactions" description="Successful AgentKit action log captured from the chat execution layer.">
          {data.history.transactions.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">No Solana AgentKit transactions have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.history.transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">{transaction.action_name}</p>
                    <Badge variant="outline">{transaction.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                    {transaction.protocol ?? "protocol n/a"} · {truncateMiddle(transaction.tx_signature)} · {formatDate(transaction.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel title="Wallet history" description="Recent Solana wallet events merged from the existing settings wallet history feed.">
          {data.history.events.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">No Solana wallet events are available yet.</p>
          ) : (
            <div className="space-y-3">
              {data.history.events.slice(0, 10).map((event) => (
                <div key={event.id} className="rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                      {event.type} {event.symbol ? `· ${event.symbol}` : ""}
                    </p>
                    <p className="text-xs text-[var(--settings-foreground-muted)]">{event.source}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                    {truncateMiddle(event.walletAddress)} · amount {event.amount ?? "n/a"} · {formatDate(event.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SettingsPanel title="Create automation task" description="Seed the background worker with a recurring Solana AgentKit action for this wallet context.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="solana-task-name">Task name</Label>
              <Input
                id="solana-task-name"
                value={taskName}
                onChange={(event) => setTaskName(event.target.value)}
                placeholder="Nightly LULO rebalance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solana-task-domain">Domain</Label>
              <Select
                value={taskDomain}
                onValueChange={(value) => {
                  setTaskDomain(value as (typeof TASK_DOMAIN_OPTIONS)[number]["value"]);
                  setTaskActionName(DEFAULT_ACTION_BY_DOMAIN[value]);
                }}
              >
                <SelectTrigger id="solana-task-domain" className="w-full">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_DOMAIN_OPTIONS.map((domain) => (
                    <SelectItem key={domain.value} value={domain.value}>
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="solana-task-interval">Interval seconds</Label>
              <Input
                id="solana-task-interval"
                type="number"
                min={60}
                step={60}
                value={taskIntervalSeconds}
                onChange={(event) => setTaskIntervalSeconds(event.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="solana-task-action">Action name</Label>
              <Input
                id="solana-task-action"
                value={taskActionName}
                onChange={(event) => setTaskActionName(event.target.value)}
                placeholder="TRANSFER"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="solana-task-wallet">Wallet override</Label>
              <Input
                id="solana-task-wallet"
                value={taskWalletAddress}
                onChange={(event) => setTaskWalletAddress(event.target.value)}
                placeholder={data.defaultWalletAddress ?? "Use default embedded Solana wallet"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="solana-task-params">Parameters JSON</Label>
              <Textarea
                id="solana-task-params"
                value={taskParameters}
                onChange={(event) => setTaskParameters(event.target.value)}
                className="min-h-[132px]"
                placeholder='{"tokenMint":"So11111111111111111111111111111111111111112"}'
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => void createTask()}
              disabled={taskMutationPending || taskName.trim().length === 0 || taskActionName.trim().length === 0}
            >
              {taskMutationPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create task
            </Button>
            <p className="text-xs text-[var(--settings-foreground-muted)]">
              New tasks default to the resolved embedded Solana wallet when no override is supplied.
            </p>
          </div>
        </SettingsPanel>

        <SettingsPanel title="Autonomous task queue" description="Persisted Solana AgentKit automation tasks intended for the background worker.">
          {data.automation.tasks.length === 0 ? (
            <p className="text-sm text-[var(--settings-foreground-muted)]">
              No Solana AgentKit automation tasks are scheduled yet. Toggle autonomous actions above, then create the first recurring task here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.automation.tasks.map((task) => (
                <div key={task.id} className="rounded-[12px] border border-[var(--settings-border)]/8 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">{task.name}</p>
                      <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                        {task.domain} · {task.action_name} · every {task.interval_seconds}s
                      </p>
                    </div>
                    <Badge variant="outline">{task.enabled ? "enabled" : "disabled"}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-[var(--settings-foreground-muted)]">
                    Last run {formatDate(task.last_run_at)} · next run {formatDate(task.next_run_at)}
                  </p>
                  {task.last_error ? (
                    <p className="mt-2 text-xs text-red-300">{task.last_error}</p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--settings-foreground-muted)]">Enabled</span>
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={(checked) => void toggleTask(task.id, checked)}
                        disabled={taskMutationPending}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => void deleteTask(task.id)}
                      disabled={taskMutationPending}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsPanel>
      </div>
    </SettingsPage>
  );
}
