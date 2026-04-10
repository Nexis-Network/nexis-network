"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";
import { useCallback, useState } from "react";

import { Button } from "@/components/settings/shared/settings-button";
import { Badge } from "@/components/ui/badge";
import { CdpSendModal } from "@/components/wallets/cdp/cdp-send-modal";
import { CdpReceiveModal } from "@/components/wallets/cdp/cdp-receive-modal";
import { CdpOnrampModal } from "@/components/wallets/cdp/cdp-onramp-modal";
import { CdpExportModal } from "@/components/wallets/cdp/cdp-export-modal";
import { CdpOfframpModal } from "@/components/wallets/cdp/cdp-offramp-modal";
import { cn } from "@/lib/utils";

import {
  getChainConfig,
  truncateAddress,
  type CdpWalletDetailCardProps,
} from "@/components/settings/wallets/cdp/lib/cdp-chain-config";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { CdpWalletBalance } from "@/components/settings/wallets/cdp/cdp-wallet-balance";
import { CdpWalletActions } from "@/components/settings/wallets/cdp/cdp-wallet-actions";
import { BentoCard } from "@/components/settings/shared/bento-card";

// ---------------------------------------------------------------------------
// CdpWalletDetailCard — orchestrates header, balance, actions, and modals
// ---------------------------------------------------------------------------

export function CdpWalletDetailCard({
  chain,
  address,
  label,
}: CdpWalletDetailCardProps) {
  const router = useRouter();
  const config = getChainConfig(chain);
  const displayLabel = typeof label === "string" && label.trim().length > 0 ? label.trim() : config.name;
  const subtitle = displayLabel === config.name ? "Nex Wallet" : `${config.name} • Nex Wallet`;

  const { data: balance, isLoading, error, refetch } = useCdpBalance(
    address,
    chain,
    config.defaultChainId,
  );

  // Modal states
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [onrampOpen, setOnrampOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [offrampOpen, setOfframpOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  const handleSwap = useCallback(() => {
    router.push("/app");
  }, [router]);

  // ---- Provisioning state (no address yet) ----
  if (!address) {
    return (
      <BentoCard className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.icon}
              alt={config.name}
              className="h-10 w-10 rounded-full"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/wallet-logos/Coinbase.svg"
              alt="Nex Wallet"
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border border-[var(--bento-card)]"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--bento-text-primary)]">{displayLabel}</p>
            <p className="text-xs text-[var(--bento-text-muted)]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-6">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--bento-text-muted)]" />
            <p className="text-sm text-[var(--bento-text-muted)]">Provisioning...</p>
          </div>
        </div>
      </BentoCard>
    );
  }

  // ---- Main card ----
  return (
    <>
      <BentoCard className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.icon}
                alt={config.name}
                className="h-10 w-10 rounded-full"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/wallet-logos/Coinbase.svg"
                alt="Nex Wallet"
                className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border border-[var(--bento-card)]"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--bento-text-primary)]">{displayLabel}</p>
              <p className="text-xs text-[var(--bento-text-muted)]">{subtitle}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px]", config.badgeColor)}
          >
            {config.name}
          </Badge>
        </div>

        {/* Address row */}
        <div className="settings-inline-section flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs mono-value text-[var(--bento-text-muted)]">
              {truncateAddress(address)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            className="flex-shrink-0"
            aria-label="Copy address"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Balance */}
        <CdpWalletBalance
          balance={balance}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
        />

        {/* Actions */}
        <CdpWalletActions
          onSend={() => setSendOpen(true)}
          onReceive={() => setReceiveOpen(true)}
          onSwap={handleSwap}
          onFund={() => setOnrampOpen(true)}
          onStake={() => {
            document
              .getElementById("cdp-staking-section")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          onCashOut={() => setOfframpOpen(true)}
          onExport={() => setExportOpen(true)}
        />
      </BentoCard>

      {/* Modals */}
      <CdpSendModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        fromAddress={address}
        platform={chain}
        chainId={config.defaultChainId}
      />
      <CdpReceiveModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        address={address}
        chain={chain}
      />
      <CdpOnrampModal
        open={onrampOpen}
        onOpenChange={setOnrampOpen}
        address={address}
        chainId={config.defaultChainId}
      />
      <CdpExportModal
        address={address}
        chain={chain}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      {chain === "evm" && (
        <CdpOfframpModal
          open={offrampOpen}
          onOpenChange={setOfframpOpen}
          address={address}
          chainId={config.defaultChainId}
        />
      )}
    </>
  );
}
