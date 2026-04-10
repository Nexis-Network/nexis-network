"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  Clock3,
  Info,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { parseUnits } from "viem";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getActiveOrgId } from "@/modules/analytics/utils";

import {
  CHAIN_OPTIONS,
  ACCEPTED_ASSETS_BY_CHAIN,
  DEFAULT_CHAIN_REF,
  DEFAULT_ACCEPTED_ASSETS,
  type AssetOption,
} from "./campaign-create-console/chain-config";
import { HeroStat } from "./campaign-create-console/stat-card";
import { ControlToggle } from "./campaign-create-console/control-toggle";
import { ReadinessRow } from "./campaign-create-console/readiness-row";
import { SnapshotRow } from "./campaign-create-console/snapshot-row";
import { FlowStep } from "./campaign-create-console/flow-step";

type AgentListResponse = {
  ok?: boolean;
  items?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

const PANEL_CLASS =
  "settings-shell-card rounded-[var(--settings-panel-radius)] bg-[var(--settings-card-bg)] shadow-none";
const LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--settings-foreground-subtle)]";
const FIELD_CLASS =
  "h-11 rounded-[var(--settings-radius)] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out placeholder:text-[var(--settings-foreground-subtle)] focus-visible:border-ring focus-visible:ring-ring/30";
const TEXTAREA_CLASS =
  "min-h-[82px] rounded-[var(--settings-radius)] border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-3 py-2 text-sm text-[var(--settings-foreground-strong)] transition-colors duration-150 ease-out placeholder:text-[var(--settings-foreground-subtle)] focus-visible:border-ring focus-visible:ring-ring/30";

function toList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function toAmountAndUsd(rawAmount: string, usdPrice: number) {
  const normalized = rawAmount.trim();
  if (!/^\d*\.?\d+$/.test(normalized)) {
    return null;
  }
  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) {
    return null;
  }
  return { amount: normalized, usd: formatUsd(asNumber * usdPrice) };
}

function toBaseUnitsOrNull(rawAmount: string, decimals: number) {
  const normalized = rawAmount.trim();
  if (!normalized) return null;
  if (!/^\d*\.?\d+$/.test(normalized)) {
    throw new Error("Enter only numeric values for funding fields.");
  }
  return parseUnits(normalized, decimals).toString();
}

