"use client";

import { useSearchParams } from "next/navigation";

import AgentSpendPageClient from "@/components/settings/agent-spend/agent-spend-page-client";
import { SettingsProvidersCard } from "@/components/settings/providers-card";
import { CdpAuthLinkingCard } from "@/components/settings/security/cdp-auth-linking-card";
import { CdpMfaCard } from "@/components/settings/security/cdp-mfa-card";
import { GuardCard } from "@/components/settings/security/guard-card";
import { RecoveryCard } from "@/components/settings/security/recovery-card";
import { SessionListCard } from "@/components/settings/security/session-list";
import { WalletPasskeysCard } from "@/components/settings/security/wallet-passkeys-card";
import { ProfileSessionControlsCard } from "@/components/settings/profile/profile-session-controls-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";

export function SettingsSecuritySection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") ?? "providers";
  const { data, isLoading } = useProfileAggregate();

  if (activeView === "mfa") {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Multi-factor security"
          description="Configure TOTP, passkeys, and wallet step-up approvals."
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <CdpMfaCard />
          <WalletPasskeysCard />
        </div>
      </SettingsPage>
    );
  }

  if (activeView === "recovery") {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Recovery"
          description="Configure Safe recovery paths and guardian operations."
        />
        <RecoveryCard />
      </SettingsPage>
    );
  }

  if (activeView === "sessions") {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Sessions"
          description="Review active devices, revoke sessions, and enforce account hygiene."
        />

        <ProfileSessionControlsCard identity={data?.identity} isLoading={isLoading} />
        <SessionListCard />
      </SettingsPage>
    );
  }

  if (activeView === "risk") {
    return (
      <SettingsPage className="space-y-6">
        <SettingsPageHeader
          title="Risk controls"
          description="Enforce guardrails for approvals, autonomous execution, and recovery-sensitive operations."
        />

        <GuardCard />
        <AgentSpendPageClient />
      </SettingsPage>
    );
  }

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Providers and account security"
        description="Manage sign-in providers and linked authentication methods."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsProvidersCard />
        <CdpAuthLinkingCard />
      </div>
    </SettingsPage>
  );
}
