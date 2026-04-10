"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, KeyRound, Plug } from "lucide-react";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import type { ProfileAggregate } from "@/lib/user/profile";

function formatLastSynced(value?: string | null) {
  if (!value) return "Never synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never synced";
  return date.toLocaleString();
}

type SocialConnectionsCardProps = {
  profile?: ProfileAggregate;
  isLoading: boolean;
};

export function SocialConnectionsCard({
  profile,
  isLoading,
}: SocialConnectionsCardProps) {
  const integrations = useMemo(
    () => (Array.isArray(profile?.integrations) ? profile.integrations : []),
    [profile?.integrations],
  );
  const apiKeys = useMemo(() => (Array.isArray(profile?.apiKeys) ? profile.apiKeys : []), [profile?.apiKeys]);

  const connected = useMemo(
    () =>
      integrations.filter((integration) => {
        const status = integration.status?.toLowerCase() ?? "";
        return status === "connected" || status === "active" || status === "ok";
      }),
    [integrations],
  );

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="settings-card-title">Connections</h3>
          <p className="settings-card-description">
            Provider link status and API key readiness.
          </p>
        </div>
        <Badge variant="outline">
          <Plug className="h-3.5 w-3.5" />
          {isLoading ? "..." : connected.length.toLocaleString("en-US")}
        </Badge>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="settings-inline-section text-xs text-[var(--bento-text-muted)]">
            Loading connections...
          </div>
        ) : integrations.length === 0 ? (
          <div className="settings-inline-section text-center text-xs text-[var(--bento-text-muted)]">
            No connected integrations found.
          </div>
        ) : (
          <div className="settings-inline-list">
            {integrations.slice(0, 6).map((integration) => {
              const status = integration.status?.trim() || "unknown";
              const scopesCount = integration.scopes?.length ?? 0;
              return (
                <div
                  key={`${integration.provider}-${integration.lastSyncedAt ?? "never"}`}
                  className="settings-inline-row"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--bento-text-primary)]">{integration.provider}</p>
                      <p className="mt-1 text-xs text-[var(--bento-text-muted)]">
                        {scopesCount} scope{scopesCount === 1 ? "" : "s"} · {formatLastSynced(integration.lastSyncedAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="settings-inline-section mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-xs text-[var(--bento-text-primary)]">API keys</p>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--bento-text-muted)]">
            <KeyRound className="h-3.5 w-3.5" />
            {isLoading ? "..." : apiKeys.length.toLocaleString("en-US")}
          </span>
        </div>

        <Button asChild variant="outline" className="settings-surface-button w-full justify-between">
          <Link href="/settings/connections">
            Manage connections
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="settings-surface-button w-full justify-between">
          <Link href="/settings/developer/api-keys">
            Manage API keys
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </BentoCard>
  );
}
