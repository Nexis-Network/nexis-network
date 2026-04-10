"use client";

import { useQuery } from "@tanstack/react-query";

import { BillingHistory } from "@/components/settings/billing/billing-history";
import { SubscriptionTierCard } from "@/components/settings/billing/subscription-tier-card";
import { UsageCard } from "@/components/settings/billing/usage-card";
import {
  SettingsMainColumn,
  SettingsPage,
  SettingsPageBody,
  SettingsPageHeader,
  SettingsSideColumn,
} from "@/components/settings-v2/primitives/page";
import { extractStripeSubscriptionPlan, type StripeSubscriptionPlan } from "@/lib/billing/stripe-subscription";

async function fetchPlan(): Promise<StripeSubscriptionPlan | null> {
  const res = await fetch("/api/stripe/subscription", { 
    cache: "no-store", 
    credentials: "include" 
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  return extractStripeSubscriptionPlan(payload);
}

export default function BillingPage() {
  const { data: plan, isLoading } = useQuery({
    queryKey: ["billing-plan"],
    queryFn: fetchPlan,
    retry: 1,
    enabled: true,
  });

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Billing & Subscription"
        description="Manage your subscription plan, view credit usage, and billing history."
      />

      <SettingsPageBody className="items-start">
        <SettingsMainColumn>
          <SubscriptionTierCard plan={plan ?? null} isLoading={isLoading} />

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-[var(--bento-text-primary)]">Invoices</h2>
            <BillingHistory />
          </div>
        </SettingsMainColumn>

        <SettingsSideColumn>
          <UsageCard />
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}
