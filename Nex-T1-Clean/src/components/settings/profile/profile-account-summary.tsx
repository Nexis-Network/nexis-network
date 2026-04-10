"use client";

import { CheckCircle2, Clock3, Shield } from "lucide-react";

import {
  useLocale,
  useTranslations,
} from "@/components/providers/locale-provider";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileAggregate } from "@/lib/user/profile";
import { calculateProfileCompletion } from "@/lib/user/profile/progress";
import { getProfileAccountSummaryCopy } from "@/modules/settings/i18n";

type ProfileAccountSummaryProps = {
  data?: ProfileAggregate;
  isLoading: boolean;
};

export function ProfileAccountSummary({
  data,
  isLoading,
}: ProfileAccountSummaryProps) {
  const locale = useLocale();
  const t = useTranslations("settingsNav");
  const copy = getProfileAccountSummaryCopy(t);

  if (isLoading) {
    return (
      <SettingsPanel title={copy.title} description={copy.description}>
        <div className="space-y-4">
          <Skeleton className="h-5 w-40 bg-white/5" />
          <Skeleton className="h-2 w-full bg-white/5" />
          <Skeleton className="h-16 w-full bg-white/5" />
          <Skeleton className="h-20 w-full bg-white/5" />
        </div>
      </SettingsPanel>
    );
  }

  const identity = data?.identity;
  const security = data?.security;
  const completion = calculateProfileCompletion(data);
  const nextSteps = completion.checks
    .filter((check) => !check.satisfied)
    .slice(0, 3);

  return (
    <SettingsPanel title={copy.title} description={copy.description}>
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                {copy.profileCompletion}
              </p>
              <p className="text-sm text-[var(--settings-foreground-muted)]">
                {copy.stepsComplete(completion.completed, completion.total)}
              </p>
            </div>
            <span className="font-mono text-lg text-[var(--settings-foreground-strong)]">
              {completion.percent}%
            </span>
          </div>
          <Progress value={completion.percent} className="h-2" />
        </div>

        <div data-settings-row-list>
          <SummaryRow
            label={copy.fields.displayName}
            value={identity?.displayName}
            fallback={copy.fallback.setDisplayName}
          />
          <SummaryRow
            label={copy.fields.username}
            value={identity?.username}
            fallback={copy.fallback.claimUsername}
          />
          <SummaryRow
            label={copy.fields.primaryEmail}
            value={identity?.email}
            fallback={copy.fallback.unknown}
            meta={
              identity?.emailVerified
                ? copy.emailStatus.verified
                : copy.emailStatus.verificationRequired
            }
          />
          <SummaryRow
            label={copy.fields.localeTimeZone}
            value={[identity?.locale, identity?.timeZone]
              .filter(Boolean)
              .join(" · ")}
            fallback={copy.fallback.setLocaleTimeZone}
          />
          <SummaryRow
            label={copy.fields.lastLogin}
            value={formatDateTime(locale, security?.lastLoginAt)}
            fallback={copy.fallback.noRecentSessions}
            icon={<Clock3 className="h-4 w-4" />}
          />
          <SummaryRow
            label={copy.fields.riskScore}
            value={
              typeof security?.riskScore === "number"
                ? security.riskScore.toFixed(2)
                : null
            }
            fallback={copy.fallback.noRiskData}
            icon={<Shield className="h-4 w-4" />}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
            {copy.suggestedNextSteps}
          </p>
          {nextSteps.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--settings-border)] px-3 py-2 text-sm text-[var(--settings-foreground-muted)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--settings-foreground-strong)]" />
              {copy.profileLooksGreat}
            </div>
          ) : (
            <div className="space-y-2">
              {nextSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-[var(--settings-border)] px-3 py-2 text-sm text-[var(--settings-foreground-muted)]"
                >
                  {copy.nextStepLabel(step.id, step.label)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsPanel>
  );
}

type SummaryRowProps = {
  label: string;
  value?: string | null;
  fallback: string;
  meta?: string;
  icon?: React.ReactNode;
};

function SummaryRow({ label, value, fallback, meta, icon }: SummaryRowProps) {
  const resolvedValue = value && value.trim().length > 0 ? value : fallback;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-1">
        <p className="text-sm text-[var(--settings-foreground-muted)]">
          {label}
        </p>
        <div className="flex items-center gap-2 text-sm text-[var(--settings-foreground-strong)]">
          {icon ? (
            <span className="text-[var(--settings-foreground-muted)]">
              {icon}
            </span>
          ) : null}
          <span>{resolvedValue}</span>
        </div>
      </div>
      {meta ? (
        <span className="text-right text-sm text-[var(--settings-foreground-muted)]">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function formatDateTime(locale: string, value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
