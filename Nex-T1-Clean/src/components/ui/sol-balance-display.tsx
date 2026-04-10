"use client";

import { useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { useSolBalance } from "@/hooks/balance/use-sol-balance";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { NativeBalanceValue } from "@/components/ui/native-balance-value";
import { NativeChainLogo } from "@/components/ui/native-chain-logo";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";

interface SolBalanceDisplayProps {
  className?: string;
  showLogo?: boolean;
  maxDecimals?: number;
}

export function SolBalanceDisplay({
  className = "",
  showLogo = true,
  maxDecimals = 4,
}: SolBalanceDisplayProps) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { data: profile } = useProfileAggregate();

  const { balance, loading, error } = useSolBalance({
    connection,
    publicKey,
    enabled: connected && !!publicKey,
  });

  const fallbackNativeAmount = useMemo(() => {
    const wallets = profile?.wallets ?? [];
    if (!wallets.length) return null;
    const normalizedConnected = publicKey?.toBase58?.()?.toLowerCase?.() ?? null;

    for (const wallet of wallets) {
      const address = typeof wallet.address === "string" ? wallet.address : "";
      if (!address) continue;
      const lower = address.toLowerCase();
      const metadata = (wallet.metadata as Record<string, UntypedJson> | null) ?? null;
      const rawKind = typeof metadata?.kind === "string" ? metadata.kind.toLowerCase() : "";
      const isSolanaKind = rawKind === "solana";
      const resemblesSolanaAddress = !address.startsWith("0x");
      const matchesConnected = normalizedConnected ? lower === normalizedConnected : false;

      if (matchesConnected || isSolanaKind || resemblesSolanaAddress) {
        const direct =
          typeof metadata?.nativeAmount === "number" && Number.isFinite(metadata.nativeAmount)
            ? metadata.nativeAmount
            : null;
        const balances =
          metadata && typeof metadata.balances === "object"
            ? (metadata.balances as Record<string, UntypedJson>)
            : null;
        const balanceNative =
          balances && typeof balances.nativeAmount === "number"
            ? balances.nativeAmount
            : null;
        const nested =
          metadata && typeof metadata.nativeBalance === "object"
            ? (metadata.nativeBalance as Record<string, UntypedJson>)
            : null;
        const nestedAmount =
          nested && typeof nested.amount === "number" ? nested.amount : null;

        const amount = direct ?? balanceNative ?? nestedAmount;
        if (typeof amount === "number" && Number.isFinite(amount)) {
          return amount;
        }
      }
    }

    return null;
  }, [profile?.wallets, publicKey]);

  const numericBalance = useMemo(() => {
    if (balance != null) {
      const parsed = Number.parseFloat(balance);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (typeof fallbackNativeAmount === "number") {
      return fallbackNativeAmount;
    }

    return null;
  }, [balance, fallbackNativeAmount]);

  const formatted = useMemo(() => formatNativeBalance(numericBalance, maxDecimals), [numericBalance, maxDecimals]);
  const showPlaceholder = numericBalance == null && (error || !connected || !publicKey);

  return (
    <NativeBalanceValue
      className={className}
      icon={<NativeChainLogo src={LIQUID_GLASS_LOGOS.solana} alt="Solana" />}
      showLogo={showLogo}
      value={numericBalance != null ? formatted : null}
      symbol="SOL"
      loading={loading && numericBalance == null}
      hasError={showPlaceholder && numericBalance == null}
    />
  );
}
