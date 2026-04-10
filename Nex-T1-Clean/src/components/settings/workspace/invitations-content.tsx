"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";

import { ClippedAreaChart } from "@/components/ui/clipped-area-chart";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils/number";
import {
  BentoCard,
  BentoCardHeader,
} from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

type InvitationRow = {
  id: string;
  email: string | null;
  status: "signed_up" | "sent" | "expired";
  code: string;
  xpAwarded: number;
  sentAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  metadata: Record<string, UntypedJson>;
};

type InvitationsResponse = {
  code: string;
  inviteUrl: string;
  xp: {
    total: number;
    xpPerSuccess: number;
    totalSuccesses: number;
    level: number;
    currentThreshold: number;
    nextThreshold: number | null;
    progress: number;
    thresholds: number[];
  };
  codeMetadata: {
    createdAt: string | null;
    updatedAt: string | null;
    lastRegeneratedAt: string | null;
  };
  chart: {
    series: { monthLabel: string; iso: string; count: number; xp: number }[];
    totalXp: number;
    totalSuccesses: number;
    startMonth: string;
    endMonth: string;
  };
  invitations: InvitationRow[];
};

async function fetchInvitations(): Promise<InvitationsResponse> {
  const response = await fetch("/api/settings/invitations", {
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to load invitations");
  }
  return response.json();
}

async function createInvitation(email: string) {
  const response = await fetch("/api/settings/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to create invitation");
  }
}

