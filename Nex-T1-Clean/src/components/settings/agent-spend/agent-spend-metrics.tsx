"use client";

import { cn } from "@/lib/utils";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { MonoValue } from "@/components/settings/shared/mono-value";

type MetricCardProps = {
  label: string;
  value: string;
  subtle?: boolean;
};

export function MetricCard({ label, value, subtle }: MetricCardProps) {
  return (
    <BentoCard>
      <div className="space-y-1">
        <div className="settings-section-label">{label}</div>
        <div className={cn("text-sm font-medium", subtle ? "text-[var(--bento-text-muted)]" : "text-[var(--bento-text-primary)]")}>
          <MonoValue>{value}</MonoValue>
        </div>
      </div>
    </BentoCard>
  );
}