export function CampaignCreateConsole() {
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agents, setAgents] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);

  const [agentId, setAgentId] = useState("");
  const [chainRef, setChainRef] = useState(DEFAULT_CHAIN_REF);
  const [tokenStandard, setTokenStandard] = useState<"erc20" | "erc404">(
    "erc404",
  );
  const [acceptedAssets, setAcceptedAssets] = useState<string[]>(
    DEFAULT_ACCEPTED_ASSETS,
  );
  const [whitelistUsersRaw, setWhitelistUsersRaw] = useState("");
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [whitelistOnlyUntilTs, setWhitelistOnlyUntilTs] = useState("");
  const [bondingCurveEnabled, setBondingCurveEnabled] = useState(false);
  const [bondingCurveSlopeBps, setBondingCurveSlopeBps] = useState(500);
  const [perWalletCooldownSeconds, setPerWalletCooldownSeconds] = useState(30);
  const [maxContributors, setMaxContributors] = useState(0);
  const [targetAmount, setTargetAmount] = useState("1");
  const [minContributionAmount, setMinContributionAmount] = useState("0.001");
  const [maxContributionAmount, setMaxContributionAmount] = useState("0.1");
  const [valuationCapAmount, setValuationCapAmount] = useState("1000");
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [creatorBps, setCreatorBps] = useState(1000);
  const [operatorBps, setOperatorBps] = useState(500);
  const [requireVerifiedWallet, setRequireVerifiedWallet] = useState(false);
  const [blockSanctionedJurisdictions, setBlockSanctionedJurisdictions] =
    useState(true);
  const [requireAcknowledgedRisk, setRequireAcknowledgedRisk] = useState(true);

  const investorBps = useMemo(
    () => Math.max(0, 10_000 - creatorBps - operatorBps),
    [creatorBps, operatorBps],
  );
  const whitelistUsers = useMemo(
    () => toList(whitelistUsersRaw),
    [whitelistUsersRaw],
  );
  const selectedChain = useMemo(
    () =>
      CHAIN_OPTIONS.find((option) => option.value === chainRef) ??
      CHAIN_OPTIONS[0],
    [chainRef],
  );
  const chainAssets = useMemo(
    () => ACCEPTED_ASSETS_BY_CHAIN[chainRef] ?? [],
    [chainRef],
  );
  const selectedAcceptedAssets = useMemo(
    () => chainAssets.filter((asset) => acceptedAssets.includes(asset.id)),
    [acceptedAssets, chainAssets],
  );
  const accountingAsset = useMemo(
    () => selectedAcceptedAssets[0] ?? chainAssets[0] ?? null,
    [selectedAcceptedAssets, chainAssets],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      try {
        setLoadingAgents(true);
        const orgId = getActiveOrgId();
        const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
        const response = await fetch(`/api/agents/list${query}`, {
          method: "GET",
          headers: orgId ? { "x-org-id": orgId } : undefined,
          cache: "no-store",
        });

        const payload = (await response
          .json()
          .catch(() => null)) as AgentListResponse | null;
        if (!response.ok || !payload?.items) {
          throw new Error("Failed to load available agents.");
        }

        const normalized = payload.items
          .map((item) => ({ id: item.id, name: item.name, slug: item.slug }))
          .filter((item) => item.id && item.name);

        if (!cancelled) {
          setAgents(normalized);
          if (normalized.length > 0) {
            setAgentId((prev) => prev || (normalized[0]?.id ?? ""));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAgents([]);
          toast.error(
            error instanceof Error ? error.message : "Failed to load agents.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAgents(false);
        }
      }
    };

    void loadAgents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const defaults = (ACCEPTED_ASSETS_BY_CHAIN[chainRef] ?? [])
      .slice(0, 2)
      .map((item) => item.id);
    setAcceptedAssets(defaults);
  }, [chainRef]);

  const launchReadiness = useMemo(() => {
    const checks = [
      { label: "Agent selected", ok: Boolean(agentId) },
      { label: "Treasury set", ok: treasuryAddress.trim().length > 0 },
      { label: "At least one accepted asset", ok: acceptedAssets.length > 0 },
      {
        label: "Revenue split is valid",
        ok: creatorBps + operatorBps <= 10_000,
      },
    ];

    const completeCount = checks.filter((check) => check.ok).length;
    return { checks, completeCount, total: checks.length };
  }, [
    acceptedAssets.length,
    agentId,
    creatorBps,
    operatorBps,
    treasuryAddress,
  ]);

  const readinessProgress = useMemo(() => {
    if (launchReadiness.total === 0) return 0;
    return Math.round(
      (launchReadiness.completeCount / launchReadiness.total) * 100,
    );
  }, [launchReadiness.completeCount, launchReadiness.total]);

  return (
    <section className="w-full space-y-6 pb-6 text-[var(--settings-foreground-strong)] [&_svg]:text-[var(--settings-foreground-subtle)]">
      <header
        className={`${PANEL_CLASS} relative overflow-hidden px-6 py-6 sm:px-8`}
      >
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <Badge className="rounded-full border-white/[0.08] bg-[#1F1F1F] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#c4c4c4]">
                <Sparkles className="size-3 stroke-[1.5]" />
                Launchpad Studio
              </Badge>
              <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white sm:text-[34px]">
                Create Launch
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/68">
                Configure fundraising mechanics, compliance policies, and payout
                routes with an operator-grade setup flow designed for secure
                launch execution.
              </p>
            </div>

            <div className="rounded-[18px] border border-white/[0.06] bg-[#0f0f10] px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/58">
                Launch preset
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {tokenStandard === "erc404" ? "ERC-404 hybrid" : "ERC-20"}
              </p>
              <p className="text-xs text-white/60">
                {selectedChain.label} • Chain ID {selectedChain.chainIdLabel}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <HeroStat
              icon={<CircleDollarSign className="size-4 stroke-[1.5]" />}
              label="Accepted assets"
              value={String(acceptedAssets.length)}
              caption="Funding rails configured"
            />
            <HeroStat
              icon={<Users className="size-4 stroke-[1.5]" />}
              label="Whitelist"
              value={
                whitelistEnabled ? String(whitelistUsers.length) : "Disabled"
              }
              caption={
                whitelistEnabled
                  ? "Participants pre-approved"
                  : "Public contribution flow"
              }
            />
            <HeroStat
              icon={<Clock3 className="size-4 stroke-[1.5]" />}
              label="Investor share"
              value={`${investorBps} bps`}
              caption="Remaining after operator splits"
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                Launch Basics
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                Define launch chain, token format, and accepted contribution
                assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2.5">
                <Label htmlFor="campaign-agent" className={LABEL_CLASS}>
                  Agent
                </Label>
                <select
                  id="campaign-agent"
                  className={FIELD_CLASS}
                  value={agentId}
                  onChange={(event) => setAgentId(event.target.value)}
                  disabled={loadingAgents || agents.length === 0}
                >
                  {agents.length === 0 ? (
                    <option value="">No agents available</option>
                  ) : null}
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-chain"
                    label="Deployment Chain"
                    tooltip="Select the chain where launch contracts and settlement routes will run."
                    className={LABEL_CLASS}
                  />
                  <Select value={chainRef} onValueChange={setChainRef}>
                    <SelectTrigger id="campaign-chain" className="w-full h-11">
                      <span className="flex items-center gap-2">
                        <Image
                          src={selectedChain.icon}
                          alt={`${selectedChain.label} logo`}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-sm">
                          {selectedChain.label}{" "}
                          <span>(Chain ID {selectedChain.chainIdLabel})</span>
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {CHAIN_OPTIONS.map((chain) => (
                        <SelectItem key={chain.value} value={chain.value}>
                          <span className="flex items-center gap-2">
                            <Image
                              src={chain.icon}
                              alt={`${chain.label} logo`}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                            <span>
                              {chain.label}{" "}
                              <span>(Chain ID {chain.chainIdLabel})</span>
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-token-standard"
                    label="Token Standard"
                    tooltip="Choose ERC-20 for fungible supply or ERC-404 hybrid for mixed fungible/non-fungible behavior."
                    className={LABEL_CLASS}
                  />
                  <Select
                    value={tokenStandard}
                    onValueChange={(value) =>
                      setTokenStandard(value as "erc20" | "erc404")
                    }
                  >
                    <SelectTrigger id="campaign-token-standard" className="w-full h-11">
                      <span className="text-sm">
                        {tokenStandard === "erc404"
                          ? "ERC-404 Hybrid"
                          : "ERC-20"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erc404">
                        ERC-404 Hybrid
                      </SelectItem>
                      <SelectItem value="erc20">
                        ERC-20
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2.5">
                <LabelWithTooltip
                  htmlFor="campaign-assets"
                  label="Accepted Assets"
                  tooltip="Assets are filtered to your selected deployment chain. Select one or more to enable multi-asset contributions."
                  className={LABEL_CLASS}
                />
                <div
                  id="campaign-assets"
                  className="grid gap-2 rounded-md border border-white/[0.06] bg-[#1F1F1F] p-2 sm:grid-cols-2"
                >
                  {chainAssets.map((asset) => {
                    const selected = acceptedAssets.includes(asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() =>
                          setAcceptedAssets((previous) =>
                            selected
                              ? previous.filter((item) => item !== asset.id)
                              : [...previous, asset.id],
                          )
                        }
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                          selected
                            ? "border-white/20 bg-white/8 text-white"
                            : "border-white/[0.06] bg-[#191919] text-white/74 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Image
                            src={asset.icon}
                            alt={`${asset.symbol} logo`}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span className="text-sm font-medium">
                            {asset.symbol}
                          </span>
                        </span>
                        <span className="text-xs text-white/62">
                          {asset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-white/55">
                  {acceptedAssets.length} asset(s) selected for{" "}
                  {selectedChain.label}.
                </p>
              </div>

              <div className="grid gap-2.5">
                <LabelWithTooltip
                  htmlFor="campaign-whitelist-users"
                  label="Whitelist Users (comma-separated UUIDs)"
                  tooltip="Optional participant allowlist for invite-only phases. Use user UUIDs from your org records."
                  className={LABEL_CLASS}
                />
                <Textarea
                  id="campaign-whitelist-users"
                  rows={2}
                  className={`${TEXTAREA_CLASS} font-mono text-xs`}
                  value={whitelistUsersRaw}
                  onChange={(event) => setWhitelistUsersRaw(event.target.value)}
                />
                <p className="text-xs text-white/55">
                  Optional. {whitelistUsers.length} user(s) listed.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                Funding Economics
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                Set contribution bounds, valuation cap, and treasury routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-target"
                    label="Target Amount"
                    tooltip="Total contribution target entered in your primary accepted asset units."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="campaign-target"
                    className={`${FIELD_CLASS} text-base font-medium`}
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                    placeholder={
                      accountingAsset
                        ? `e.g. 1 ${accountingAsset.symbol}`
                        : "e.g. 1"
                    }
                  />
                  <AmountPreview
                    rawAmount={targetAmount}
                    assets={selectedAcceptedAssets}
                  />
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-min"
                    label="Min Contribution"
                    tooltip="Per-wallet minimum contribution in token units."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="campaign-min"
                    className={`${FIELD_CLASS} text-base font-medium`}
                    value={minContributionAmount}
                    onChange={(event) =>
                      setMinContributionAmount(event.target.value)
                    }
                    placeholder={
                      accountingAsset
                        ? `e.g. 0.01 ${accountingAsset.symbol}`
                        : "e.g. 0.01"
                    }
                  />
                  <AmountPreview
                    rawAmount={minContributionAmount}
                    assets={selectedAcceptedAssets}
                  />
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-max"
                    label="Max Contribution"
                    tooltip="Per-wallet cap in token units to limit concentration risk."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="campaign-max"
                    className={`${FIELD_CLASS} text-base font-medium`}
                    value={maxContributionAmount}
                    onChange={(event) =>
                      setMaxContributionAmount(event.target.value)
                    }
                    placeholder={
                      accountingAsset
                        ? `e.g. 10 ${accountingAsset.symbol}`
                        : "e.g. 10"
                    }
                  />
                  <AmountPreview
                    rawAmount={maxContributionAmount}
                    assets={selectedAcceptedAssets}
                  />
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="campaign-valuation"
                    label="Valuation Cap"
                    tooltip="Hard valuation ceiling entered in token units."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="campaign-valuation"
                    className={`${FIELD_CLASS} text-base font-medium`}
                    value={valuationCapAmount}
                    onChange={(event) =>
                      setValuationCapAmount(event.target.value)
                    }
                    placeholder={
                      accountingAsset
                        ? `e.g. 1000 ${accountingAsset.symbol}`
                        : "e.g. 1000"
                    }
                  />
                  <AmountPreview
                    rawAmount={valuationCapAmount}
                    assets={selectedAcceptedAssets}
                  />
                </div>
              </div>
              <p className="text-xs text-white/55">
                Values are entered in token units and converted to base units
                automatically at submission.
              </p>

              <div className="grid gap-2.5">
                <LabelWithTooltip
                  htmlFor="campaign-treasury"
                  label="Treasury Address"
                  tooltip="Primary payout address for launch proceeds and operator revenue routing."
                  className={LABEL_CLASS}
                />
                <Input
                  id="campaign-treasury"
                  className={`${FIELD_CLASS} font-mono text-xs`}
                  value={treasuryAddress}
                  onChange={(event) => setTreasuryAddress(event.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="creator-bps"
                    label="Creator BPS"
                    tooltip="Creator revenue share in basis points (100 bps = 1%)."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="creator-bps"
                    className={FIELD_CLASS}
                    type="number"
                    min={0}
                    max={10_000}
                    value={creatorBps}
                    onChange={(event) =>
                      setCreatorBps(
                        Math.max(
                          0,
                          Math.min(10_000, Number(event.target.value) || 0),
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="operator-bps"
                    label="Operator BPS"
                    tooltip="Operator revenue share in basis points for launch management."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="operator-bps"
                    className={FIELD_CLASS}
                    type="number"
                    min={0}
                    max={10_000}
                    value={operatorBps}
                    onChange={(event) =>
                      setOperatorBps(
                        Math.max(
                          0,
                          Math.min(10_000, Number(event.target.value) || 0),
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-2.5">
                  <LabelWithTooltip
                    htmlFor="investor-bps"
                    label="Investor BPS"
                    tooltip="Remaining allocation after creator and operator basis-point splits."
                    className={LABEL_CLASS}
                  />
                  <Input
                    id="investor-bps"
                    className={`${FIELD_CLASS} text-[#c4c4c4]`}
                    value={investorBps}
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                Controls & Compliance
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                Enable guardrails that govern participation, pacing, and risk
                acknowledgement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <ControlToggle
                  title="Whitelist Enabled"
                  description="Run an invite-only window before public participation."
                  checked={whitelistEnabled}
                  onCheckedChange={setWhitelistEnabled}
                  id="control-whitelist"
                />
                <ControlToggle
                  title="Bonding Curve"
                  description="Increase purchase pricing as participation rises."
                  checked={bondingCurveEnabled}
                  onCheckedChange={setBondingCurveEnabled}
                  id="control-bonding-enabled"
                />
                <ControlToggle
                  title="Require Verified Wallet"
                  description="Restrict contributions to verified wallets only."
                  checked={requireVerifiedWallet}
                  onCheckedChange={setRequireVerifiedWallet}
                  id="control-verified"
                />
                <ControlToggle
                  title="Block Sanctioned Jurisdictions"
                  description="Apply geographic policy checks prior to acceptance."
                  checked={blockSanctionedJurisdictions}
                  onCheckedChange={setBlockSanctionedJurisdictions}
                  id="control-sanctions"
                />
                <div className="md:col-span-2">
                  <ControlToggle
                    title="Require Risk Acknowledgement"
                    description="Require explicit investor risk consent before contribution."
                    checked={requireAcknowledgedRisk}
                    onCheckedChange={setRequireAcknowledgedRisk}
                    id="control-risk-ack"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2.5">
                  <Label
                    htmlFor="control-whitelist-until"
                    className={LABEL_CLASS}
                  >
                    Whitelist Until ISO TS
                  </Label>
                  <Input
                    id="control-whitelist-until"
                    className={`${FIELD_CLASS} font-mono text-xs`}
                    value={whitelistOnlyUntilTs}
                    onChange={(event) =>
                      setWhitelistOnlyUntilTs(event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label
                    htmlFor="control-bonding-slope"
                    className={LABEL_CLASS}
                  >
                    Bonding Slope BPS
                  </Label>
                  <Input
                    id="control-bonding-slope"
                    className={FIELD_CLASS}
                    type="number"
                    value={bondingCurveSlopeBps}
                    onChange={(event) =>
                      setBondingCurveSlopeBps(Number(event.target.value) || 0)
                    }
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label htmlFor="control-cooldown" className={LABEL_CLASS}>
                    Wallet Cooldown (s)
                  </Label>
                  <Input
                    id="control-cooldown"
                    className={FIELD_CLASS}
                    type="number"
                    value={perWalletCooldownSeconds}
                    onChange={(event) =>
                      setPerWalletCooldownSeconds(
                        Number(event.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2.5">
                  <Label
                    htmlFor="control-max-contributors"
                    className={LABEL_CLASS}
                  >
                    Max Contributors
                  </Label>
                  <Input
                    id="control-max-contributors"
                    className={FIELD_CLASS}
                    type="number"
                    value={maxContributors}
                    onChange={(event) =>
                      setMaxContributors(Number(event.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            className={`${PANEL_CLASS} flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5`}
          >
            <p className="max-w-xl text-xs leading-5 text-white/62">
              Launch creation stores policy and launch parameters as a draft
              profile. Deploy and contribution activation are handled from the
              dashboard and agent control surface.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-11 rounded-[16px] bg-[#c4c4c4] px-5 text-[#141414] transition-colors duration-150 ease-out hover:bg-white"
                disabled={submitting || !agentId || !treasuryAddress.trim()}
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    if (acceptedAssets.length === 0) {
                      throw new Error("Provide at least one accepted asset.");
                    }
                    if (!accountingAsset) {
                      throw new Error(
                        "Select at least one accepted asset before creating a launch.",
                      );
                    }
                    if (creatorBps + operatorBps > 10_000) {
                      throw new Error(
                        "Creator + operator BPS cannot exceed 10000.",
                      );
                    }
                    const targetBaseUnits = toBaseUnitsOrNull(
                      targetAmount,
                      accountingAsset.decimals,
                    );
                    const minContributionBaseUnits = toBaseUnitsOrNull(
                      minContributionAmount,
                      accountingAsset.decimals,
                    );
                    const maxContributionBaseUnits = toBaseUnitsOrNull(
                      maxContributionAmount,
                      accountingAsset.decimals,
                    );
                    const valuationCapBaseUnits = toBaseUnitsOrNull(
                      valuationCapAmount,
                      accountingAsset.decimals,
                    );
                    if (!targetBaseUnits || !minContributionBaseUnits) {
                      throw new Error(
                        "Target and minimum contribution are required.",
                      );
                    }

                    const response = await fetch(
                      `/api/agents/${agentId}/campaign/create`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          chainFamily: chainRef.startsWith("solana:")
                            ? "solana"
                            : "evm",
                          chainRef: chainRef.trim(),
                          tokenStandard,
                          acceptedAssets,
                          targetBaseUnits,
                          minContributionBaseUnits,
                          maxContributionBaseUnits,
                          valuationCapBaseUnits,
                          treasuryAddress: treasuryAddress.trim(),
                          launchControls: {
                            whitelistEnabled,
                            whitelistOnlyUntilTs:
                              whitelistOnlyUntilTs.trim() || null,
                            bondingCurveEnabled,
                            bondingCurveSlopeBps,
                            perWalletCooldownSeconds,
                            maxContributors,
                          },
                          compliancePolicy: {
                            requireVerifiedWallet,
                            blockSanctionedJurisdictions,
                            requireAcknowledgedRisk,
                          },
                          whitelistUsers,
                          revenuePolicy: {
                            creatorBps,
                            operatorBps,
                            investorBps,
                            creatorTreasury: treasuryAddress.trim(),
                            operatorTreasury: treasuryAddress.trim(),
                          },
                        }),
                      },
                    );

                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      throw new Error(
                        payload?.message ??
                          payload?.error ??
                          `Launch creation failed (${response.status})`,
                      );
                    }
                    toast.success("Launch created", {
                      description:
                        "Use the dashboard and agent page to deploy contracts and accept contributions.",
                    });
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to create launch.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? "Creating..." : "Create Launch"}
              </Button>
              <Link href="/launchpad/dashboard">
                <Button
                  variant="outline"
                  className="h-11 rounded-[16px] border-white/[0.08] bg-transparent px-5 text-white transition-colors duration-150 ease-out hover:bg-[#212121]"
                >
                  Go To Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium text-white">
                <Rocket className="size-4 stroke-[1.5]" />
                Launch readiness
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                {launchReadiness.completeCount}/{launchReadiness.total} critical
                checks complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#0FB983] transition-[width] duration-150 ease-out"
                  style={{ width: `${readinessProgress}%` }}
                />
              </div>
              <div className="space-y-2">
                {launchReadiness.checks.map((check) => (
                  <ReadinessRow
                    key={check.label}
                    label={check.label}
                    ok={check.ok}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                Launch Snapshot
              </CardTitle>
              <CardDescription className="text-sm text-white/62">
                Final parameters before you publish this launch profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SnapshotRow
                label="Target"
                value={`${targetAmount} ${accountingAsset?.symbol ?? ""}`.trim()}
              />
              <SnapshotRow
                label="Min / Max"
                value={`${minContributionAmount} / ${maxContributionAmount} ${accountingAsset?.symbol ?? ""}`.trim()}
              />
              <SnapshotRow
                label="Valuation cap"
                value={`${valuationCapAmount} ${accountingAsset?.symbol ?? ""}`.trim()}
              />
              <SnapshotRow
                label="Revenue split"
                value={`${creatorBps} / ${operatorBps} / ${investorBps} BPS`}
              />
              <div className="rounded-[16px] border border-white/[0.08] bg-[#1F1F1F] p-3 text-xs text-[#c4c4c4]">
                <p className="flex items-center gap-2 font-medium text-[#c4c4c4]">
                  <ShieldCheck className="size-4 stroke-[1.5]" />
                  Compliance profile
                </p>
                <p className="mt-1 leading-5 text-white/72">
                  Verified wallet:{" "}
                  {requireVerifiedWallet ? "Required" : "Optional"} • Sanction
                  block: {blockSanctionedJurisdictions ? "On" : "Off"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                Launch Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-white/64">
              <FlowStep
                number="01"
                text="Create launch profile and verify policy fields."
              />
              <FlowStep
                number="02"
                text="Deploy launch contracts from dashboard controls."
              />
              <FlowStep
                number="03"
                text="Open contributions and monitor receipts in real time."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function LabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  className,
}: {
  htmlFor?: string;
  label: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className={className}>
        {label}
      </Label>
      <span className={className}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-white/75 transition-colors hover:text-white"
              aria-label="Field help"
            >
              <Info className="size-3.5 stroke-[1.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 px-2 py-1.5 text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </span>
    </div>
  );
}

function AmountPreview({
  rawAmount,
  assets,
}: {
  rawAmount: string;
  assets: AssetOption[];
}) {
  if (assets.length === 0) {
    return (
      <p className="text-xs text-white/55">
        Select at least one accepted asset to view value preview.
      </p>
    );
  }
  const conversions = assets
    .map((asset) => ({
      asset,
      converted: toAmountAndUsd(rawAmount, asset.usdPrice),
    }))
    .filter(
      (
        item,
      ): item is {
        asset: AssetOption;
        converted: { amount: string; usd: string };
      } => item.converted !== null,
    );
  if (conversions.length === 0) {
    return (
      <p className="text-xs text-red-300/90">
        Enter a numeric value to preview token and USD equivalents.
      </p>
    );
  }
  return (
    <div className="space-y-1 text-xs text-white/62">
      {conversions.map(({ asset, converted }) => (
        <p key={asset.id}>
          {converted.amount} {asset.symbol} • {converted.usd}
        </p>
      ))}
    </div>
  );
}

