"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { WalletSelectorHeader } from "./wallet-selector-header";
import { ProfileSummaryCard } from "./profile-summary-card";
import { TopHoldingsCard } from "./top-holdings-card";
import { TopGainersCard, TopLosersCard } from "./market-movers-cards";
import { NotificationsCard } from "./notifications-card";
import { FadeScroll } from "@/components/fade-scroll";
import { getSettingsHubByPathname } from "@/components/settings/shared/settings-route-registry";

type PanelConfig = {
  showNetWorth?: boolean;
  showWallets?: boolean;
  showHoldings?: boolean;
  showProfile?: boolean;
  showNotifications?: boolean;
};

function resolveConfig(pathname: string): PanelConfig {
  const hub = getSettingsHubByPathname(pathname);

  switch (hub.id) {
    case "overview":
      return { showNetWorth: true, showWallets: true, showHoldings: true };
    case "account":
      return { showNetWorth: true, showWallets: true, showHoldings: true, showProfile: true };
    case "social":
      return { showProfile: true, showNotifications: true };
    case "ai":
      return { showWallets: true, showNotifications: true };
    case "trading":
      return { showNetWorth: true, showWallets: true, showHoldings: true };
    case "workspace":
      return { showProfile: true, showNotifications: true };
    case "developer":
      return { showProfile: true, showNotifications: true };
    default:
      return { showProfile: true, showNotifications: true };
  }
}

export function RightPanelRouter() {
  const pathname = usePathname() ?? "/settings";
  const config = useMemo(() => resolveConfig(pathname), [pathname]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {config.showNetWorth ? (
        <div className="shrink-0 mb-3 px-0.5">
          <WalletSelectorHeader />
        </div>
      ) : null}

      <FadeScroll className="flex-1">
        {config.showProfile ? <ProfileSummaryCard /> : null}
        {config.showNotifications ? <NotificationsCard /> : null}
        {config.showWallets ? <TopHoldingsCard /> : null}
        <TopGainersCard />
        <TopLosersCard />
      </FadeScroll>
    </div>
  );
}
