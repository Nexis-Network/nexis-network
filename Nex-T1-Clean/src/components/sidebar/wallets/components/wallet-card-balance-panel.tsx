"use client";

import { cn } from "@/lib/utils";

type WalletCardBalancePanelProps = {
  amountLabel: string;
  changeLabel: string;
  changeToneClassName: string;
};

export function WalletCardBalancePanel({
  amountLabel,
  changeLabel,
  changeToneClassName,
}: WalletCardBalancePanelProps) {
  return (
    <div className="pointer-events-none flex flex-col items-center justify-center px-4 py-2 text-center select-none">
      <p className="text-[12px] font-medium tracking-[0.04em] text-white/72">Balance</p>
      <p className="mt-2 text-[40px] font-light leading-none tracking-[-0.06em] text-white sm:text-[42px]">
        {amountLabel}
      </p>
      <p className={cn("mt-2 text-[11px] font-medium tracking-[0.02em]", changeToneClassName)}>
        {changeLabel}
      </p>
    </div>
  );
}
