import type { Metadata } from "next";

import { AgentWizardClient } from "@/components/agents/agent-wizard-client";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

export const metadata: Metadata = {
  title: "Create Agent | Nex-T1",
  description:
    "Launch a production-ready agent with secure secrets, pricing, and TEE deployment policies.",
};

export default function NewAgentPage() {
  return (
    <SettingsSurfaceShell
      width="wide"
      className="min-h-full"
      canvasClassName="relative"
      stackClassName="relative"
      includeFooterSpacer={false}
    >
      <div className="pointer-events-none absolute inset-0 bg-[url('/assets/stars.svg')] bg-cover bg-center opacity-[0.14]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--settings-accent)_18%,transparent),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,color-mix(in_oklab,var(--settings-foreground-strong)_8%,transparent),transparent_48%)]" />
      <div className="relative flex h-full flex-col py-2">
        <AgentWizardClient />
      </div>
    </SettingsSurfaceShell>
  );
}
