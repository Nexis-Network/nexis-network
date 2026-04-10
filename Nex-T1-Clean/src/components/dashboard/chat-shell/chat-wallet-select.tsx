"use client";

import { useEffect, useMemo } from "react";
import { Check, Wallet } from "lucide-react";

import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { useSelectedWallet } from "@/hooks/wallets/use-selected-wallet";
import { GlassMaskImage } from "@/components/ui/glass-mask-image";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { normalizeSelectedWalletAddress } from "@/hooks/wallets/use-selected-wallet.helpers";

import {
  buildChatEmbeddedWalletLanes,
  resolveActiveChatEmbeddedWalletLane,
} from "./chat-wallet-select.helpers";

/**
 * Embedded chain selector placed in the top-right corner of the chat container.
 * Mirrors the sidebar toggle button size and positioning convention.
 *
 * Integrates with the global SelectedWalletProvider so the agent receives
 * the chosen embedded blockchain lane as wallet context for transactions,
 * swaps, portfolio analysis, and other onchain actions.
 */
export function ChatWalletSelect({ className }: { className?: string }) {
  const { data: userWallets } = useUserWallets();
  const cdp = useResolvedCdpWallets();
  const { selectedWallet, setSelectedWallet } = useSelectedWallet();

  const lanes = useMemo(
    () =>
      buildChatEmbeddedWalletLanes({
        evmAddress: cdp.evmAddress,
        solanaAddress: cdp.solanaAddress,
        selectedWallet,
        wallets: userWallets?.wallets ?? [],
      }),
    [cdp.evmAddress, cdp.solanaAddress, selectedWallet, userWallets?.wallets],
  );
  const activeLane = useMemo(
    () => resolveActiveChatEmbeddedWalletLane(lanes, selectedWallet),
    [lanes, selectedWallet],
  );
  const hasAvailableLane = lanes.some((lane) => !lane.disabled);

  useEffect(() => {
    if (!activeLane?.selection) return;

    const selectedMatchesActive =
      normalizeSelectedWalletAddress(selectedWallet?.address) ===
        normalizeSelectedWalletAddress(activeLane.address) &&
      ((activeLane.platform === "evm" &&
        selectedWallet?.kind === "cdp_evm_smart") ||
        (activeLane.platform === "solana" &&
          selectedWallet?.kind === "cdp_solana_embedded"));

    if (!selectedMatchesActive) {
      setSelectedWallet(activeLane.selection);
    }
  }, [activeLane, selectedWallet, setSelectedWallet]);

  if (!hasAvailableLane || !activeLane) {
    return (
      <div
        className={cn(
          "inline-flex size-[var(--auth-sidebar-toggle-size)] items-center justify-center rounded-full border border-[var(--auth-sidebar-toggle-border)] bg-[var(--auth-sidebar-toggle-bg)] text-[var(--auth-sidebar-toggle-fg)] shadow-sm backdrop-blur-xl",
          className,
        )}
        title="No embedded wallets available"
      >
        <GlassMaskImage
          src={LIQUID_GLASS_LOGOS.ethereum}
          alt="No wallets"
          size={20}
          className="opacity-40"
        />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="chat-wallet-select"
          aria-label={`Active AI wallet context: ${activeLane.label}`}
          title="Switch embedded blockchain lane"
          className={cn(
            "inline-flex size-[var(--auth-sidebar-toggle-size)] items-center justify-center rounded-full border border-[var(--auth-sidebar-toggle-border)] bg-[var(--auth-sidebar-toggle-bg)] text-[var(--auth-sidebar-toggle-fg)] shadow-sm backdrop-blur-xl transition-[background-color,color,transform] duration-200 ease-out hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]",
            className,
          )}
        >
          {activeLane.chainIcon ? (
            <GlassMaskImage
              src={activeLane.chainIcon}
              alt={activeLane.chainName}
              size={20}
            />
          ) : (
            <Wallet className="size-4" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[260px] p-1.5"
      >
        <DropdownMenuLabel className="px-2 pb-0 text-[10px] uppercase tracking-[0.18em]">
          AI Wallet Context
        </DropdownMenuLabel>
        <div className="px-2 pb-2 text-[10px] leading-4 text-[var(--auth-menu-muted)]">
          Choose the embedded blockchain lane the AI should use for onchain actions.
        </div>
        <DropdownMenuSeparator />
        {lanes.map((lane) => {
          const isActive = activeLane.id === lane.id;
          return (
            <DropdownMenuItem
              key={lane.id}
              disabled={lane.disabled}
              onSelect={() => {
                if (lane.selection) {
                  setSelectedWallet(lane.selection);
                }
              }}
              className="gap-3 rounded-lg px-3 py-2.5 text-xs"
            >
              <GlassMaskImage
                src={lane.chainIcon}
                alt={lane.chainName}
                size={20}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {lane.label}
                </span>
                <span className="truncate font-mono text-xs text-foreground">
                  {lane.details}
                </span>
              </div>
              {isActive && (
                <Check className="ml-auto size-3.5 shrink-0 text-emerald-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
