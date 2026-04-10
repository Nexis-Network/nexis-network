"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
/**
 * ConnectExternalWalletCard
 *
 * Domain: Settings/Wallets
 * Responsibility: Card component for connecting external EOA wallets
 * Dependencies: ConnectWalletModal, useConnectEoaWallet hook
 */

import { Unlink, ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { PlusIcon } from "@/components/sidebar-03/animated-icons";
import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletModal } from "@/components/wallets/connect-wallet-modal";
import { useConnectEoaWallet } from "@/lib/hooks/wallet/use-connect-eoa-wallet";
import {
  walletLedgerActionButtonClass,
  walletLedgerDescriptionClass,
  walletLedgerEyebrowClass,
  walletLedgerHeaderClass,
  walletLedgerIconFrameClass,
  walletLedgerInlineFrameClass,
  walletLedgerSectionBodyClass,
  walletLedgerSecondaryButtonClass,
  walletLedgerSubLabelClass,
  walletLedgerSurfaceClass,
  walletLedgerTitleClass,
} from "@/lib/ui/wallet-ledger";

type ExternalWalletInfo = {
  id: string;
  address: string;
  walletType: string;
  providerName?: string;
  chainId?: number;
  lastConnectedAt?: string;
};

function resolveExplorerUrl(wallet: ExternalWalletInfo): string | null {
  const address = wallet.address?.trim();
  if (!address) return null;

  if (wallet.walletType === "external_solana") {
    return `https://solscan.io/account/${address}`;
  }

  switch (wallet.chainId) {
    case 8453:
      return `https://basescan.org/address/${address}`;
    case 10:
      return `https://optimistic.etherscan.io/address/${address}`;
    case 56:
      return `https://bscscan.com/address/${address}`;
    case 42161:
      return `https://arbiscan.io/address/${address}`;
    case 137:
      return `https://polygonscan.com/address/${address}`;
    case 1:
    default:
      return `https://etherscan.io/address/${address}`;
  }
}

type ConnectExternalWalletCardProps = {
  existingWallets?: ExternalWalletInfo[];
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: (address: string) => void;
  isLoading?: boolean;
};

/**
 * Card for connecting and managing external EOA wallets.
 *
 * Features:
 * - Opens ConnectWalletModal to add new wallets
 * - Lists existing connected wallets
 * - Supports disconnecting wallets
 */
export function ConnectExternalWalletCard({
  existingWallets = [],
  onWalletConnected,
  onWalletDisconnected,
  isLoading = false,
}: ConnectExternalWalletCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isConnected, address, disconnect, connectedWallet } = useConnectEoaWallet();

  const handleWalletConnected = useCallback(
    (walletAddress: string) => {
      onWalletConnected?.(walletAddress);
    },
    [onWalletConnected]
  );

  const handleDisconnect = useCallback(async () => {
    if (address) {
      await disconnect();
      onWalletDisconnected?.(address);
    }
  }, [address, disconnect, onWalletDisconnected]);

  // Filter external wallets from existing wallets
  const externalWallets = existingWallets.filter(
    (w) => w.walletType === "external_evm" || w.walletType === "external_solana"
  );

  return (
    <>
      <div className={walletLedgerSurfaceClass}>
        <div className={walletLedgerHeaderClass}>
          <div className="flex items-center gap-3">
            <div className={walletLedgerIconFrameClass}>
              <Wallet className="h-5 w-5 text-[var(--bento-text-primary)]" />
            </div>
            <div>
              <h3 className={walletLedgerTitleClass}>External Wallets</h3>
              <p className={walletLedgerDescriptionClass}>
                Connect your MetaMask, Phantom, or other Web3 wallets
              </p>
            </div>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            variant="ghost"
            className={`${walletLedgerSecondaryButtonClass} gap-2`}
          >
            <PlusIcon className="h-4 w-4" />
            Connect Wallet
          </Button>
        </div>

        <div className={walletLedgerSectionBodyClass}>
          {/* Currently connected via Wagmi */}
          {isConnected && connectedWallet && (
            <div className={`${walletLedgerInlineFrameClass} flex items-center justify-between gap-3 px-3 py-3.5`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={walletLedgerIconFrameClass}>
                  {connectedWallet.icon ? (
                    <Image
                      src={connectedWallet.icon}
                      alt={connectedWallet.displayName}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  ) : (
                    <Wallet className="h-4 w-4 text-[var(--settings-foreground-muted)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[var(--settings-foreground-strong)]">
                    {connectedWallet.displayName}
                    <Badge
                      variant="outline"
                      className="border-[var(--settings-accent)]/30 bg-[color-mix(in_oklab,var(--settings-accent)_12%,transparent)] text-xs text-[var(--settings-accent)]"
                    >
                      Active
                    </Badge>
                  </p>
                  <p className={`${walletLedgerSubLabelClass} mono-value`}>
                    {connectedWallet.address.slice(0, 8)}...{connectedWallet.address.slice(-6)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                className={walletLedgerActionButtonClass}
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Existing linked wallets from database */}
          {externalWallets.length > 0 ? (
            <div className="space-y-2">
              <p className={walletLedgerEyebrowClass}>
                Linked Wallets
              </p>
              <div data-settings-row-list className="space-y-2">
                {externalWallets.map((wallet) => {
                  const explorerUrl = resolveExplorerUrl(wallet);
                  return (
                    <div
                      key={wallet.id}
                      className={`${walletLedgerInlineFrameClass} grid gap-3 px-3 py-3.5 md:grid-cols-[minmax(0,1.7fr)_minmax(120px,0.8fr)_auto] md:items-center`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={walletLedgerIconFrameClass}>
                          <Wallet className="h-4 w-4 text-[var(--settings-foreground-muted)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--settings-foreground-strong)]">
                            {wallet.providerName ?? "External Wallet"}
                          </p>
                          <p className={`${walletLedgerSubLabelClass} mono-value`}>
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center md:justify-start">
                        <Badge
                          variant="secondary"
                          className="border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/70 text-xs text-[var(--settings-foreground-muted)]"
                        >
                          {wallet.walletType === "external_solana" ? "Solana" : `Chain ${wallet.chainId ?? "EVM"}`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-start md:justify-end">
                        {explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${walletLedgerActionButtonClass} inline-flex items-center justify-center`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-[var(--settings-elevated)]/70 p-4">
                <Wallet className="h-8 w-8 text-[var(--bento-text-muted)]" />
              </div>
              <p className="mb-2 text-sm text-[var(--settings-foreground-muted)]">
                No external wallets connected
              </p>
              <p className="max-w-sm text-xs text-[var(--settings-foreground-subtle)]">
                Connect your MetaMask, Phantom, or other Web3 wallets to manage assets and conduct transactions.
              </p>
            </div>
          ) : null}

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-[var(--bento-text-muted)]" />
            </div>
          )}
        </div>
      </div>

      <ConnectWalletModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleWalletConnected}
      />
    </>
  );
}
