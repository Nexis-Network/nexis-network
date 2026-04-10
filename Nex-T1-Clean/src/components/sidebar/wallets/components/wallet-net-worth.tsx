"use client";

import { useEffect, useState } from "react";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { formatFiat } from "@/lib/formatters/wallet";
import { fetchWalletPnL } from "@/server/actions/wallets";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportCdpWalletDialog } from "./export-cdp-wallet-dialog";


import { logger } from '@/lib/logger';
interface WalletNetWorthProps {
  activeWallet: WalletSnapshot | null;
}

export function WalletNetWorth({ activeWallet }: WalletNetWorthProps) {
  const [realNetWorth, setRealNetWorth] = useState<number | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPnL() {
      if (!activeWallet?.address) {
        if (isMounted) setRealNetWorth(null);
        return;
      }

      // Determine type
      const type =
        activeWallet.type === "external_solana" ||
        activeWallet.provider?.includes("phantom")
          ? "solana"
          : "evm";

      try {
        const result = await fetchWalletPnL(activeWallet.address, type);
        if (isMounted) {
          setRealNetWorth(result.totalUsd);
        }
      } catch (e) {
        logger.error("Failed to fetch PnL for header", e);
      }
    }

    // Reset when wallet changes
    setRealNetWorth(null);
    loadPnL();

    return () => {
      isMounted = false;
    };
  }, [activeWallet?.address, activeWallet?.type, activeWallet?.provider]);

  return (
    <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-base font-medium text-white">Total Networth</p>
        <p className="text-xs text-zinc-500">Estimated Value</p>
      </div>
      <div className="flex items-center gap-4">
        {activeWallet?.provider === "cdp" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="h-8 text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <KeyRound className="mr-2 h-3.5 w-3.5" />
            <span className="text-xs font-medium">Export Key</span>
          </Button>
        )}
        <p className="text-2xl font-light text-white">
          {activeWallet
            ? formatFiat(
                realNetWorth ??
                  activeWallet.totals.estimatedValueUsd ??
                  activeWallet.totals.nativeValueUsd,
              )
            : "0.00"}
          <span className="ml-2 text-base text-zinc-500">USD</span>
        </p>
      </div>

      <ExportCdpWalletDialog 
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen} 
        wallet={activeWallet} 
      />
    </div>
  );
}
