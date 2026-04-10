"use client";

import { useMemo } from "react";

import { useEvmChainBalance } from "@/hooks/balance/use-evm-chain-balance";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { NativeChainLogo } from "./native-chain-logo";
import { NativeBalanceValue } from "./native-balance-value";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import type { NativeBalanceDisplayProps } from "./native-balance-display.types";

const BNB_CHAIN_ID = 56;

export function BnbBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
  address = null,
}: NativeBalanceDisplayProps) {
  const { balance, loading, error } = useEvmChainBalance({
    chainId: BNB_CHAIN_ID,
    addressOverride: address,
  });

  const formatted = useMemo(() => formatNativeBalance(balance, maxDecimals), [balance, maxDecimals]);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src={LIQUID_GLASS_LOGOS.bnb} alt="BNB chain icon" />}
      showLogo={showLogo}
      value={balance !== null ? formatted : null}
      symbol="BNB"
      loading={loading}
      hasError={Boolean(error)}
    />
  );
}
