"use client";

import Image from "next/image";
import { Blocks } from "lucide-react";

import type { IntegrationSummary } from "@/lib/user/profile";
import { SettingsCard } from "@/components/settings/shared/settings-card";
import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "@/components/providers/locale-provider";
import { getOAuthProviderLabel } from "@/modules/auth/i18n";
import { getSettingsIntegrationsCardCopy } from "@/modules/settings/i18n";

type IntegrationsCardProps = {
  integrations: IntegrationSummary[];
  isLoading: boolean;
  error?: string | null;
};

export function IntegrationsCard({ integrations, isLoading, error }: IntegrationsCardProps) {
  const locale = useLocale();
  const settingsT = useTranslations("settingsNav");
  const authT = useTranslations("auth");
  const copy = getSettingsIntegrationsCardCopy(settingsT);
  const isEmpty = !isLoading && !error && integrations.length === 0;

  return (
    <SettingsCard
      title={copy.title}
      description={
        isLoading
          ? copy.loadingDescription
          : error
            ? copy.errorDescription
            : copy.defaultDescription
      }
      icon={<Blocks className="size-4" />}
      isLoading={isLoading}
      error={error}
    >
      {isEmpty ? (
        <p className="text-xs text-[var(--bento-text-muted)]">
          {copy.empty}
        </p>
      ) : (
        <div className="settings-inline-list">
          {integrations.map((integration) => {
            const iconSrc = resolveProviderIconSrc(integration.provider);
            const providerLabel = formatProvider(integration.provider, authT);
            const lastSyncedLabel = formatLastSynced(
              integration.lastSyncedAt,
              locale,
              copy,
            );

            return (
              <div
                key={integration.provider}
                className="settings-inline-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {iconSrc ? (
                      <Image
                        src={iconSrc}
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 shrink-0"
                      />
                    ) : null}
                    <span className="text-sm font-medium text-[var(--bento-text-primary)] capitalize">
                      {providerLabel}
                    </span>
                    <Badge variant={integration.status === "connected" ? "default" : "outline"}>
                      {integration.status === "connected" ? copy.connected : integration.status}
                    </Badge>
                  </div>
                  {integration.scopes.length > 0 && (
                    <p className="text-xs text-[var(--bento-text-muted)]">
                      {copy.scopes(integration.scopes.join(", "))}
                    </p>
                  )}
                </div>
                <div className="text-xs text-[var(--bento-text-muted)] sm:text-right">
                  {lastSyncedLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
}

function formatProvider(
  provider: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const normalized = provider.trim().toLowerCase();
  const compact = normalized.replace(/[\s/_-]+/g, "");

  if (compact === "google") return getOAuthProviderLabel(t, "google");
  if (compact === "github") return getOAuthProviderLabel(t, "github");
  if (compact === "discord") return getOAuthProviderLabel(t, "discord");
  if (compact === "twitter" || compact === "x" || compact === "xtwitter") {
    return getOAuthProviderLabel(t, "x");
  }
  if (compact === "apple") return getOAuthProviderLabel(t, "apple");

  return provider
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function formatLastSynced(
  value: string | null | undefined,
  locale: string,
  copy: ReturnType<typeof getSettingsIntegrationsCardCopy>,
) {
  if (!value) return copy.neverSynced;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.neverSynced;
  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return copy.lastSynced(formattedDate);
}

function resolveProviderIconSrc(provider: string): string | null {
  const normalized = provider.trim().toLowerCase();
  const compact = normalized.replace(/[\s/_-]+/g, "");

  if (compact === "google") return "/assets/sources-icons/google.svg";
  if (compact === "discord") return "/assets/sources-icons/discord.svg";
  if (compact === "github") return "/assets/social-icons/github-light.svg";
  if (compact === "apple") return "/assets/sources-icons/apple.svg";
  if (compact === "x" || compact === "twitter" || compact === "xtwitter") {
    return "/assets/sources-icons/X-Twitter.svg";
  }

  return null;
}
