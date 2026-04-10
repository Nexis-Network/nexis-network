"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ExternalLink,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { encodeFunctionData, isAddress } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";

type CampaignListResponse = {
  ok: boolean;
  items: Array<{
    id: string;
    orgId: string;
    agentId: string;
    chainFamily: "evm" | "solana";
    chainRef: string;
    tokenStandard: "erc20" | "erc404";
    launchControls: Record<string, unknown>;
    compliancePolicy: Record<string, unknown>;
    riskScore: number;
    riskFlags: string[];
    acceptedAssets: string[];
    status: "draft" | "active" | "finalized" | "cancelled";
    campaignAddress: string | null;
    shareTokenAddress: string | null;
    treasuryAddress: string | null;
    targetBaseUnits: string;
    raisedBaseUnits: string;
    progressBps: number;
    closeTs: string | null;
    createdAt: string;
    updatedAt: string;
    agent: {
      id: string;
      slug: string;
      name: string;
      avatarUrl: string | null;
      visibility: "public" | "private" | "unlisted";
    };
    permissions: {
      isMember: boolean;
      canManage: boolean;
    };
    position: {
      sharesOwnedBaseUnits: string;
      principalBaseUnits: string;
      claimableBaseUnits: string;
      claimedBaseUnits: string;
    } | null;
  }>;
};

type Scope = "all" | "invested" | "managed";

const SCOPE_LABELS: Array<{ value: Scope; label: string }> = [
  { value: "all", label: "All" },
  { value: "invested", label: "Invested" },
  { value: "managed", label: "Managed" },
];

const explorerByChainId: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  56: "https://bscscan.com/tx/",
  137: "https://polygonscan.com/tx/",
  8453: "https://basescan.org/tx/",
  42161: "https://arbiscan.io/tx/",
};

function statusTone(
  status: CampaignListResponse["items"][number]["status"],
): string {
  if (status === "active") return "text-[#0FB983]";
  if (status === "finalized") return "text-[#B9F106]";
  if (status === "cancelled") return "text-[#FF4D4D]";
  return "text-[#9A9A9A]";
}

function parseChainIdFromRef(chainRef: string): number | null {
  const match = /^eip155:(\d+)$/.exec(chainRef.trim());
  if (!match) return null;
  return Number(match[1]);
}

function parseErc20AssetAddress(
  assetId: string,
  chainRef: string,
): `0x${string}` | null {
  const chainId = parseChainIdFromRef(chainRef);
  if (!chainId) return null;
  const match = /^eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})$/.exec(
    assetId.trim(),
  );
  if (!match) return null;
  if (Number(match[1]) !== chainId) return null;
  return match[2] as `0x${string}`;
}

function toTxExplorer(chainRef: string, txHash: string): string | null {
  const chainId = parseChainIdFromRef(chainRef);
  if (!chainId) return null;
  const prefix = explorerByChainId[chainId];
  if (!prefix) return null;
  return `${prefix}${txHash}`;
}

function detectJurisdictionCountryCode(): string | undefined {
  const locale =
    Intl.DateTimeFormat().resolvedOptions().locale ||
    (typeof navigator !== "undefined" ? navigator.language : "");
  const regionToken = locale.split("-").at(-1)?.trim() ?? "";
  if (!/^[A-Za-z]{2}$/.test(regionToken)) return undefined;
  return regionToken.toUpperCase();
}

function normalizeAssetOptions(
  item: CampaignListResponse["items"][number],
): string[] {
  if (item.acceptedAssets.length === 0) {
    return ["native"];
  }
  return item.acceptedAssets;
}

