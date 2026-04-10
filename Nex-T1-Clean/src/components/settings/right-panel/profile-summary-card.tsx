"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DynamicAvatar } from "@/components/ui/dynamic-avatar";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { useBilling } from "@/lib/hooks/billing/use-billing";
import { usePreferredAvatar, type AvatarWalletOption } from "@/lib/hooks/user/use-preferred-avatar";
import { getSubscriptionTierBadgeClasses, getSubscriptionTierLabel } from "@/lib/billing/subscription-tier";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import { BentoCard } from "../shared/bento-card";

type WalletAction = {
  id: "set-allowance" | "export-private-key" | "send" | "receive" | "connect-profile";
  label: string;
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const WALLET_ACTIONS: WalletAction[] = [
  { id: "set-allowance", label: "Set allowance" },
  { id: "export-private-key", label: "Export private key" },
  { id: "send", label: "Send" },
  { id: "receive", label: "Receive" },
  { id: "connect-profile", label: "Connect additional profile" },
];

function formatUsd(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0.00";
  }
  return USD_FORMATTER.format(value);
}

function buildWalletActionHref(wallet: AvatarWalletOption, action: WalletAction): string {
  if (action.id === "connect-profile") {
    const params = new URLSearchParams({
      source: "wallet-avatar",
      walletAddress: wallet.address,
    });
    return `/settings/connections?${params.toString()}`;
  }

  const params = new URLSearchParams({
    tab: "overview",
    walletAddress: wallet.address,
    walletAction: action.id,
  });

  if (action.id === "set-allowance") {
    params.set("section", "spend-permissions");
  }

  return `/settings/wallets?${params.toString()}`;
}

export function ProfileSummaryCard() {
  const { data: profileData, isLoading } = useProfileAggregate();
  const { plan, loading: billingLoading } = useBilling();
  const { avatarSeed, preferredAddress, activeEmbeddedAddress, walletOptions } = usePreferredAvatar({
    includeConnectedEoa: true,
  });
  const router = useRouter();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);
  const [settingsWalletId, setSettingsWalletId] = useState<string | null>(null);

  const identity = profileData?.identity;
  const displayName =
    identity?.displayName ?? identity?.ensName ?? identity?.username ?? "User";
  const activePlan = billingLoading ? "free" : (plan ?? "free");
  const planLabel = getSubscriptionTierLabel(activePlan);
  const planClasses = getSubscriptionTierBadgeClasses(activePlan);

  useEffect(() => {
    if (walletOptions.length === 0) {
      setSelectedWalletId(null);
      return;
    }

    if (selectedWalletId && walletOptions.some((wallet) => wallet.id === selectedWalletId)) {
      return;
    }

    const preferredLookup = (activeEmbeddedAddress ?? preferredAddress)?.toLowerCase() ?? null;
    const preferredWallet = preferredLookup
      ? walletOptions.find((wallet) => wallet.address.toLowerCase() === preferredLookup)
      : null;
    setSelectedWalletId((preferredWallet ?? walletOptions[0])?.id ?? null);
  }, [activeEmbeddedAddress, preferredAddress, selectedWalletId, walletOptions]);

  const activeWallet = useMemo(() => {
    if (!walletOptions.length) return null;
    return walletOptions.find((wallet) => wallet.id === selectedWalletId) ?? walletOptions[0] ?? null;
  }, [selectedWalletId, walletOptions]);

  const activeWalletAddress = activeWallet?.address ?? activeEmbeddedAddress ?? preferredAddress ?? null;
  const avatarAddress = activeWalletAddress ?? avatarSeed;

  const handleCopyAddress = useCallback(async (wallet: AvatarWalletOption) => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopiedWalletId(wallet.id);
      window.setTimeout(() => {
        setCopiedWalletId((current) => (current === wallet.id ? null : current));
      }, 1500);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  }, []);

  const handleWalletAction = useCallback((wallet: AvatarWalletOption, action: WalletAction) => {
    router.push(buildWalletActionHref(wallet, action));
    setSettingsWalletId(null);
    setSelectorOpen(false);
  }, [router]);

  if (isLoading) {
    return (
      <BentoCard>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full bg-white/5" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28 bg-white/5" />
            <Skeleton className="h-2.5 w-20 bg-white/5" />
          </div>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="overflow-visible">
      <div className="flex items-center gap-3">
        <DropdownMenu open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--bento-border)] bg-[var(--bento-card)] transition hover:border-[var(--bento-text-muted)]"
              aria-label="Select active wallet avatar"
            >
              <DynamicAvatar
                address={avatarAddress}
                size={40}
                className="size-10"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={10}
            className="w-[min(92vw,360px)] p-2"
          >
            {walletOptions.length === 0 ? (
              <div className="rounded-lg border border-[var(--bento-border)] bg-white/[0.03] px-3 py-2 text-xs text-[var(--bento-text-muted)]">
                No Nex Wallets available.
              </div>
            ) : (
              walletOptions.map((wallet) => {
                const isSelected = wallet.id === activeWallet?.id;
                const showSettings = settingsWalletId === wallet.id;
                const isCopied = copiedWalletId === wallet.id;

                return (
                  <div
                    key={wallet.id}
                    className={cn(
                      "mb-2 rounded-lg border p-2.5 last:mb-0",
                      isSelected
                        ? "border-[var(--bento-text-muted)] bg-white/[0.06]"
                        : "border-[var(--bento-border)] bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        onClick={() => {
                          setSelectedWalletId(wallet.id);
                          setSettingsWalletId(null);
                        }}
                      >
                        <DynamicAvatar
                          address={wallet.address}
                          type="jazzicon"
                          size={30}
                          className="size-[30px] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--bento-text-muted)]">
                            {wallet.kind}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="truncate text-[11px] font-[family-name:var(--font-geist-mono)] font-normal text-[var(--bento-text-primary)]">
                              {wallet.address}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void handleCopyAddress(wallet);
                              }}
                              className="shrink-0 rounded p-0.5 text-[var(--bento-text-muted)] transition hover:bg-white/10 hover:text-[var(--bento-text-primary)]"
                              aria-label="Copy wallet address"
                            >
                              {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                            </button>
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                          type="button"
                          className="rounded p-0.5 text-[var(--bento-text-muted)] transition hover:bg-white/10 hover:text-[var(--bento-text-primary)]"
                          aria-label="Wallet settings"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setSettingsWalletId((current) => current === wallet.id ? null : wallet.id);
                          }}
                        >
                          <Settings2 className="size-3.5" />
                        </button>
                        <span className="text-[11px] font-[family-name:var(--font-geist-mono)] font-normal text-[var(--bento-text-primary)]">
                          {formatUsd(wallet.netWorthUsd)}
                        </span>
                      </div>
                    </div>

                    {showSettings ? (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[var(--bento-border)] pt-2">
                        {WALLET_ACTIONS.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            className="rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-2 py-1.5 text-[10px] text-[var(--bento-text-muted)] transition hover:bg-white/5 hover:text-[var(--bento-text-primary)]"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleWalletAction(wallet, action);
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[var(--bento-text-primary)]">{displayName}</span>
            <Badge variant="outline" className={`h-5 px-1.5 text-[9px] uppercase tracking-wide ${planClasses}`}>
              {planLabel}
            </Badge>
          </div>
          <p className="truncate text-[11px] font-[family-name:var(--font-geist-mono)] font-normal text-[var(--bento-text-muted)]">
            {activeWalletAddress ?? "No active Nex Wallet"}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
