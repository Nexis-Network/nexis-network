"use client";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";
import { MonoValue } from "../shared/mono-value";

export function AgentSummaryCard() {
  // Placeholder — connects to agents API in production
  // const { data, isLoading } = useQuery(...)

  return (
    <BentoCard>
      <BentoCardHeader title="AI Agents" />
      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Active Agents" value="—" />
        <StatBlock label="Total P&L" value="—" />
        <StatBlock label="Tasks Today" value="—" />
        <StatBlock label="Approvals" value="—" />
      </div>
    </BentoCard>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] text-[var(--bento-text-muted)]">{label}</div>
      <MonoValue className="mt-0.5 text-sm font-medium text-[var(--bento-text-primary)]">{value}</MonoValue>
    </div>
  );
}
