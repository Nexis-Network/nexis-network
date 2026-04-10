"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DetachedWallet = {
  id: string;
  agentId: string;
  agentName: string;
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  generation: number;
  detachedAt: string | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function coerceString(value: UntypedJson, fallback = ""): string {
  return typeof value === "string" ? value : String(value ?? fallback);
}

function coerceNumber(value: UntypedJson, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    evm: "EVM",
    solana: "Solana",
    cdp: "Nex Wallet",
    thirdweb: "Legacy Embedded",
    safe: "Smart Wallet",
  };
  return map[platform.toLowerCase()] ?? platform;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  const token = session?.access_token;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher: detached wallets (dedicated endpoint)                     */
/* ------------------------------------------------------------------ */

async function fetchDetachedWallets(
  signal?: AbortSignal,
): Promise<DetachedWallet[]> {
  const headers = await getAuthHeaders();

  // Single request to the dedicated detached wallets endpoint
  const res = await fetch("/api/agents/wallets/detached", {
    method: "GET",
    signal,
    cache: "no-store",
    headers,
  });

  if (res.status === 401) return [];
  if (!res.ok) return [];

  const payload = (await res.json()) as Record<string, UntypedJson>;
  const wallets = Array.isArray((payload.data as Record<string, UntypedJson>)?.wallets)
    ? ((payload.data as Record<string, UntypedJson>).wallets as UntypedJson[])
    : [];

  return wallets.map((raw) => {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      UntypedJson
    >;

    return {
      id: coerceString(r.id ?? r.address),
      agentId: coerceString(r.agent_id),
      agentName: coerceString(r.agent_name ?? r.label, "Unknown Agent"),
      address: coerceString(r.address),
      platform: coerceString(r.platform),
      chainId: r.chain_id ?? 0,
      label: typeof r.label === "string" ? r.label : null,
      generation: coerceNumber(r.generation, 1),
      detachedAt: typeof r.detached_at === "string" ? r.detached_at : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Detached Wallet Card (read-only)                                   */
/* ------------------------------------------------------------------ */

function DetachedWalletCard({ wallet }: { wallet: DetachedWallet }) {
  const handleCopy = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address).catch(() => {});
  };

  const detachedLabel = useMemo(() => {
    if (!wallet.detachedAt) return null;
    try {
      return new Date(wallet.detachedAt).toLocaleDateString();
    } catch {
      return wallet.detachedAt;
    }
  }, [wallet.detachedAt]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)]/70 p-3 opacity-70">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--settings-elevated)]/70 flex-shrink-0">
          <Archive className="h-3.5 w-3.5 text-[var(--bento-text-muted)]" />
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--bento-text-primary)] mono-value truncate">
              {truncateAddress(wallet.address)}
            </p>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-400/10 border-amber-400/20 text-amber-500"
            >
              Legacy
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {platformLabel(wallet.platform)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--bento-text-muted)]">
            <span>Agent: {wallet.agentName}</span>
            <span>Gen {wallet.generation}</span>
            {detachedLabel && <span>Detached {detachedLabel}</span>}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="h-7 w-7 flex items-center justify-center rounded-md text-[var(--bento-text-muted)] hover:text-[var(--bento-text-primary)] transition-colors flex-shrink-0"
        onClick={handleCopy}
        title="Copy address"
      >
        <CopyIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DetachedWalletsSection() {
  const {
    data: detachedWallets,
    isLoading,
    error,
  } = useQuery<DetachedWallet[], Error>({
    queryKey: ["detached-wallets-section"],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchDetachedWallets(signal),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const wallets = detachedWallets ?? [];

  // Don't render anything if no detached wallets and not loading
  if (!isLoading && !error && wallets.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full rounded-[20px] border border-[var(--bento-border)] bg-[var(--bento-card)]">
        <div className="flex items-center justify-between border-b border-[var(--bento-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-regular">Detached Wallets (Legacy)</h2>
            <p className="text-xs text-[var(--bento-text-muted)]">
              Read-only wallets from previous agent generations.
            </p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-[20px] border border-[var(--bento-border)] bg-[var(--bento-card)]">
        <div className="flex items-center justify-between border-b border-[var(--bento-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-regular">Detached Wallets (Legacy)</h2>
            <p className="text-xs text-[var(--bento-text-muted)]">
              Read-only wallets from previous agent generations.
            </p>
          </div>
        </div>
        <div className="px-4 py-4 text-center text-sm text-[var(--bento-text-muted)]">
          Failed to load detached wallets.
        </div>
      </div>
    );
  }

  return (
    <Collapsible>
      <div className="w-full rounded-[20px] border border-[var(--bento-border)] bg-[var(--bento-card)]">
        <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-[var(--bento-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--settings-elevated)]/60"
            >
            <div>
              <h2 className="text-sm font-regular">Detached Wallets (Legacy)</h2>
              <p className="text-xs text-[var(--bento-text-muted)]">
                Read-only wallets from previous agent generations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-500"
              >
                {wallets.length} legacy
              </Badge>
              <ChevronDown className="h-4 w-4 text-[var(--bento-text-muted)] transition-transform data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-2">
            {wallets.map((wallet: DetachedWallet) => (
              <DetachedWalletCard
                key={`${wallet.agentId}-${wallet.address}-${wallet.generation}`}
                wallet={wallet}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
