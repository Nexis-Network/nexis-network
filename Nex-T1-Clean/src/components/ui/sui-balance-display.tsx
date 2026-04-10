"use client";

import { useMemo } from "react";

import { useProvisionedWalletAddress } from "@/hooks/balance/use-provisioned-wallet-address";
import { useSuiBalance } from "@/hooks/balance/use-sui-balance";
import { NativeChainLogo } from "./native-chain-logo";
import { NativeBalanceValue } from "./native-balance-value";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import type { NativeBalanceDisplayProps } from "./native-balance-display.types";

export function SuiBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
  address = null,
}: NativeBalanceDisplayProps) {
  const fallbackAddress = useProvisionedWalletAddress("sui");
  const resolvedAddress = address ?? fallbackAddress;

  const { balance, loading, error } = useSuiBalance({
    address: resolvedAddress,
    enabled: Boolean(resolvedAddress),
  });

  const formatted = useMemo(() => formatNativeBalance(balance, maxDecimals), [balance, maxDecimals]);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src="/icons/chain-icons/sui.svg" alt="Sui chain icon" />}
      showLogo={showLogo}
      value={balance !== null ? formatted : null}
      symbol="SUI"
      loading={loading}
      hasError={Boolean(error)}
    />
  );
}
