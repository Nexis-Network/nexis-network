"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AlertSummary } from "@/lib/user/profile";

type ProfileAlertsCardProps = {
  alerts?: AlertSummary[];
  isLoading: boolean;
};

export function ProfileAlertsCard({ alerts, isLoading }: ProfileAlertsCardProps) {
  if (isLoading) {
    return (
      <BentoCard>
        <div className="space-y-1">
          <Skeleton className="h-5 w-32 bg-white/5" />
          <Skeleton className="h-4 w-56 bg-white/5" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg bg-white/5" />
          ))}
        </div>
      </BentoCard>
    );
  }

  const unresolvedAlerts = (alerts ?? []).filter((alert) => !alert.resolved);
  const resolvedAlerts = (alerts ?? []).filter((alert) => alert.resolved);

  const hasAlerts = unresolvedAlerts.length > 0 || resolvedAlerts.length > 0;

  return (
    <BentoCard>
      <div className="space-y-1">
        <h3 className="settings-card-title">Account Alerts</h3>
        <p className="settings-card-description">
          Monitor security notifications and recommended actions.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {!hasAlerts ? (
          <div className="settings-inline-section flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            No alerts to show. You&apos;re all caught up.
          </div>
        ) : (
          <>
            <div className="settings-inline-list">
              {unresolvedAlerts.map((alert) => (
                <AlertRow key={`${alert.type}-${alert.createdAt}`} alert={alert} />
              ))}
            </div>
            {resolvedAlerts.length > 0 && (
              <div className="settings-inline-section">
                <p className="settings-section-label">
                  Recently resolved
                </p>
                <div className="settings-inline-list mt-2">
                  {resolvedAlerts.slice(0, 2).map((alert) => (
                    <AlertRow key={`resolved-${alert.type}-${alert.createdAt}`} alert={alert} resolved />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {hasAlerts && unresolvedAlerts.length > 0 && (
        <div className="mt-4 flex justify-end border-t border-[var(--bento-border)] pt-3">
          <Badge variant="outline">
            {unresolvedAlerts.length} open alert{unresolvedAlerts.length === 1 ? "" : "s"}
          </Badge>
        </div>
      )}
    </BentoCard>
  );
}

type AlertRowProps = {
  alert: AlertSummary;
  resolved?: boolean;
};

function AlertRow({ alert, resolved = false }: AlertRowProps) {
  const created = new Date(alert.createdAt);
  const subtitle = Number.isNaN(created.getTime()) ? null : created.toLocaleString();
  const severityVariant = alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "outline" : "secondary";

  return (
    <div className="settings-inline-row flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {resolved ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
        <p className="text-sm font-regular text-[var(--bento-text-primary)]">{alert.message}</p>
        <Badge variant={severityVariant}>{resolved ? "Resolved" : alert.severity}</Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--bento-text-muted)]">
        <span className="uppercase">{alert.type}</span>
        {subtitle ? <span>· {subtitle}</span> : null}
      </div>
    </div>
  );
}
