"use client";

import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { useWalletSummaries } from "@/lib/hooks/wallets/profile/use-wallet-summaries";
import { formatFiat } from "@/lib/formatters/wallet";
import { useSidebarStore } from "@/stores/use-sidebar-store";
import Image from "next/image";

export function TotalWalletBalance({ variant = "default" }: { variant?: "default" | "figma" }) {
  const { isAuthenticated, status } = useAuthContext();
  const { data: summaries, isLoading } = useWalletSummaries({ 
    enabled: status === "authenticated",
  });
  const { togglePanel } = useSidebarStore();

  const totalBalance = summaries?.aggregated?.estimatedValueUsd ?? 0;

  if (!isAuthenticated) return null;

  if (variant === "figma") {
    return (
      <button
        type="button"
        onClick={() => togglePanel("wallets")}
        className="flex min-h-11 items-center gap-[6px] rounded-full px-2 text-[var(--auth-nav-text)] transition-colors hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-nav-text-active)] md:min-h-0 md:rounded-none md:px-0"
        aria-label="Open wallets panel"
      >
        <Image src="/assets/footer/eth.svg" alt="" width={12} height={12} className="size-3" />
        <span className="pt-[2px] font-mono text-xs leading-[12px] text-[var(--auth-nav-text)]">
          {isLoading ? "$0.00" : formatFiat(totalBalance)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => togglePanel("wallets")}
      className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--auth-menu-hover-bg)]"
    >
      <Image src="/assets/footer/eth.svg" alt="" width={14} height={14} className="size-3.5" />
      <span className="text-[13px] font-medium text-[var(--auth-nav-text)] transition-colors group-hover:text-[var(--auth-nav-text-active)]">
        {isLoading ? "..." : formatFiat(totalBalance)}
      </span>
    </button>
  );
}
