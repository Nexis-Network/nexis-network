"use client";

import { cn } from "@/lib/utils";
import { useChainId } from "wagmi";
import { useGasPrices } from "@/hooks/useGasPrices";
import { HeaderNotifications } from "@/components/app-header/header-notifications";
import Image from "next/image";

interface SettingsPromoBannerProps {
  className?: string;
}

export function SettingsPromoBanner({ className }: SettingsPromoBannerProps) {
  const chainId = useChainId();
  const { formattedGas } = useGasPrices(chainId);
  const gasDisplay = formattedGas ? `${formattedGas} GWEI` : "-";

  return (
    <div
      className={cn(
        "bento-card relative flex h-[112px] w-full flex-col justify-between gap-4 border border-[var(--bento-border)] bg-[var(--bento-card)] !p-6",
        className
      )}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--bento-text-muted)]">
            Stake NZT to earn rewards and free Nex-T1 credits
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-3 py-1 text-[11px] text-[var(--bento-text-primary)]">
            <span className="size-2 rounded-full bg-[var(--settings-foreground-subtle)]" />
            Coming soon
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-3 py-1.5">
            <Image src="/assets/footer/gas.svg" alt="Gas" width={14} height={14} className="opacity-85" />
            <span className="font-mono text-[11px] font-medium leading-[14px] text-[var(--settings-foreground-muted)]">
              {gasDisplay}
            </span>
          </div>
          <HeaderNotifications triggerClassName="size-8 rounded-[10px] border border-[var(--bento-border)] bg-[var(--settings-elevated)] p-0" iconClassName="size-4" />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <span className="flex items-center text-[28px] leading-[32px] text-[var(--bento-text-primary)]">—</span>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-3 py-2">
          <div className="h-[15px] w-[15px] rounded-full border border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)]" />
          <div className="h-[10px] w-px bg-[var(--bento-border)]" />
          <span className="text-[8px] uppercase tracking-[0.18em] text-[var(--bento-text-muted)]">iocoin</span>
        </div>
      </div>
    </div>
  );
}
