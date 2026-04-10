"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  Bot,
  Building2,
  Coins,
  ReceiptText,
  Shield,
  Users,
  Vote,
  Wallet,
} from "lucide-react";

import type { DaoProposalsArtifactData } from "@/modules/ai/artifacts/dao-proposals";
import type { DaoTreasuryArtifactData } from "@/modules/ai/artifacts/dao-treasury";
import type { DaoWorkspaceArtifactData } from "@/modules/ai/artifacts/dao-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not indexed";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Pending";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SummaryMetric(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {props.label}
          </div>
          <div className="mt-2 text-xl font-medium">{props.value}</div>
        </div>
        <div className="rounded-full border border-border/60 bg-card/70 p-2 text-emerald-300">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyArtifactState(props: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-border/70 bg-card/40">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function DaoWorkspaceArtifactPanel(props: {
  data: DaoWorkspaceArtifactData | null;
}) {
  const overview = props.data?.overview;
  if (!overview) {
    return (
      <EmptyArtifactState
        title="DAO workspace is empty"
        description="Create, import, or sync a DAO from chat to populate the operational workspace."
      />
    );
  }

  const activeProposals = overview.proposals.filter(
    (proposal) => proposal.status === "active",
  );
  const primaryTreasury =
    overview.treasuries.find((treasury) => treasury.isPrimary) ??
    overview.treasuries[0] ??
    null;
  const enabledCapabilities = [
    overview.capabilities?.treasuryManagementEnabled ? "Treasury" : null,
    overview.capabilities?.proposalCreationEnabled ? "Proposals" : null,
    overview.capabilities?.votingEnabled ? "Voting" : null,
    overview.capabilities?.memberManagementEnabled ? "Members" : null,
    overview.capabilities?.agentAutomationEnabled ? "Automation" : null,
    overview.capabilities?.agentVotingEnabled ? "Agent voting" : null,
    overview.capabilities?.analyticsEnabled ? "Analytics" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {overview.dao.primaryChainFamily.toUpperCase()}
            </Badge>
            <Badge variant="outline">{overview.dao.ownershipMode}</Badge>
            <Badge variant="outline">{overview.dao.lifecycleState}</Badge>
            <Badge variant="outline">{overview.dao.importSource}</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{overview.dao.name}</CardTitle>
            <CardDescription>
              {props.data?.summary ??
                overview.dao.description ??
                "This DAO workspace consolidates proposals, treasury actions, memberships, capabilities, and sync state."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <SummaryMetric
            icon={Wallet}
            label="Treasury"
            value={formatCurrency(
              overview.directory?.treasuryValueUsd ??
                primaryTreasury?.totalValueUsd,
            )}
          />
          <SummaryMetric
            icon={Vote}
            label="Active Proposals"
            value={activeProposals.length}
          />
          <SummaryMetric
            icon={Users}
            label="Members"
            value={overview.members.filter((member) => member.isActive).length}
          />
          <SummaryMetric
            icon={Shield}
            label="Capabilities"
            value={`${enabledCapabilities.length}/7`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-emerald-300" />
              Chain Bindings
            </CardTitle>
            <CardDescription>
              OpenZeppelin Governor, Safe, Realms, and Squads references.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.bindings.slice(0, 3).map((binding) => (
              <div
                key={binding.id}
                className="rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{binding.chainFamily}</Badge>
                  <Badge variant="outline">{binding.chainRef}</Badge>
                  <Badge variant="outline">{binding.syncStatus}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {binding.governanceAddress ??
                    binding.realmAddress ??
                    binding.safeAddress ??
                    binding.squadsAddress ??
                    "No on-chain reference recorded yet."}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-emerald-300" />
              Agent Posture
            </CardTitle>
            <CardDescription>
              Scoped automation and approval posture for this DAO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>Linked agent: {overview.dao.linkedAgentId ?? "Unassigned"}</div>
            <div>
              Automation:{" "}
              {overview.capabilities?.agentAutomationEnabled
                ? "Scoped and enabled"
                : "Manual approvals only"}
            </div>
            <div>
              Voting:{" "}
              {overview.capabilities?.agentVotingEnabled
                ? "Agent voting enabled"
                : "Human vote required"}
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {enabledCapabilities.map((capability) => (
                <Badge
                  key={capability}
                  className="bg-emerald-500/15 text-emerald-300"
                >
                  {capability}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Continue Operating</CardTitle>
          <CardDescription>
            Open the full DAO workspace page or continue in chat with focused DAO tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href={`/daos/${overview.dao.id}`}>
              Open workspace
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/app?prompt=${encodeURIComponent(
                `Open the DAO workspace for ${overview.dao.name} and help me manage the next governance action.`,
              )}`}
            >
              Continue in chat
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function DaoProposalsArtifactPanel(props: {
  data: DaoProposalsArtifactData | null;
}) {
  if (!props.data) {
    return (
      <EmptyArtifactState
        title="No DAO proposals loaded"
        description="Fetch a DAO proposal list or draft a proposal from chat to open this panel."
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {props.data.chainFamily.toUpperCase()}
            </Badge>
            <Badge variant="outline">{props.data.proposals.length} proposals</Badge>
          </div>
          <CardTitle>{props.data.title}</CardTitle>
          <CardDescription>
            {props.data.summary ??
              `Proposal window, status, and vote totals for ${props.data.daoName}.`}
          </CardDescription>
        </CardHeader>
      </Card>

      {props.data.proposals.length === 0 ? (
        <EmptyArtifactState
          title="No proposals recorded"
          description="Draft the first proposal or import an existing on-chain proposal stream."
        />
      ) : null}

      {props.data.proposals.map((proposal) => (
        <Card key={proposal.id} className="border-border/60 bg-card/70">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{proposal.status}</Badge>
              <Badge variant="outline">{proposal.actions.length} actions</Badge>
            </div>
            <div>
              <CardTitle className="text-base">{proposal.title}</CardTitle>
              <CardDescription>{proposal.slug}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <div className="font-medium text-foreground">Voting window</div>
              <div>
                {formatDate(proposal.startAt)} to {formatDate(proposal.endAt)}
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Current totals</div>
              <div>
                For {proposal.forVotes ?? "0"} / Against{" "}
                {proposal.againstVotes ?? "0"} / Abstain{" "}
                {proposal.abstainVotes ?? "0"}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button asChild size="sm" variant="outline">
        <Link href={`/daos/${props.data.daoId}`}>
          Open full proposal workspace
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

export function DaoTreasuryArtifactPanel(props: {
  data: DaoTreasuryArtifactData | null;
}) {
  if (!props.data) {
    return (
      <EmptyArtifactState
        title="No DAO treasury data loaded"
        description="Create a treasury action or fetch a DAO treasury artifact from chat to populate this panel."
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {props.data.chainFamily.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {props.data.treasuries.length} treasuries
            </Badge>
            <Badge variant="outline">
              {props.data.actions.length} actions
            </Badge>
          </div>
          <CardTitle>{props.data.title}</CardTitle>
          <CardDescription>
            {props.data.summary ??
              `Safe and Squads treasury posture for ${props.data.daoName}.`}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="size-4 text-emerald-300" />
              Treasury Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {props.data.treasuries.map((treasury) => (
              <div
                key={treasury.id}
                className="rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{treasury.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {treasury.address}
                    </div>
                  </div>
                  <Badge variant={treasury.isPrimary ? "default" : "outline"}>
                    {treasury.isPrimary ? "Primary" : treasury.treasuryType}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {formatCurrency(treasury.totalValueUsd)} •{" "}
                  {treasury.controllingRole ?? "DAO controlled"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-emerald-300" />
              Treasury Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {props.data.actions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No treasury actions are queued yet.
              </div>
            ) : null}
            {props.data.actions.map((action) => (
              <div
                key={action.id}
                className="rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.actionType}
                    </div>
                  </div>
                  <Badge variant="outline">{action.status}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {action.targetAddress ?? "Programmatic execution"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Value: {action.valueBaseUnits ?? "0"} • Updated{" "}
                  {formatDate(action.updatedAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Button asChild size="sm" variant="outline">
        <Link href={`/daos/${props.data.daoId}`}>
          Open full treasury workspace
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
