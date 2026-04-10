"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ConnectionsPageClient } from "@/components/settings/connections/connections-page-client";
import { CdpAuthLinkingCard } from "@/components/settings/security/cdp-auth-linking-card";
import { CdpMfaCard } from "@/components/settings/security/cdp-mfa-card";
import { AgentWalletsSection } from "@/components/settings/wallets/agent-wallets-section";
import { CdpSpendPermissionsCard } from "@/components/settings/wallets/cdp-spend-permissions-card";
import { DevicesCard } from "@/components/settings/wallets/devices-card";
import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import {
  SettingsPage,
  SettingsPageHeader,
  SettingsSection,
} from "@/components/settings-v2/primitives/page";
import WalletsPageClient from "@/components/settings/wallets/wallets-page-client";
import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";

const CDP_ENABLED = CDP_EMBEDDED_ENABLED;

function WalletSectionBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md px-2 py-0 text-[11px]"
    >
      {label}
    </Badge>
  );
}

export function SettingsWalletsSection() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const view = searchParams.get("view");

  if (view === "connectors") {
    return <ConnectionsPageClient />;
  }

  if (view === "agentkit") {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Agent Wallets"
          description="Provision and inspect wallets assigned to deployed agents."
        />

        <AgentWalletsSection />
      </SettingsPage>
    );
  }

  if (tab === "security" || view === "security") {
    return (
      <SettingsPage className="space-y-8">
        <SettingsPageHeader
          title="Wallet security"
          description="Harden approvals, linked auth, MFA, and device access across your wallets."
          action={
            <Button
              asChild
              size="sm"
              variant="outline"
            >
              <Link href="/settings/wallets?tab=overview">Open overview</Link>
            </Button>
          }
        />

        {CDP_ENABLED ? (
          <SettingsSection
            title="Identity hardening"
            description="Protect the authentication layer that unlocks Nex Wallet actions and key export workflows."
            badge={<WalletSectionBadge label="Access" />}
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <CdpMfaCard />
              <CdpAuthLinkingCard />
            </div>
          </SettingsSection>
        ) : null}

        {CDP_ENABLED ? (
          <SettingsSection
            title="Execution guardrails"
            description="Review on-chain spending approvals granted to agents and revoke stale permissions before they become drift."
            badge={<WalletSectionBadge label="Controls" />}
          >
            <CdpSpendPermissionsCard />
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Authorized devices"
          description="Inspect the current Safe owners and device-level access allowed to control your Nex Wallet layer."
          badge={<WalletSectionBadge label="Devices" />}
        >
          <DevicesCard />
        </SettingsSection>
      </SettingsPage>
    );
  }

  return <WalletsPageClient />;
}
