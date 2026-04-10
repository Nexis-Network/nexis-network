"use client";

import { useSearchParams } from "next/navigation";

import ConnectionsPageClient from "@/components/settings/connections/connections-page-client";
import TradingSettingsClient from "@/components/settings/trading/trading-settings-client";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

export function SettingsConnectionsSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");

  if (activeView === "exchanges") {
    return (
      <SettingsPage className="space-y-5">
        <SettingsPageHeader
          title="Exchange connections"
          description="Manage centralized exchange accounts used by automation and execution flows."
        />
        <TradingSettingsClient />
      </SettingsPage>
    );
  }

  return <ConnectionsPageClient />;
}
