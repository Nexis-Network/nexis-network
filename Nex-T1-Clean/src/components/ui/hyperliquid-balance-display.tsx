"use client";

import { useMemo } from "react";

import { useEvmChainBalance } from "@/hooks/balance/use-evm-chain-balance";
import { NativeChainLogo } from "./native-chain-logo";
import { NativeBalanceValue } from "./native-balance-value";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import type { NativeBalanceDisplayProps } from "./native-balance-display.types";

const HYPERLIQUID_CHAIN_ID = 998;

export function HyperliquidBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
  address = null,
}: NativeBalanceDisplayProps) {
  const { balance, loading, error } = useEvmChainBalance({
    chainId: HYPERLIQUID_CHAIN_ID,
    walletKind: "hyperliquid",
    addressOverride: address,
  });

  const formatted = useMemo(() => formatNativeBalance(balance, maxDecimals), [balance, maxDecimals]);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src={LIQUID_GLASS_LOGOS.hyperliquid} alt="Hyperliquid chain icon" />}
      showLogo={showLogo}
      value={balance !== null ? formatted : null}
      symbol="HYPE"
      loading={loading}
      hasError={Boolean(error)}
    />
  );
}
