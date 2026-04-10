"use client";

import { BarChart3 } from "lucide-react";

import { useLocale, useTranslations } from "@/components/providers/locale-provider";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsageSummary } from "@/lib/user/profile";
import { getProfileUsageCardCopy } from "@/modules/settings/i18n";

type ProfileUsageCardProps = {
  usage?: UsageSummary;
  isLoading: boolean;
};

export function ProfileUsageCard({ usage, isLoading }: ProfileUsageCardProps) {
  const locale = useLocale();
  const t = useTranslations("settingsNav");
  const copy = getProfileUsageCardCopy(t);
  if (isLoading) {
    return (
      <BentoCard>
        <div className="space-y-1">
          <Skeleton className="h-5 w-32 bg-white/5" />
          <Skeleton className="h-4 w-48 bg-white/5" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24 bg-white/5" />
              <Skeleton className="h-6 w-16 bg-white/5" />
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  const metrics = [
    {
      label: copy.metrics[0]?.label ?? "",
      value: usage?.chatsLast30d ?? 0,
    },
    {
      label: copy.metrics[1]?.label ?? "",
      value: usage?.artifactsLast30d ?? 0,
    },
    {
      label: copy.metrics[2]?.label ?? "",
      value: usage?.tokensPromptLast7d ?? 0,
    },
    {
      label: copy.metrics[3]?.label ?? "",
      value: usage?.tokensCompletionLast7d ?? 0,
    },
  ];

  return (
    <BentoCard>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">{copy.title}</h3>
          <p className="text-xs text-[var(--bento-text-muted)]">
            {copy.description}
          </p>
        </div>
        <Badge variant="outline">
          <BarChart3 className="h-3.5 w-3.5" />
          {copy.last30Days}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-[var(--bento-border)] bg-white/[0.03] p-3"
          >
            <p className="text-[11px] uppercase text-[var(--bento-text-muted)]">{metric.label}</p>
            <p className="mt-1 text-xl font-regular text-[var(--bento-text-primary)]">
              {formatNumber(locale, metric.value)}
            </p>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function formatNumber(locale: string, value: number) {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}
