import PolymarketSettingsClient from "@/components/settings/polymarket/polymarket-settings-client";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

export function SettingsPolymarketSection() {
  return (
    <SettingsPage className="space-y-5">
      <SettingsPageHeader
        title="Polymarket"
        description="Manage credentials, geoblock readiness, and execution connectivity."
      />
      <PolymarketSettingsClient />
    </SettingsPage>
  );
}
