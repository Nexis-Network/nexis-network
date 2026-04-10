import Image from "next/image";

import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/animate-ui/components/radix/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WalletBlockie } from "@/components/ui/wallet-blockie";
import { cn, truncateAddress } from "@/lib/utils";
import type { InAppWalletDisplayEntry } from "@/modules/wallets/profile-menu";
import { formatNativeBalance } from "@/modules/wallets/balances/format-balance";
import { Check, Copy, Loader2, Unplug } from "lucide-react";
import { WalletConnectorContent } from "@/components/wallets/wallet-connector-content";

export type WalletConnectorState = {
  id: string;
  label: string;
  description: string;
  icon: string;
  disabled: boolean;
  loading: boolean;
};

type WalletSectionProps = {
  inAppWalletEntries: InAppWalletDisplayEntry[];
  inAppWalletAddress: string | null;
  inAppWalletLoading: boolean;
  activeWalletPrimaryLabel: string;
  activeWalletSecondaryLabel: string;
  activeWalletIcon: string;
  onCopyInAppWallet: (address?: string | null, label?: string) => void;
  onCopyExternalWallet: () => void;
  externalWalletDisplay: string | null;
  externalWalletAddress: string | null;
  activeExternalWalletIcon: string;
  suiWalletDetails?: {
    address: string;
    display: string;
    icon: string;
    balanceDisplay: string | null;
    balanceLoading: boolean;
  } | null;
  onCopySuiWallet?: () => void;
  onDisconnectSuiWallet?: () => void;
  suiDisconnectDisabled?: boolean;
  suiDisconnecting?: boolean;
  walletConnectorStates: WalletConnectorState[];
  onConnectorSelect: (id: string) => void;
  onDisconnectExternalWallet: () => void;
  disconnectDisabled: boolean;
  disconnectingWallet: boolean;
  userId?: string | null;
};