function formatBaseInteger(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sumBaseUnits(
  items: CampaignListResponse["items"],
  selector: (item: CampaignListResponse["items"][number]) => string,
): string {
  let total = 0n;
  for (const item of items) {
    const raw = selector(item);
    if (!/^\d+$/.test(raw)) continue;
    total += BigInt(raw);
  }
  return formatBaseInteger(total.toString());
}

const PANEL_CLASS =
  "settings-shell-card rounded-[var(--settings-panel-radius)] bg-[var(--settings-card-bg)] shadow-none";
const FIELD_CLASS =
  "h-10 rounded-[var(--settings-radius)] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out placeholder:text-[var(--settings-foreground-subtle)] focus-visible:border-ring focus-visible:ring-ring/30";
const SELECT_CLASS =
  "h-10 w-full rounded-[var(--settings-radius)] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 text-xs text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out focus-visible:border-ring focus-visible:outline-none focus-visible:ring-ring/30";

export function LaunchpadCampaignDashboard() {
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CampaignListResponse["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributeDraftById, setContributeDraftById] = useState<
    Record<string, string>
  >({});
  const [contributeTxById, setContributeTxById] = useState<
    Record<string, string>
  >({});
  const [selectedAssetById, setSelectedAssetById] = useState<
    Record<string, string>
  >({});
  const [claimDraftById, setClaimDraftById] = useState<Record<string, string>>(
    {},
  );
  const [claimTxById, setClaimTxById] = useState<Record<string, string>>({});
  const [latestTxById, setLatestTxById] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isEvmConnected, address, chainId, switchChain } =
    useConnectEoaWallet();

  const loadCampaigns = useCallback(async (nextScope: Scope) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/launchpad/campaigns?scope=${nextScope}&status=active,finalized,draft`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as CampaignListResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("Failed to load launchpad campaigns.");
      }
      setItems(payload.items);
      setContributeDraftById((prev) => {
        const next = { ...prev };
        for (const item of payload.items) {
          if (!next[item.id]) next[item.id] = "1000000000000000";
        }
        return next;
      });
      setSelectedAssetById((prev) => {
        const next = { ...prev };
        for (const item of payload.items) {
          if (!next[item.id]) {
            const options = normalizeAssetOptions(item);
            next[item.id] = options[0] ?? "native";
          }
        }
        return next;
      });
    } catch (fetchError) {
      setItems([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load launchpad campaigns.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns(scope);
  }, [loadCampaigns, scope]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      return (
        item.agent.name.toLowerCase().includes(normalized) ||
        item.agent.slug.toLowerCase().includes(normalized) ||
        item.chainRef.toLowerCase().includes(normalized) ||
        item.status.toLowerCase().includes(normalized)
      );
    });
  }, [items, query]);

  const dashboardStats = useMemo(() => {
    const activeCount = filtered.filter(
      (item) => item.status === "active",
    ).length;
    const managedCount = filtered.filter(
      (item) => item.permissions.canManage,
    ).length;
    const totalRaised = sumBaseUnits(filtered, (item) => item.raisedBaseUnits);
    const totalClaimable = sumBaseUnits(
      filtered.filter((item) => Boolean(item.position)),
      (item) => item.position?.claimableBaseUnits ?? "0",
    );

    return { activeCount, managedCount, totalRaised, totalClaimable };
  }, [filtered]);

  const postContribute = useCallback(
    async (
      item: CampaignListResponse["items"][number],
      assetId: string,
      amountBaseUnits: string,
      txHash?: string,
    ) => {
      const response = await fetch(
        `/api/agents/${item.agentId}/campaign/contribute`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId: item.id,
            networkId: item.chainRef,
            assetId,
            amountBaseUnits,
            txHash,
            idempotencyKey: crypto.randomUUID(),
            riskAcknowledged: true,
            jurisdictionCountryCode: detectJurisdictionCountryCode(),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ??
            payload?.error ??
            `Contribution failed (${response.status})`,
        );
      }
    },
    [],
  );

  const handleContributeApi = useCallback(
    async (item: CampaignListResponse["items"][number]) => {
      const draft = (contributeDraftById[item.id] ?? "").trim();
      if (!/^\d+$/.test(draft)) {
        throw new Error("Contribution must be a base-unit integer.");
      }
      const txHash = (contributeTxById[item.id] ?? "").trim();
      if (
        txHash &&
        !/^0x[a-fA-F0-9]{64}$/.test(txHash) &&
        !/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(txHash)
      ) {
        throw new Error(
          "Contribution tx hash must be an EVM hash or Solana signature.",
        );
      }
      const selectedAsset = selectedAssetById[item.id] ?? "native";
      setPendingAction(`api-contribute:${item.id}`);
      try {
        await postContribute(item, selectedAsset, draft, txHash || undefined);
        if (txHash) {
          setLatestTxById((prev) => ({ ...prev, [item.id]: txHash }));
        }
        toast.success("Contribution submitted", {
          description: "Campaign position updated.",
        });
        await loadCampaigns(scope);
      } finally {
        setPendingAction(null);
      }
    },
    [
      contributeDraftById,
      contributeTxById,
      loadCampaigns,
      postContribute,
      scope,
      selectedAssetById,
    ],
  );

  const handleContributeWallet = useCallback(
    async (item: CampaignListResponse["items"][number]) => {
      if (!isEvmConnected || !walletClient || !address) {
        throw new Error(
          "Connect an EVM wallet before sending a signed contribution.",
        );
      }

      const chainIdFromRef = parseChainIdFromRef(item.chainRef);
      if (!chainIdFromRef) {
        throw new Error(
          "Wallet-signed contribution currently supports EVM campaigns only.",
        );
      }

      const amountBaseUnits = (contributeDraftById[item.id] ?? "").trim();
      if (!/^\d+$/.test(amountBaseUnits)) {
        throw new Error(
          "Contribution amount must be a base-unit integer string.",
        );
      }
      const amountWei = BigInt(amountBaseUnits);

      if (chainId !== chainIdFromRef) {
        await switchChain(chainIdFromRef);
      }

      const selectedAsset = selectedAssetById[item.id] ?? "native";
      const campaignAddress = item.campaignAddress;
      const treasuryAddress = item.treasuryAddress;
      const txDestination = (campaignAddress ?? treasuryAddress) as
        | `0x${string}`
        | null;
      if (!txDestination || !isAddress(txDestination)) {
        throw new Error("Campaign destination address is missing or invalid.");
      }

      setPendingAction(`wallet-contribute:${item.id}`);
      try {
        let txHash: `0x${string}`;
        if (selectedAsset === "native") {
          txHash = await walletClient.sendTransaction({
            account: address as `0x${string}`,
            to: txDestination,
            data: campaignAddress
              ? encodeFunctionData({
                  abi: [
                    {
                      type: "function",
                      name: "contribute",
                      stateMutability: "payable",
                      inputs: [],
                      outputs: [],
                    },
                  ],
                  functionName: "contribute",
                })
              : undefined,
            value: amountWei,
          });
        } else {
          const tokenAddress = parseErc20AssetAddress(
            selectedAsset,
            item.chainRef,
          );
          if (!tokenAddress) {
            throw new Error(
              "Selected asset is not a supported EVM ERC-20 CAIP-19 identifier.",
            );
          }
          txHash = await walletClient.sendTransaction({
            account: address as `0x${string}`,
            to: tokenAddress,
            data: encodeFunctionData({
              abi: [
                {
                  type: "function",
                  name: "transfer",
                  stateMutability: "nonpayable",
                  inputs: [
                    { name: "to", type: "address" },
                    { name: "amount", type: "uint256" },
                  ],
                  outputs: [{ name: "", type: "bool" }],
                },
              ],
              functionName: "transfer",
              args: [txDestination, amountWei],
            }),
            value: 0n,
          });
        }

        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
          });
          if (receipt.status !== "success") {
            throw new Error("Contribution transaction failed on-chain.");
          }
        }

        await postContribute(item, selectedAsset, amountBaseUnits, txHash);
        setLatestTxById((prev) => ({ ...prev, [item.id]: txHash }));
        toast.success("Contribution confirmed", {
          description: `Tx ${txHash.slice(0, 10)}… recorded.`,
        });
        await loadCampaigns(scope);
      } finally {
        setPendingAction(null);
      }
    },
    [
      address,
      chainId,
      contributeDraftById,
      isEvmConnected,
      loadCampaigns,
      postContribute,
      publicClient,
      scope,
      selectedAssetById,
      switchChain,
      walletClient,
    ],
  );

  const handleClaim = useCallback(
    async (item: CampaignListResponse["items"][number]) => {
      const claimBaseUnits = (claimDraftById[item.id] ?? "").trim();
      const txHash = (claimTxById[item.id] ?? "").trim();

      if (claimBaseUnits && !/^\d+$/.test(claimBaseUnits)) {
        throw new Error("Claim amount must be a base-unit integer.");
      }
      if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        throw new Error("Claim tx hash must be a valid 0x transaction hash.");
      }

      setPendingAction(`claim:${item.id}`);
      try {
        const response = await fetch(
          `/api/agents/${item.agentId}/campaign/claim`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              campaignId: item.id,
              networkId: item.chainRef,
              assetId: "native",
              claimBaseUnits: claimBaseUnits || undefined,
              txHash: txHash || undefined,
              idempotencyKey: crypto.randomUUID(),
            }),
          },
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message ??
              payload?.error ??
              `Claim failed (${response.status})`,
          );
        }

        if (txHash) {
          setLatestTxById((prev) => ({ ...prev, [item.id]: txHash }));
        }
        toast.success("Claim recorded", {
          description: `Claimed ${payload?.claim?.amountBaseUnits ?? "funds"}.`,
        });
        await loadCampaigns(scope);
      } finally {
        setPendingAction(null);
      }
    },
    [claimDraftById, claimTxById, loadCampaigns, scope],
  );

  return (
    <section className="w-full space-y-6 pb-6 text-[var(--settings-foreground-strong)] [&_svg]:text-[var(--settings-foreground-subtle)]">
      <header
        className={`${PANEL_CLASS} relative overflow-hidden px-6 py-6 sm:px-8`}
      >
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="rounded-full border-white/[0.08] bg-[#1F1F1F] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#c4c4c4]">
                <Rocket className="size-3 stroke-[1.5]" />
                AI Agent Launchpad
              </Badge>
              <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white sm:text-[34px]">
                Campaign Dashboard
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-white/68">
                Discover, invest in, and manage campaign positions with a single
                operating surface for contributors and campaign managers.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/agents/new">
                <Button className="h-11 rounded-[16px] bg-[#c4c4c4] px-5 text-[#141414] transition-colors duration-150 ease-out hover:bg-white">
                  Create Agent
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-11 rounded-[16px] border-white/[0.08] bg-transparent px-4 text-white transition-colors duration-150 ease-out hover:bg-[#212121]"
                onClick={() => void loadCampaigns(scope)}
                disabled={loading}
              >
                <RefreshCw className="size-4 stroke-[1.5]" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Active campaigns"
              value={String(dashboardStats.activeCount)}
              icon={<Activity className="size-4 stroke-[1.5]" />}
            />
            <KpiCard
              label="Managed by you"
              value={String(dashboardStats.managedCount)}
              icon={<ShieldCheck className="size-4 stroke-[1.5]" />}
            />
            <KpiCard
              label="Total raised"
              value={dashboardStats.totalRaised}
              icon={<Rocket className="size-4 stroke-[1.5]" />}
            />
            <KpiCard
              label="Claimable"
              value={dashboardStats.totalClaimable}
              icon={<Wallet className="size-4 stroke-[1.5]" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SCOPE_LABELS.map((entry) => (
              <Button
                key={entry.value}
                variant="outline"
                className={
                  scope === entry.value
                    ? "h-9 rounded-full border-white/[0.08] bg-[#212121] px-4 text-white hover:bg-[#212121]"
                    : "h-9 rounded-full border-white/[0.08] bg-transparent px-4 text-[#c4c4c4] hover:bg-[#212121] hover:text-white"
                }
                onClick={() => setScope(entry.value)}
              >
                {entry.label}
              </Button>
            ))}
            <div className="relative ml-auto w-full min-w-[260px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/42" />
              <Input
                className={`${FIELD_CLASS} pl-9`}
                placeholder="Search agent, slug, chain, status"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-white">
              Unable to load campaigns
            </CardTitle>
            <CardDescription className="text-sm text-white/62">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className={PANEL_CLASS}>
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-3/5 rounded bg-white/[0.06]" />
                <Skeleton className="h-3 w-2/5 rounded bg-white/[0.06]" />
                <Skeleton className="h-2 w-full rounded-full bg-white/[0.06]" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-9 w-full rounded-[14px] bg-white/[0.06]" />
                <Skeleton className="h-9 w-full rounded-[14px] bg-white/[0.06]" />
                <Skeleton className="h-9 w-2/3 rounded-[14px] bg-white/[0.06]" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className={`${PANEL_CLASS} md:col-span-2 xl:col-span-3`}>
            <CardHeader>
              <CardTitle className="text-white">
                No campaigns available
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                Try a different filter scope, or create a new campaign from an
                agent detail page.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          filtered.map((item) => {
            const txHash = latestTxById[item.id] ?? null;
            const explorerHref = txHash
              ? toTxExplorer(item.chainRef, txHash)
              : null;
            const assetOptions = normalizeAssetOptions(item);
            const progress = Math.max(2, Math.min(100, item.progressBps / 100));

            return (
              <Card key={item.id} className={PANEL_CLASS}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-medium text-white">
                        {item.agent.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-white/58">
                        {item.agent.slug} • {item.chainRef}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`border-white/[0.08] bg-[#1F1F1F] text-[10px] uppercase tracking-[0.15em] ${statusTone(item.status)}`}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/56">
                      <span>Raised</span>
                      <span className="font-mono text-white/84">
                        {formatBaseInteger(item.raisedBaseUnits)} /{" "}
                        {formatBaseInteger(item.targetBaseUnits)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#0FB983] transition-[width] duration-150 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="border-[#0FB983]/24 bg-[#0FB983]/10 text-[#0FB983]"
                    >
                      Risk {item.riskScore}/100
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-white/[0.08] bg-[#1F1F1F] text-white/62"
                    >
                      {(item.tokenStandard ?? "erc20").toUpperCase()}
                    </Badge>
                  </div>

                  {(item.riskFlags ?? []).length > 0 ? (
                    <p className="text-xs text-[#FF4D4D]">
                      Flags: {(item.riskFlags ?? []).join(", ")}
                    </p>
                  ) : null}

                  {item.position ? (
                    <div className="rounded-[14px] border border-[#0FB983]/24 bg-[#0FB983]/10 px-3 py-2 text-xs text-white/84">
                      Your claimable:{" "}
                      <span className="font-mono text-[#0FB983]">
                        {formatBaseInteger(item.position.claimableBaseUnits)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/56">
                      No investor position yet.
                    </p>
                  )}

                  {item.status === "active" ? (
                    <div className="space-y-2 rounded-[16px] border border-white/[0.06] bg-[#151515] p-3">
                      <Label className="text-[11px] uppercase tracking-[0.14em] text-white/58">
                        Contribution Asset
                      </Label>
                      <select
                        className={SELECT_CLASS}
                        value={
                          selectedAssetById[item.id] ??
                          assetOptions[0] ??
                          "native"
                        }
                        onChange={(event) =>
                          setSelectedAssetById((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        {assetOptions.map((asset) => (
                          <option key={asset} value={asset}>
                            {asset}
                          </option>
                        ))}
                      </select>
                      <Input
                        className={FIELD_CLASS}
                        placeholder="Contribution amount (base units)"
                        value={contributeDraftById[item.id] ?? ""}
                        onChange={(event) =>
                          setContributeDraftById((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <Input
                        className={FIELD_CLASS}
                        placeholder="Contribution tx hash/signature (optional)"
                        value={contributeTxById[item.id] ?? ""}
                        onChange={(event) =>
                          setContributeTxById((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-[14px] border-white/[0.08] bg-transparent text-white/85 hover:bg-[#212121]"
                          disabled={pendingAction !== null}
                          onClick={() => {
                            void (async () => {
                              try {
                                await handleContributeApi(item);
                              } catch (actionError) {
                                toast.error(
                                  actionError instanceof Error
                                    ? actionError.message
                                    : "Contribution failed.",
                                );
                              }
                            })();
                          }}
                        >
                          Contribute (API)
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-[14px] bg-[#c4c4c4] text-[#141414] hover:bg-white"
                          disabled={pendingAction !== null}
                          onClick={() => {
                            void (async () => {
                              try {
                                await handleContributeWallet(item);
                              } catch (actionError) {
                                toast.error(
                                  actionError instanceof Error
                                    ? actionError.message
                                    : "Wallet contribution failed.",
                                );
                              }
                            })();
                          }}
                        >
                          Contribute (Wallet)
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 rounded-[16px] border border-white/[0.06] bg-[#151515] p-3">
                    <Label className="text-[11px] uppercase tracking-[0.14em] text-white/58">
                      Claim Revenue
                    </Label>
                    <Input
                      className={FIELD_CLASS}
                      placeholder="Claim amount (base units, optional)"
                      value={claimDraftById[item.id] ?? ""}
                      onChange={(event) =>
                        setClaimDraftById((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                    <Input
                      className={FIELD_CLASS}
                      placeholder="Claim tx hash (optional, for on-chain verification)"
                      value={claimTxById[item.id] ?? ""}
                      onChange={(event) =>
                        setClaimTxById((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-[14px] bg-[#0FB983]/90 text-white hover:bg-[#0FB983]"
                      disabled={pendingAction !== null}
                      onClick={() => {
                        void (async () => {
                          try {
                            await handleClaim(item);
                          } catch (actionError) {
                            toast.error(
                              actionError instanceof Error
                                ? actionError.message
                                : "Claim failed.",
                            );
                          }
                        })();
                      }}
                    >
                      Claim Revenue
                    </Button>
                  </div>

                  {txHash ? (
                    <div className="flex items-center gap-2 text-xs text-[#0FB983]">
                      <span>Latest tx: {txHash.slice(0, 10)}…</span>
                      {explorerHref ? (
                        <a
                          href={explorerHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline"
                        >
                          Explorer{" "}
                          <ExternalLink className="size-3 stroke-[1.5]" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href={`/agents/${item.agentId}`}>
                      <Button
                        size="sm"
                        className="rounded-[14px] bg-[#c4c4c4] text-[#141414] hover:bg-white"
                      >
                        Open Agent
                      </Button>
                    </Link>
                    <Link href={`/agents/${item.agentId}?campaign=${item.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-[14px] border-white/[0.08] bg-transparent text-white/85 hover:bg-[#212121]"
                      >
                        Receipt Timeline
                      </Button>
                    </Link>
                    {item.permissions.canManage ? (
                      <Link href={`/agents/${item.agentId}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-[14px] border-white/[0.08] bg-transparent text-white/85 hover:bg-[#212121]"
                        >
                          Manage Campaign
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-[#171717] px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/56">
          {label}
        </p>
        <div className="text-[#c4c4c4]">{icon}</div>
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}
