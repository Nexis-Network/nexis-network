"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type WalletConnectorContentProps = {
  icon: string;
  label: string;
  description?: string | null;
  loading?: boolean;
  actionLabel?: string;
  actionIcon?: ReactNode;
  labelClassName?: string;
  descriptionClassName?: string;
};

export function WalletConnectorContent({
  icon,
  label,
  description,
  loading = false,
  actionLabel = "Connect",
  actionIcon,
  labelClassName,
  descriptionClassName,
}: WalletConnectorContentProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center overflow-hidden rounded-full">
          <Image src={icon} alt={`${label} icon`} width={20} height={20} className="size-5 object-contain" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={cn("text-sm font-medium", labelClassName)}>{label}</span>
          {description ? (
            <span className={cn("text-xs", descriptionClassName)}>{description}</span>
          ) : null}
        </div>
      </div>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : actionIcon ? (
        actionIcon
      ) : (
        <span className="text-xs font-regular">{actionLabel}</span>
      )}
    </>
  );
}
