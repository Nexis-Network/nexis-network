"use client";

import { Plug, Key, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { useTranslations } from "@/components/providers/locale-provider";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiKeySummary, IntegrationSummary } from "@/lib/user/profile";
import { getProfileIntegrationsCardCopy } from "@/modules/settings/i18n";

type ProfileIntegrationsCardProps = {
  integrations?: IntegrationSummary[];
  apiKeys?: ApiKeySummary[];
  isLoading: boolean;
};

export function ProfileIntegrationsCard({ integrations, apiKeys, isLoading }: ProfileIntegrationsCardProps) {
  const t = useTranslations("settingsNav");
  const copy = getProfileIntegrationsCardCopy(t);
  if (isLoading) {
    return (
      <BentoCard>
        <div className="space-y-1">
          <Skeleton className="h-5 w-32 bg-white/5" />
          <Skeleton className="h-4 w-56 bg-white/5" />
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg bg-white/5" />
          ))}
        </div>
      </BentoCard>
    );
  }

  const connectedIntegrations = (integrations ?? []).filter((integration) => integration.status === "connected");
  const totalConnections = connectedIntegrations.length;
  const totalApiKeys = apiKeys?.length ?? 0;

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="settings-card-title">
            {copy.title}
          </h3>
          <p className="settings-card-description">
            {copy.description}
          </p>
        </div>
        <Badge variant="outline">
          <Plug className="h-3.5 w-3.5" />
          {copy.connectedBadge(totalConnections)}
        </Badge>
      </div>

      <div className="settings-inline-list mt-4">
        <IntegrationRow
          title={copy.oauthApps}
          countLabel={copy.active(totalConnections)}
          ctaLabel={copy.manageConnections}
          href="/settings/connections"
        />
        <IntegrationRow
          title={copy.apiKeys}
          icon={<Key className="h-4 w-4 text-[var(--bento-text-muted)]" />}
          countLabel={copy.active(totalApiKeys)}
          ctaLabel={copy.manageApiKeys}
          href="/settings/developer/api-keys"
        />
      </div>
    </BentoCard>
  );
}

type IntegrationRowProps = {
  title: string;
  countLabel: string;
  ctaLabel: string;
  href: string;
  icon?: React.ReactNode;
};

function IntegrationRow({ title, countLabel, ctaLabel, href, icon }: IntegrationRowProps) {
  return (
    <div className="settings-inline-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-sm font-regular text-[var(--bento-text-primary)]">
          {icon}
          {title}
        </p>
        <p className="text-xs text-[var(--bento-text-muted)]">{countLabel}</p>
      </div>
      <Button variant="outline" size="sm" className="settings-surface-button w-fit" asChild>
        <Link href={href}>
          {ctaLabel}
          <ArrowUpRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
