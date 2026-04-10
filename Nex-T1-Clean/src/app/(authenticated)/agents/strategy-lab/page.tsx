import type { Metadata } from "next";

import { StrategyBuilderClient } from "@/components/agents/strategy-builder/strategy-builder-client";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

export const metadata: Metadata = {
  title: "Strategy Builder | Nex-T1",
  description:
    "Design, test, and publish automated DeFi strategies for Nex-T1 agents. Drag-and-drop blocks, apply templates, and deploy via the agent launchpad.",
};

export default function StrategyLabPage() {
  return (
    <SettingsSurfaceShell
      width="wide"
      className="min-h-full"
      includeFooterSpacer={false}
      topSlot={
        <header className="flex flex-col gap-2">
          <span className="settings-shell-eyebrow">Launchpad</span>
          <h1 className="settings-page-title">Strategy builder</h1>
          <p className="settings-shell-subtitle max-w-[672px]">
            Build visual trading strategies, link them to Nex-T1 agents, and
            track performance before listing on the marketplace.
          </p>
        </header>
      }
    >
      <div className="flex-1 pb-12">
        <StrategyBuilderClient />
      </div>
    </SettingsSurfaceShell>
  );
}
