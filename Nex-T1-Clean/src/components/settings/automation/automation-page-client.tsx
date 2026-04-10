"use client";

import { RedirectToSignIn, SignedIn, SignedOut } from "@/components/auth/session-guards";
import { StrategyManager } from "@/components/settings/automation/strategy-manager";
import { PaymasterBalancesCard } from "@/components/settings/automation/paymaster-balances-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

export default function AutomationPageClient() {
  return (
    <>
      <SignedIn>
        <SettingsPage>
          <SettingsPageHeader
            title="Automation"
            description="Configure automation strategies and gas paymasters so AI agents operate with verified human oversight and deterministic guardrails."
          />
          <StrategyManager />
          <PaymasterBalancesCard />
        </SettingsPage>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
