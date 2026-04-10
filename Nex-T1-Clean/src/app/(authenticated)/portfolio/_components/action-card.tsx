"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface ActionButtonProps {
  icon: LucideIcon | string;
  label: string;
  onClick?: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  const isCustomIcon = typeof icon === "string";

  return (
    <button
      onClick={onClick}
      className={cn(
        // Layout: Start aligned (left)
        "group flex flex-col items-start justify-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 transition-all duration-200",
        // Fluid sizing
        "w-full",
        // Colors: semantic accent surface
        "text-primary hover:bg-accent/60"
      )}
    >
      <div className="rounded-lg bg-transparent text-primary transition-colors">
        {isCustomIcon ? (
          <div className="relative h-6 w-6">
            <Image src={icon as string} alt={label} fill sizes="24px" className="object-contain" />
          </div>
        ) : (
          // Cast icon to LucideIcon since we checked isCustomIcon
          (() => {
            const Icon = icon as LucideIcon;
            return <Icon className="h-6 w-6 text-inherit" strokeWidth={2.5} />;
          })()
        )}
      </div>
      <span className="text-xs font-medium text-inherit">
        {label}
      </span>
    </button>
  );
}

export function ActionCard() {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <ActionButton
        icon="/assets/portfolio/swap.svg"
        label="Swap"
        onClick={() => logger.debug("Swap clicked")}
      />
      <ActionButton
        icon="/assets/portfolio/buy.svg"
        label="Buy"
        onClick={() => logger.debug("Buy clicked")}
      />
      <ActionButton
        icon="/assets/portfolio/send.svg"
        label="Send"
        onClick={() => logger.debug("Send clicked")}
      />
      <ActionButton
        icon={MoreHorizontal}
        label="More"
        onClick={() => logger.debug("More clicked")}
      />
    </div>
  );
}
