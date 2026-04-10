"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ArrowRightLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { useNetworkCapabilities } from "@/lib/hooks/networks/use-network-capabilities";
import { useNztRollupBalance } from "@/lib/hooks/rollup/use-nzt-rollup-balance";
import type { WalletPortfolio } from "@/lib/user/profile";
import type { ResolvedNetworkCapability } from "@/lib/networks/capabilities";
import { networkConstants } from "@/lib/networks/capabilities";

type NztRollupWalletCardProps = {
  wallets: WalletPortfolio[];
};

function getWalletMetadata(wallet: WalletPortfolio): Record<string, UntypedJson> | null {
  return wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
    ? wallet.metadata
    : null;
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNativeBalance(balance: string | null | undefined): string {
  const value = Number(balance ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "0.0000";
  if (value < 0.0001) return "<0.0001";
  return value.toFixed(4);
}

function findNztRollupWallet(
  wallets: WalletPortfolio[],
  capability: ResolvedNetworkCapability | null,
): WalletPortfolio | null {
  if (!capability) return null;

  const preferred = wallets.find((wallet) => {
    const metadata = getWalletMetadata(wallet);
    const executionProvider =
      typeof metadata?.executionProvider === "string"
        ? metadata.executionProvider.toLowerCase()
        : "";
    const networkKey =
      typeof metadata?.networkKey === "string"
        ? metadata.networkKey.toLowerCase()
        : "";

    return executionProvider === "nzt-rollup" || networkKey === capability.networkKey.toLowerCase();
  });

  if (preferred) return preferred;

  return wallets.find((wallet) => {
    const metadata = getWalletMetadata(wallet);
    const chainId = parsePositiveInteger(metadata?.chainId);
    return chainId === capability.chainId;
  }) ?? null;
}

function openExternalUrl(url: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function NztRollupWalletCard({ wallets }: NztRollupWalletCardProps) {
  const [copied, setCopied] = useState(false);
  const capabilitiesQuery = useNetworkCapabilities();
  const nztCapability = useMemo(
    () =>
      capabilitiesQuery.data?.find(
        (capability) => capability.networkKey === networkConstants.NZT_ROLLUP_NETWORK_KEY,
      ) ?? null,
    [capabilitiesQuery.data],
  );
  const nztWallet = useMemo(
    () => findNztRollupWallet(wallets, nztCapability),
    [wallets, nztCapability],
  );
  const balanceQuery = useNztRollupBalance(nztWallet?.address ?? null);

  const explorerAddressUrl = useMemo(() => {
    if (!nztCapability?.explorerUrl || !nztWallet?.address) return null;
    return `${nztCapability.explorerUrl.replace(/\/+$/, "")}/address/${nztWallet.address}`;
  }, [nztCapability?.explorerUrl, nztWallet?.address]);

  const handleCopy = useCallback(() => {
    if (!nztWallet?.address) return;
    navigator.clipboard.writeText(nztWallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [nztWallet?.address]);

  if (capabilitiesQuery.isLoading) {
    return (
      <BentoCard className="space-y-4">
        <div className="flex items-center gap-3">
          <Image src="/icons/chain-icons/nzt.svg" alt="NZT Rollup" width={40} height={40} className="rounded-full" />
          <div>
            <p className="text-sm font-medium text-[var(--bento-text-primary)]">NZT Rollup Wallet</p>
            <p className="text-xs text-[var(--bento-text-muted)]">Loading capability matrix...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--bento-text-muted)]" />
        </div>
      </BentoCard>
    );
  }

  if (!nztCapability) {
    return (
      <BentoCard className="space-y-4">
        <div className="flex items-center gap-3">
          <Image src="/icons/chain-icons/nzt.svg" alt="NZT Rollup" width={40} height={40} className="rounded-full" />
          <div>
            <p className="text-sm font-medium text-[var(--bento-text-primary)]">NZT Rollup Wallet</p>
            <p className="text-xs text-[var(--bento-text-muted)]">Rollup config not detected</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--bento-border)] bg-[var(--settings-elevated)]/60 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm text-[var(--bento-text-primary)]">
                Add the public NZT rollup env values to enable this wallet lane.
              </p>
              <p className="text-xs text-[var(--bento-text-muted)]">
                Required: `NEXT_PUBLIC_NZT_CHAIN_ID` and `NEXT_PUBLIC_NZT_RPC_URL`
              </p>
            </div>
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src={nztCapability.icon} alt={nztCapability.label} width={40} height={40} className="rounded-full" unoptimized />
          <div>
            <p className="text-sm font-medium text-[var(--bento-text-primary)]">{nztCapability.label}</p>
            <p className="text-xs text-[var(--bento-text-muted)]">
              CDP identity + separate NZT rollup execution lane
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-[var(--settings-accent)]">
          {nztCapability.nativeSymbol} Gas
        </Badge>
      </div>

      {nztWallet?.address ? (
        <div className="settings-inline-section flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs mono-value text-[var(--bento-text-muted)]">
              {truncateAddress(nztWallet.address)}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy NZT rollup address">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--settings-accent)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--bento-border)] bg-[var(--settings-elevated)]/60 p-4">
          <p className="text-sm text-[var(--bento-text-primary)]">No NZT rollup wallet linked yet.</p>
          <p className="mt-1 text-xs text-[var(--bento-text-muted)]">
            Existing CDP auth stays intact. Link an NZT execution wallet under the same account when ready.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--bento-border)] bg-[var(--settings-elevated)]/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--bento-text-muted)]">
            Native Balance
          </p>
          <div className="mt-2">
            {balanceQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading balance...
              </div>
            ) : balanceQuery.error ? (
              <p className="text-sm text-amber-400">{balanceQuery.error.message}</p>
            ) : (
              <p className="text-2xl font-medium text-[var(--bento-text-primary)]">
                {formatNativeBalance(balanceQuery.data?.native.balance)} {nztCapability.nativeSymbol}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--bento-border)] bg-[var(--settings-elevated)]/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--bento-text-muted)]">
            Capability State
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{nztCapability.nativeGasToken ? "Native gas token" : "External gas token"}</Badge>
            <Badge variant={nztCapability.gasSponsorship ? "default" : "secondary"}>
              {nztCapability.gasSponsorship ? "Gas sponsorship ready" : "Manual gas"}
            </Badge>
            <Badge variant="secondary">
              {nztCapability.bridgeAvailable ? "Bridge configured" : "Bridge pending"}
            </Badge>
            <Badge variant="secondary">
              {nztCapability.cdpUserOp ? "Nex Wallet UserOps" : "Sign then broadcast"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          className="justify-between"
          onClick={() => openExternalUrl(nztCapability.bridgeUrl)}
          disabled={!nztCapability.bridgeAvailable}
        >
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Bridge
          </span>
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="justify-between"
          onClick={() => openExternalUrl(explorerAddressUrl)}
          disabled={!explorerAddressUrl}
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Explorer
          </span>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </BentoCard>
  );
}
