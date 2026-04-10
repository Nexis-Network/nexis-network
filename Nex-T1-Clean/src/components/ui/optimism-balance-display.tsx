"use client";

import { useMemo } from "react";

import { useEvmChainBalance } from "@/hooks/balance/use-evm-chain-balance";
import { NativeChainLogo } from "./native-chain-logo";
import { NativeBalanceValue } from "./native-balance-value";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import type { NativeBalanceDisplayProps } from "./native-balance-display.types";

const OPTIMISM_CHAIN_ID = 10;

export function OptimismBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
  address = null,
}: NativeBalanceDisplayProps) {
  const { balance, loading, error } = useEvmChainBalance({
    chainId: OPTIMISM_CHAIN_ID,
    addressOverride: address,
  });

  const formatted = useMemo(() => formatNativeBalance(balance, maxDecimals), [balance, maxDecimals]);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src="/icons/chain-icons/optimism.svg" alt="Optimism chain icon" />}
      showLogo={showLogo}
      value={balance !== null ? formatted : null}
      symbol="OP"
      loading={loading}
      hasError={Boolean(error)}
    />
  );
}