export function WalletSection({
  inAppWalletEntries,
  inAppWalletAddress,
  inAppWalletLoading,
  activeWalletPrimaryLabel,
  activeWalletSecondaryLabel,
  activeWalletIcon,
  onCopyInAppWallet,
  onCopyExternalWallet,
  externalWalletDisplay,
  externalWalletAddress,
  activeExternalWalletIcon,
  suiWalletDetails,
  onCopySuiWallet,
  onDisconnectSuiWallet,
  suiDisconnectDisabled,
  suiDisconnecting,
  walletConnectorStates,
  onConnectorSelect,
  onDisconnectExternalWallet,
  disconnectDisabled,
  disconnectingWallet,
}: WalletSectionProps) {
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-subtle-bg)]">
              <Image src={activeWalletIcon} alt="Active wallet icon" width={24} height={24} className="size-6 object-contain" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium leading-tight">{activeWalletPrimaryLabel}</span>
              <span className="text-xs">{activeWalletSecondaryLabel}</span>
            </div>
          </div>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-80 space-y-1 p-2">
          {inAppWalletEntries.length ? (
            inAppWalletEntries.map((entry) => {
              const formatted =
                entry.address && entry.kind !== "solana"
                  ? truncateAddress(entry.address, 6, 6)
                  : entry.address
                    ? entry.address
                    : null;
              const addressDisplay =
                formatted ?? (entry.placeholder || inAppWalletLoading ? "Provisioning…" : "Awaiting first use");
              const isSelected =
                entry.address && inAppWalletAddress
                  ? entry.address.toLowerCase() === inAppWalletAddress.toLowerCase()
                  : false;
              const balanceDisplay =
                entry.nativeAmount != null
                  ? `${formatNativeBalance(entry.nativeAmount, 4)} ${entry.nativeSymbol}`
                  : `— ${entry.nativeSymbol}`;
              return (
                <DropdownMenuItem
                  key={`${entry.kind}-${entry.id}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (
                      !entry.address ||
                      false
                    ) {
                      return;
                    }
                    onCopyInAppWallet(entry.address, entry.label);
                  }}
                  disabled={!entry.address}
                  className="flex items-center gap-3 rounded-xl py-2"
                >
                  <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-subtle-bg)]">
                    {entry.address ? (
                      <WalletBlockie address={entry.address} className="size-full rounded-full" size={8} scale={4} />
                    ) : (
                      <Image src={entry.icon} alt={`${entry.label} icon`} width={32} height={32} className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <span className="max-w-[150px] truncate font-mono text-xs font-normal">
                            {addressDisplay}
                          </span>
                        </TooltipTrigger>
                        {entry.address ? (
                          <TooltipContent sideOffset={6} align="start">
                            <span className="font-mono text-[11px]">{entry.address}</span>
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                      {isSelected ? <Check className="size-3" /> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.65rem] font-regular uppercase tracking-wide">
                        {entry.label}
                      </span>
                      <span className="text-xs font-regular">{balanceDisplay}</span>
                    </div>
                  </div>
                  {entry.address ? (
                    <Copy className="size-4" />
                  ) : inAppWalletLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                </DropdownMenuItem>
              );
            })
          ) : (
            <DropdownMenuItem disabled className="rounded-xl text-xs">
              In-app wallet will be provisioned on first use
            </DropdownMenuItem>
          )}
          {suiWalletDetails ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onCopySuiWallet?.();
              }}
              disabled={!onCopySuiWallet}
              className="flex items-center justify-between gap-3 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center overflow-hidden rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-subtle-bg)]">
                  <WalletBlockie address={suiWalletDetails.address} className="size-full rounded-full" size={6} scale={4} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Sui wallet</span>
                  <span className="font-mono text-xs">{suiWalletDetails.display}</span>
                  <span className="text-[0.7rem] font-regular">
                    {suiWalletDetails.balanceLoading ? "Fetching balance…" : suiWalletDetails.balanceDisplay ?? "— SUI"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Disconnect Sui wallet"
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-subtle-bg)] transition hover:bg-[var(--auth-menu-hover-bg)]",
                    suiDisconnectDisabled ? "cursor-not-allowed opacity-50" : ""
                  )}
                  disabled={suiDisconnectDisabled}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDisconnectSuiWallet?.();
                  }}
                >
                  {suiDisconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
                </button>
                <Copy className="size-4" />
              </div>
            </DropdownMenuItem>
          ) : null}
          {externalWalletDisplay ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onCopyExternalWallet();
              }}
              className="flex items-center justify-between gap-3 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center overflow-hidden rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-subtle-bg)]">
                  {externalWalletAddress ? (
                    <WalletBlockie address={externalWalletAddress} className="size-full rounded-full" size={6} scale={4} />
                  ) : (
                    <Image src={activeExternalWalletIcon} alt="External wallet icon" width={20} height={20} className="size-5 object-contain" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">External wallet</span>
                  <span className="font-mono text-xs">{externalWalletDisplay}</span>
                </div>
              </div>
              <Copy className="size-4" />
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {walletConnectorStates.length ? (
            walletConnectorStates.map((connector) => (
              <DropdownMenuItem
                key={connector.id}
                onSelect={(event) => {
                  event.preventDefault();
                  onConnectorSelect(connector.id);
                }}
                disabled={connector.disabled}
                className="flex items-center justify-between gap-3 rounded-xl"
              >
                <WalletConnectorContent
                  icon={connector.icon}
                  label={connector.label}
                  description={connector.description}
                  loading={connector.loading}
                  actionLabel="Connect"
                />
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="rounded-xl text-xs">
              No wallet connectors available
            </DropdownMenuItem>
          )}
          {externalWalletAddress ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onDisconnectExternalWallet();
                }}
                variant="destructive"
                disabled={disconnectDisabled || disconnectingWallet}
                className="flex items-center justify-between gap-3 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <Unplug className="size-4" />
                  <span>Disconnect wallet</span>
                </div>
                {disconnectingWallet ? <Loader2 className="size-4 animate-spin" /> : null}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