async function regenerateCode() {
  const response = await fetch("/api/settings/invitations/regenerate", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Unable to regenerate code");
  }
  const payload = await response.json().catch(() => ({}));
  return payload?.code as string | undefined;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function statusBadge(status: InvitationRow["status"]) {
  switch (status) {
    case "signed_up":
      return { label: "Signed up", variant: "default" as const };
    case "expired":
      return { label: "Expired", variant: "destructive" as const };
    default:
      return { label: "Sent", variant: "secondary" as const };
  }
}

export default function InvitationsPage() {
  const [emailInput, setEmailInput] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["settings", "invitations"],
    queryFn: fetchInvitations,
    // Auth is enforced server-side by app/(authenticated)/layout.tsx
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: (email: string) => createInvitation(email),
    onSuccess: async () => {
      toast.success("Invitation created");
      setEmailInput("");
      await refetch();
    },
    onError: (err: UntypedJson) => {
      toast.error(
        err instanceof Error ? err.message : "Unable to create invitation",
      );
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateCode,
    onSuccess: async () => {
      toast.success("Invitation code refreshed");
      await refetch();
    },
    onError: (err: UntypedJson) => {
      toast.error(
        err instanceof Error ? err.message : "Unable to regenerate code",
      );
    },
  });

  const xpData: InvitationsResponse["xp"] = data?.xp ?? {
    total: 0,
    xpPerSuccess: 0,
    totalSuccesses: 0,
    level: 1,
    currentThreshold: 0,
    nextThreshold: null,
    progress: 0,
    thresholds: [],
  };

  const chartData: InvitationsResponse["chart"] = data?.chart ?? {
    series: [],
    totalXp: 0,
    totalSuccesses: 0,
    startMonth: "",
    endMonth: "",
  };

  const codeMetadata: InvitationsResponse["codeMetadata"] =
    data?.codeMetadata ?? {
      createdAt: null,
      updatedAt: null,
      lastRegeneratedAt: null,
    };

  const invitations: InvitationRow[] = Array.isArray(data?.invitations)
    ? data.invitations
    : [];
  const inviteCode = typeof data?.code === "string" ? data.code : "";
  const inviteUrl = typeof data?.inviteUrl === "string" ? data.inviteUrl : "";

  const chartPoints = useMemo(() => {
    if (!Array.isArray(chartData.series)) return [];
    return chartData.series.map((point) => ({
      label: point.monthLabel,
      value: point.count,
    }));
  }, [chartData.series]);

  const progressPercent = Math.round(
    Math.min(Math.max((xpData.progress ?? 0) * 100, 0), 100),
  );
  const remainingXp =
    xpData.nextThreshold != null
      ? Math.max(xpData.nextThreshold - xpData.total, 0)
      : 0;

  const headlineValue = formatNumber(chartData.totalXp ?? 0, {
    maximumFractionDigits: 0,
  });
  const secondaryValue = formatNumber(chartData.totalSuccesses ?? 0, {
    maximumFractionDigits: 0,
  });

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Unable to copy invite link");
    }
  }

  const handleCreateInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailInput.trim()) {
      toast.error("Please provide an email address");
      return;
    }
    createMutation.mutate(emailInput.trim());
  };

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Referrals"
        description="Share your invite code, track referrals, and earn XP when teammates join."
      />

      {isLoading ? (
        <BentoCard>
          <div className="flex h-48 items-center justify-center text-sm text-[var(--bento-text-muted)]">
            Loading referral insights…
          </div>
        </BentoCard>
      ) : error ? (
        <BentoCard>
          <div className="flex h-48 items-center justify-center text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Unable to load referrals"}
          </div>
        </BentoCard>
      ) : data ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <ClippedAreaChart
              points={chartPoints}
              headlineLabel="XP earned (last 12 months)"
              headlineValue={`${headlineValue} XP`}
              secondaryLabel="Referrals completed"
              secondaryValue={`${secondaryValue}`}
            />
            <BentoCard>
              <BentoCardHeader title="XP Progress" />
              <p className="settings-card-description mb-3">
                Level {xpData.level} ·{" "}
                {formatNumber(xpData.total, { maximumFractionDigits: 0 })} XP
                total
              </p>
              <div className="space-y-4">
                <Progress value={progressPercent} />
                <div className="text-sm text-[var(--bento-text-muted)]">
                  {xpData.nextThreshold != null ? (
                    <>
                      {formatNumber(remainingXp, { maximumFractionDigits: 0 })}{" "}
                      XP until level {xpData.level + 1}
                    </>
                  ) : (
                    "You’ve reached the highest level currently available."
                  )}
                </div>
                <div className="settings-inline-section text-xs text-[var(--bento-text-muted)]">
                  <div className="font-medium text-[var(--bento-text-primary)]">
                    +{formatNumber(xpData.xpPerSuccess)} XP per successful
                    invitation
                  </div>
                  <div>
                    Total sign-ups: {formatNumber(xpData.totalSuccesses)}
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>

          <BentoCard>
            <BentoCardHeader
              title="Invitation Code"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {regenerateMutation.isPending
                      ? "Refreshing…"
                      : "Regenerate"}
                  </Button>
                  <Button variant="default" size="sm" onClick={handleCopy}>
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              }
            />
            <p className="settings-card-description mb-3">
              Share this link to earn XP from successful referrals.
            </p>
            <div className="space-y-3">
              <div className="settings-inline-section space-y-2 text-sm">
                <p className="settings-section-label">Invite code</p>
                <span className="font-mono text-xs text-[var(--bento-text-primary)]">
                  {inviteCode}
                </span>
              </div>
              <div className="settings-inline-section space-y-2 text-sm">
                <div className="settings-section-label">Invite link</div>
                <div className="truncate text-[var(--bento-text-muted)]">
                  {inviteUrl}
                </div>
              </div>
              <div className="grid gap-4 border-t border-[var(--settings-border)]/8 pt-4 text-xs text-[var(--bento-text-muted)] sm:grid-cols-3">
                <div>
                  <div className="settings-section-label">Created</div>
                  {formatDate(codeMetadata.createdAt)}
                </div>
                <div>
                  <div className="settings-section-label">Last updated</div>
                  {formatDate(codeMetadata.updatedAt)}
                </div>
                <div>
                  <div className="settings-section-label">Regenerated</div>
                  {formatDate(codeMetadata.lastRegeneratedAt)}
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <BentoCardHeader title="Invitation Activity" />
            <p className="settings-card-description mb-3">
              Send new invitations and monitor their status.
            </p>
            <div className="space-y-6">
              <form
                className="settings-inline-section grid gap-3 sm:grid-cols-[minmax(0,320px)_auto]"
                onSubmit={handleCreateInvite}
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="invite-email"
                    className="text-[var(--bento-text-primary)]"
                  >
                    Invite by email
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Sending…" : "Send invite"}
                  </Button>
                </div>
              </form>

              <SettingsTableShell>
                <SettingsTable>
                  <SettingsTableHeader>
                    <SettingsTableHeaderRow>
                      <SettingsTableHead>Email</SettingsTableHead>
                      <SettingsTableHead>Status</SettingsTableHead>
                      <SettingsTableHead>XP</SettingsTableHead>
                      <SettingsTableHead>Sent</SettingsTableHead>
                      <SettingsTableHead>Accepted</SettingsTableHead>
                      <SettingsTableHead>Expires</SettingsTableHead>
                    </SettingsTableHeaderRow>
                  </SettingsTableHeader>
                  <SettingsTableBody>
                    {invitations.length === 0 ? (
                      <SettingsTableRow>
                        <SettingsTableEmptyCell colSpan={6}>
                          No invitations yet. Send the first invite above.
                        </SettingsTableEmptyCell>
                      </SettingsTableRow>
                    ) : (
                      invitations.map((invite) => {
                        const badge = statusBadge(invite.status);
                        return (
                          <SettingsTableRow key={invite.id}>
                            <SettingsTableCell>
                              {invite.email ? (
                                <span className="text-[var(--settings-foreground-strong)]">
                                  {invite.email}
                                </span>
                              ) : (
                                <span>—</span>
                              )}
                            </SettingsTableCell>
                            <SettingsTableCell>
                              <Badge variant={badge.variant}>
                                {badge.label}
                              </Badge>
                            </SettingsTableCell>
                            <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                              {formatNumber(invite.xpAwarded, {
                                maximumFractionDigits: 0,
                              })}
                            </SettingsTableCell>
                            <SettingsTableCell>
                              {formatDate(invite.sentAt)}
                            </SettingsTableCell>
                            <SettingsTableCell>
                              {formatDate(invite.acceptedAt)}
                            </SettingsTableCell>
                            <SettingsTableCell>
                              {formatDate(invite.expiresAt)}
                            </SettingsTableCell>
                          </SettingsTableRow>
                        );
                      })
                    )}
                  </SettingsTableBody>
                </SettingsTable>
              </SettingsTableShell>
            </div>
          </BentoCard>
        </>
      ) : null}
    </SettingsPage>
  );
}
