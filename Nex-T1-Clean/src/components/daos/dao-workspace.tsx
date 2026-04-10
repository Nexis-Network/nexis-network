"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  Bot,
  Link2,
  ReceiptText,
  Shield,
  Users,
  Vote,
  Wallet,
} from "lucide-react";

import type { DaoOverview } from "@/modules/daos/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not indexed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  const Icon = props.icon;
  return (
    <Card className="border-border/60 bg-background/50">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {props.label}
          </div>
          <div className="mt-2 text-2xl font-medium">{props.value}</div>
        </div>
        <div className="rounded-full border border-border/60 bg-card/80 p-2 text-emerald-300">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DaoWorkspace({ overview }: { overview: DaoOverview }) {
  const primaryTreasury = overview.treasuries.find((treasury) => treasury.isPrimary) ?? overview.treasuries[0] ?? null;
  const activeProposals = overview.proposals.filter((proposal) => proposal.status === "active");
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
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{overview.dao.primaryChainFamily.toUpperCase()}</Badge>
              <Badge variant="outline">{overview.dao.ownershipMode}</Badge>
              <Badge variant="outline">{overview.dao.lifecycleState}</Badge>
              <Badge variant="outline">{overview.dao.importSource}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">{overview.dao.name}</CardTitle>
              <CardDescription className="max-w-3xl text-base">
                {overview.dao.description ?? "This DAO is ready for proposals, treasury operations, member management, and agent-assisted governance."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Treasury"
              value={formatCurrency(
                overview.directory?.treasuryValueUsd ?? primaryTreasury?.totalValueUsd ?? null,
              )}
            />
            <StatCard
              icon={Vote}
              label="Active proposals"
              value={activeProposals.length}
            />
            <StatCard
              icon={Users}
              label="Members"
              value={overview.members.filter((member) => member.isActive).length}
            />
            <StatCard
              icon={Shield}
              label="Capabilities"
              value={`${enabledCapabilities.length}/7`}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>Operator Actions</CardTitle>
            <CardDescription>
              Use the guided `/app` flow for chain-specific deployment, imports, proposal drafting, and treasury execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild>
              <Link href={`/app?prompt=${encodeURIComponent(`Open the DAO workspace artifact for ${overview.dao.name} and help me create a proposal.`)}`}>
                Proposal via agent
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/app?prompt=${encodeURIComponent(`Prepare a treasury action artifact for DAO ${overview.dao.name}.`)}`}>
                Treasury via agent
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/app?prompt=${encodeURIComponent(`Help me import or sync the DAO ${overview.dao.name} on ${overview.dao.primaryChainFamily}.`)}`}>
                Import / sync via agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Chain bindings</CardTitle>
                <CardDescription>
                  Governance, Safe, timelock, Realms, and Squads attachments normalized across EVM and Solana.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.bindings.map((binding) => (
                  <div
                    key={binding.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{binding.chainFamily}</Badge>
                      <Badge variant="outline">{binding.chainRef}</Badge>
                      <Badge variant="outline">{binding.syncStatus}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {binding.governanceAddress ? <div>Governor: {binding.governanceAddress}</div> : null}
                      {binding.safeAddress ? <div>Safe: {binding.safeAddress}</div> : null}
                      {binding.timelockAddress ? <div>Timelock: {binding.timelockAddress}</div> : null}
                      {binding.realmAddress ? <div>Realm: {binding.realmAddress}</div> : null}
                      {binding.squadsAddress ? <div>Squads: {binding.squadsAddress}</div> : null}
                      {binding.tokenAddress ? <div>Token: {binding.tokenAddress}</div> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Enabled capabilities</CardTitle>
                <CardDescription>
                  App-level permissions layered over on-chain governance controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {enabledCapabilities.map((capability) => (
                  <Badge key={capability} className="bg-emerald-500/15 text-emerald-300">
                    {capability}
                  </Badge>
                ))}
                {enabledCapabilities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No app capabilities are enabled yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proposals">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Proposals</CardTitle>
              <CardDescription>
                Unified proposal state across OpenZeppelin Governor, Tally, and Realms imports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.proposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell>
                        <div className="font-medium">{proposal.title}</div>
                        <div className="text-xs text-muted-foreground">{proposal.slug}</div>
                      </TableCell>
                      <TableCell>{proposal.status}</TableCell>
                      <TableCell>
                        {formatDate(proposal.startAt)} - {formatDate(proposal.endAt)}
                      </TableCell>
                      <TableCell>
                        F {proposal.forVotes ?? "0"} / A {proposal.againstVotes ?? "0"} / Abst. {proposal.abstainVotes ?? "0"}
                      </TableCell>
                      <TableCell>{proposal.actions.length}</TableCell>
                    </TableRow>
                  ))}
                  {overview.proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No proposals recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treasury">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Treasuries</CardTitle>
                <CardDescription>
                  Safe and Squads treasury accounts linked to the DAO.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.treasuries.map((treasury) => (
                  <div
                    key={treasury.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{treasury.label}</div>
                        <div className="text-xs text-muted-foreground">{treasury.address}</div>
                      </div>
                      <Badge variant={treasury.isPrimary ? "default" : "outline"}>
                        {treasury.isPrimary ? "Primary" : treasury.treasuryType}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{treasury.chainFamily.toUpperCase()}</span>
                      <span>{treasury.controllingRole ?? "DAO controlled"}</span>
                      <span>{formatCurrency(treasury.totalValueUsd ?? null)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Treasury actions</CardTitle>
                <CardDescription>
                  Approval-gated value movements and treasury operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.treasuryActions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.actionType}</div>
                      </div>
                      <Badge variant="outline">{action.status}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Target: {action.targetAddress ?? "Programmatic execution"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Value: {action.valueBaseUnits ?? "0"}
                    </div>
                  </div>
                ))}
                {overview.treasuryActions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No treasury actions queued yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Members & council</CardTitle>
              <CardDescription>
                User, agent, and external wallet memberships normalized into one matrix.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identity</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Voting power</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.userId ?? member.agentId ?? member.walletAddress ?? member.id}
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{member.membershipType}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {member.walletAddress ?? "Managed internally"}
                      </TableCell>
                      <TableCell>{member.votingPower ?? "Not indexed"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Capabilities & automation</CardTitle>
              <CardDescription>
                CDP-scoped wallet authority, automation toggles, and app-layer policy flags.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {[
                { label: "Treasury management", enabled: overview.capabilities?.treasuryManagementEnabled },
                { label: "Proposal creation", enabled: overview.capabilities?.proposalCreationEnabled },
                { label: "Voting", enabled: overview.capabilities?.votingEnabled },
                { label: "Member management", enabled: overview.capabilities?.memberManagementEnabled },
                { label: "Agent automation", enabled: overview.capabilities?.agentAutomationEnabled },
                { label: "Agent voting", enabled: overview.capabilities?.agentVotingEnabled },
                { label: "Analytics", enabled: overview.capabilities?.analyticsEnabled },
                { label: "Import", enabled: overview.capabilities?.importEnabled },
              ].map(({ label, enabled }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3"
                >
                  <div className="font-medium">{label}</div>
                  <Badge variant={enabled ? "default" : "outline"}>
                    {enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Sync jobs, proposal events, treasury movements, imports, and operator changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.activity.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-border/60 bg-background/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{activity.activityType}</Badge>
                    {activity.chainFamily ? <Badge variant="secondary">{activity.chainFamily}</Badge> : null}
                  </div>
                  <div className="mt-2 font-medium">{activity.title}</div>
                  {activity.body ? (
                    <div className="mt-1 text-sm text-muted-foreground">{activity.body}</div>
                  ) : null}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              ))}
              {overview.activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No activity has been logged yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Governance config</CardTitle>
                <CardDescription>
                  Core contract and program references for the DAO lifecycle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>Governance model: {overview.dao.governanceModel}</div>
                <div>Treasury model: {overview.dao.treasuryModel}</div>
                <div>Created at: {formatDate(overview.dao.createdAt)}</div>
                <div>Linked agent: {overview.dao.linkedAgentId ?? "None"}</div>
                <div>Tags: {overview.dao.tags.join(", ") || "No tags"}</div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>Imports & sync jobs</CardTitle>
                <CardDescription>
                  Import receipts, sync queue state, and adapter status across chains.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.imports.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">Import {item.chainFamily.toUpperCase()}</div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Requested {formatDate(item.createdAt)}
                    </div>
                  </div>
                ))}
                {overview.syncJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{job.jobType}</div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Scheduled for {formatDate(job.scheduledFor)}
                    </div>
                  </div>
                ))}
                {overview.imports.length === 0 && overview.syncJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No imports or sync jobs are recorded yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-emerald-300" />
              Governance adapters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>EVM: OpenZeppelin Governor + Safe</div>
            <div>Solana: Realms + Squads</div>
            <div>Sync: Tally / Safe / Helius adapters</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4 text-emerald-300" />
              Agent posture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Ownership mode: {overview.dao.ownershipMode}</div>
            <div>Linked agent: {overview.dao.linkedAgentId ?? "Unassigned"}</div>
            <div>
              Automation: {overview.capabilities?.agentAutomationEnabled ? "Scoped & enabled" : "Manual only"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-4 text-emerald-300" />
              Treasury posture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Primary treasury: {primaryTreasury?.address ?? "Not configured"}</div>
            <div>Pending actions: {overview.treasuryActions.filter((item) => item.status !== "executed").length}</div>
            <div>Wallet model: {overview.dao.treasuryModel}</div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
