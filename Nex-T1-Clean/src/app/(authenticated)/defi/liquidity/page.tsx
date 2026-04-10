import React from "react";
import { LiquidityProvisioningForm } from "@/components/liquidity";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

export const metadata = {
  title: "Defi Liquidity - Nex-T1",
  description: "Provide liquidity to Uniswap pools securely.",
};

export default function DefiLiquidityPage() {
  return (
    <SettingsSurfaceShell
      width="standard"
      className="h-full"
      includeFooterSpacer={false}
      topSlot={
        <div className="text-center">
          <h1 className="settings-page-title">Liquidity</h1>
          <p className="settings-shell-subtitle mt-3">
            Earn fees by providing liquidity.
          </p>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md pb-8">
        <LiquidityProvisioningForm />
      </div>
    </SettingsSurfaceShell>
  );
}
