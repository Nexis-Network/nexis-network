"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Loader2, Wallet } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AgentWalletCard } from "@/components/agents/agent-wallet-card";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentSummary = {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string | null;
};

type AgentWalletInfo = {
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
};

type AgentWithWallets = {
  agent: AgentSummary;
  wallets: AgentWalletInfo[];
};

export type WalletScopeTab = "user" | "agent";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function coerceString(value: UntypedJson, fallback = ""): string {
  return typeof value === "string" ? value : String(value ?? fallback);
}

function deserializeWalletInfo(raw: UntypedJson): AgentWalletInfo {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    UntypedJson
  >;
  const status = coerceString(r.status, "active").toLowerCase();

  return {
    address: coerceString(r.address),
    platform: coerceString(r.platform),
    chainId: (r.chainId ?? r.chain_id ?? 0) as number | string,
    label: typeof r.label === "string" ? r.label : null,
    status: (["active", "provisioning", "revoked"] as const).includes(
      status as "active",
    )
      ? (status as AgentWalletInfo["status"])
      : "active",
    generation: Number(r.generation ?? 1) || 1,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function normalizeAgentWalletGroups(value: unknown): AgentWithWallets[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;

      const rawAgent = isRecord(entry.agent) ? entry.agent : null;
      if (!rawAgent || typeof rawAgent.id !== "string" || rawAgent.id.length === 0) {
        return null;
      }

      const wallets = Array.isArray(entry.wallets)
        ? entry.wallets.map((wallet) => deserializeWalletInfo(wallet as UntypedJson))
        : [];

      if (wallets.length === 0) return null;

      return {
        agent: {
          id: rawAgent.id,
          name:
            typeof rawAgent.name === "string" && rawAgent.name.trim().length > 0
              ? rawAgent.name
              : "Unnamed Agent",
          description:
            typeof rawAgent.description === "string"
              ? rawAgent.description
              : null,
          ownerUserId:
            typeof rawAgent.ownerUserId === "string"
              ? rawAgent.ownerUserId
              : null,
        },
        wallets,
      } satisfies AgentWithWallets;
    })
    .filter((entry): entry is AgentWithWallets => entry !== null);
}

/* ------------------------------------------------------------------ */
/*  Hook: fetch agents with wallets via batch endpoint                  */
/* ------------------------------------------------------------------ */

function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  return userId;
}

function useAgentWalletsGrouped() {
  const currentUserId = useCurrentUserId();

  const { data: rawAgents, error, isLoading } = useQuery<AgentWithWallets[]>({
    queryKey: ["agent-list-for-sidebar"],
    queryFn: async () => {
      const res = await fetch("/api/agents/wallets/summary", {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return [];
      const json = (await res.json()) as Record<string, UntypedJson>;
      const rows = Array.isArray((json.data as Record<string, UntypedJson>)?.agents)
        ? ((json.data as Record<string, UntypedJson>).agents as UntypedJson[])
        : [];

      // Group by agent_id
      const agentMap = new Map<string, { agent: AgentSummary; wallets: AgentWalletInfo[] }>();

      for (const raw of rows) {
        const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, UntypedJson>;
        const agentId = coerceString(row.agent_id);
        if (!agentId) continue;

        const wallet = deserializeWalletInfo(row);

        const existing = agentMap.get(agentId);
        if (existing) {
          existing.wallets.push(wallet);
        } else {
          agentMap.set(agentId, {
            agent: {
              id: agentId,
              name: coerceString(row.agent_name ?? row.name, "Unnamed Agent"),
              description: typeof row.description === "string" ? row.description : null,
              ownerUserId: typeof row.owner_user_id === "string" ? row.owner_user_id : null,
            },
            wallets: [wallet],
          });
        }
      }

      return Array.from(agentMap.values()).filter((entry) => entry.wallets.length > 0);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const grouped = useMemo(() => normalizeAgentWalletGroups(rawAgents), [rawAgents]);

  const agents: AgentSummary[] = useMemo(
    () => grouped.map((g) => g.agent),
    [grouped],
  );

  return {
    agents,
    grouped,
    isLoading,
    error,
    currentUserId,
  };
}

/* ------------------------------------------------------------------ */
/*  Tab buttons                                                        */
/* ------------------------------------------------------------------ */

interface AgentWalletScopeTabsProps {
  activeTab: WalletScopeTab;
  onTabChange: (tab: WalletScopeTab) => void;
  agentCount: number;
}

function AgentWalletScopeTabs({
  activeTab,
  onTabChange,
  agentCount,
}: AgentWalletScopeTabsProps) {
  const t = useTranslations("app");

  const options = useMemo(
    () => [
      {
        value: "user" as const,
        label: t("walletTabs.userWallets"),
        icon: <Wallet className="h-3.5 w-3.5" />,
      },
      {
        value: "agent" as const,
        label: `${t("walletTabs.agentWallets")}${agentCount > 0 ? ` (${agentCount})` : ""}`,
        icon: <Bot className="h-3.5 w-3.5" />,
      },
    ],
    [t, agentCount],
  );

  return (
    <SegmentedTabs
      options={options}
      value={activeTab}
      onChange={onTabChange}
      size="sm"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Agent wallets content panel                                        */
/* ------------------------------------------------------------------ */

function AgentWalletsContent({
  grouped,
  isLoading,
  currentUserId,
}: {
  grouped: AgentWithWallets[];
  isLoading: boolean;
  currentUserId: string | null;
}) {
  const t = useTranslations("app");

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <Bot className="h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">{t("walletTabs.noAgentWallets")}</p>
        <p className="text-xs text-zinc-600">
          {t("walletTabs.createAgentToStart")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
      {grouped.map(({ agent, wallets }) => {
        // Determine ownership by comparing the agent's owner_user_id with the
        // current authenticated user. Only owners should see sensitive actions
        // like "Export Key".
        const isOwner =
          currentUserId !== null &&
          agent.ownerUserId !== null &&
          agent.ownerUserId === currentUserId;

        return (
          <div key={agent.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <Bot className="h-3.5 w-3.5 text-zinc-500" />
              <p className="text-xs font-medium text-zinc-400">{agent.name}</p>
              <span className="text-[10px] text-zinc-600">
                {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {wallets.map((wallet) => (
                <AgentWalletCard
                  key={`${agent.id}-${wallet.address}`}
                  wallet={wallet}
                  agentId={agent.id}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export interface AgentWalletTabsProps {
  activeTab: WalletScopeTab;
  onTabChange: (tab: WalletScopeTab) => void;
}

export function AgentWalletTabs({ activeTab, onTabChange }: AgentWalletTabsProps) {
  const { agents, grouped, isLoading, currentUserId } = useAgentWalletsGrouped();

  return (
    <>
      {agents.length > 0 && (
        <AgentWalletScopeTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          agentCount={grouped.length}
        />
      )}

      {activeTab === "agent" && (
        <AgentWalletsContent
          grouped={grouped}
          isLoading={isLoading}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

export { useAgentWalletsGrouped };
