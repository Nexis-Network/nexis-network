"use client";

import { usePathname } from "next/navigation";
import { useChainId } from "wagmi";

import { useLocale } from "@/components/providers/locale-provider";
import { useGasPrices } from "@/hooks/useGasPrices";
import { useLiveAsset } from "@/hooks/use-live-asset";

import { AppDashboardFooter } from "./footer/app-dashboard-footer";
import { LegacyDashboardFooter } from "./footer/legacy-dashboard-footer";

export function DashboardFooter() {
  const pathname = usePathname();
  const chainId = useChainId();
  const locale = useLocale();
  const { formattedGas } = useGasPrices(chainId);
  const { price } = useLiveAsset("eth", 0, String(chainId));

  const formattedEth = price > 0 ? new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price) : "-";
  const gasDisplay = formattedGas ? `${formattedGas} GWEI` : "-";

  if (pathname === "/app") {
    return <AppDashboardFooter formattedEth={formattedEth} formattedGas={gasDisplay} />;
  }

  return <LegacyDashboardFooter formattedEth={formattedEth} formattedGas={gasDisplay} />;
}
