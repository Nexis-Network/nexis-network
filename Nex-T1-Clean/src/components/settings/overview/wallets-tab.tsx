"use client";

import type { ProfileAggregate, WalletPortfolio } from "@/lib/user/profile";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { useUserWallets } from "@/hooks/wallets/profile/use-user-wallets";
import { WalletsTable } from "@/components/settings/wallets/wallets-table";
import { useMemo } from "react";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { augmentWalletPortfoliosWithResolvedCdp } from "@/lib/cdp/cdp-wallet-portfolios";

type Props = {
  initialProfile: ProfileAggregate | null;
  initialWallets?: { wallets: WalletPortfolio[] } | null;
};

export default function WalletsTab({ initialProfile, initialWallets }: Props) {
  const { data, isLoading, error } = useProfileAggregate({ initialData: initialProfile ?? undefined });
  const { data: aggregated } = useUserWallets(initialWallets ?? undefined);

  const aggregatedWallets = aggregated?.wallets ?? null;
  const profileWallets = data?.wallets ?? null;

  const dedupedWallets = useMemo(() => {
    const base: WalletPortfolio[] = Array.isArray(aggregatedWallets)
      ? aggregatedWallets
      : Array.isArray(profileWallets)
        ? profileWallets
        : [];
    
    // Deduplicate by ID
    const seen = new Set<string>();
    const unique: WalletPortfolio[] = [];
    
    for (const w of base) {
       if (!seen.has(w.walletId)) {
          seen.add(w.walletId);
          unique.push(w);
       }
    }

    return unique;
  }, [aggregatedWallets, profileWallets]);
  const { evmAddress, solanaAddress } = useResolvedCdpWallets({
    fallbackWallets: dedupedWallets,
  });
  const augmented = useMemo(
    () =>
      augmentWalletPortfoliosWithResolvedCdp(dedupedWallets, {
        evmAddress,
        solanaAddress,
      }),
    [dedupedWallets, evmAddress, solanaAddress],
  );
  return (
    <div className="w-full">
      <WalletsTable wallets={augmented} isLoading={isLoading} error={(error as Error | undefined)?.message} />
    </div>
  );
}
