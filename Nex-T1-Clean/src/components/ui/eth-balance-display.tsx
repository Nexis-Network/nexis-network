"use client";

/**
 * ETH Balance Display Component
 * 
 * Displays the user's ETH balance on the primary chain.
 * Uses the current Nex wallet hooks.
 */

import { useMemo } from "react";

import { useNexNativeBalance } from "@/lib/hooks/balance/use-nex-native-balance";
import { NativeBalanceValue } from "@/components/ui/native-balance-value";
import { NativeChainLogo } from "@/components/ui/native-chain-logo";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import { useNexWalletOptional } from "@/modules/wallets/nex/provider";

interface EthBalanceDisplayProps {
  className?: string;
  showLogo?: boolean;
  maxDecimals?: number;
  /** Override address (defaults to connected wallet) */
  addressOverride?: string | null;
  /** Chain ID (defaults to 1 for mainnet) */
  chainId?: number;
}

export function EthBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
  addressOverride,
  chainId = 1,
}: EthBalanceDisplayProps) {
  // Try to get connected wallet from Nex provider
  const nexWallet = useNexWalletOptional();
  
  // Resolve address: override > Nex wallet > null
  const address = useMemo(() => {
    if (addressOverride) return addressOverride;
    if (nexWallet?.evm?.smartAccountAddress) return nexWallet.evm.smartAccountAddress;
    if (nexWallet?.evm?.ownerAddress) return nexWallet.evm.ownerAddress;
    return null;
  }, [addressOverride, nexWallet?.evm?.ownerAddress, nexWallet?.evm?.smartAccountAddress]);

  const { balance, symbol, loading, error } = useNexNativeBalance({
    chainId,
    address,
    enabled: Boolean(address),
  });

  const formatted = useMemo(
    () => formatNativeBalance(balance, maxDecimals),
    [balance, maxDecimals]
  );

  const hasError = Boolean(error || !address);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src={LIQUID_GLASS_LOGOS.ethereum} alt="Ethereum" />}
      showLogo={showLogo}
      value={!hasError ? formatted : null}
      symbol={symbol ?? "ETH"}
      loading={loading && !balance}
      hasError={hasError}
    />
  );
}
