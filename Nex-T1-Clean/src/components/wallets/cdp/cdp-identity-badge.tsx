"use client";

import Image from "next/image";
import { useCdpIdentity } from "@/lib/hooks/cdp/use-cdp-identity";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CdpIdentityBadgeProps = {
  /** The EVM address to resolve and display. */
  address: string;
  /** Show the resolved avatar next to the name. Default: `true`. */
  showAvatar?: boolean;
  /** Truncate the fallback address display. Default: `true`. */
  truncate?: boolean;
  /** Additional CSS classes for the root container. */
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Reusable address display that shows a human-readable name when available.
 *
 * - If name resolved: [Avatar] name.base (with address tooltip)
 * - If no name: 0x1234...5678 (truncated)
 * - Loading: shimmer placeholder
 */
export function CdpIdentityBadge({
  address,
  showAvatar = true,
  truncate = true,
  className,
}: CdpIdentityBadgeProps) {
  const { name, avatar, source, isLoading } = useCdpIdentity(address);

  // Loading state: shimmer placeholder
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {showAvatar && (
          <div className="h-4 w-4 animate-pulse rounded-full bg-white/10" />
        )}
        <div className="h-3.5 w-20 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  // Name resolved: show name with tooltip for full address
  if (name) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 cursor-default",
              className,
            )}
          >
            {showAvatar && avatar && (
              <Image
                src={avatar}
                alt={name}
                width={16}
                height={16}
                className="h-4 w-4 rounded-full object-cover"
                unoptimized
              />
            )}
            {showAvatar && !avatar && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold text-white/60">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-medium text-white">
              {name}
            </span>
            {source && (
              <span className="text-[10px] text-muted-foreground">
                ({source === "basename" ? "Base" : "ENS"})
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{address}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  // No name resolved: show truncated or full address
  const displayAddress = truncate ? truncateAddress(address) : address;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 cursor-default",
            className,
          )}
        >
          <span className="text-xs font-mono text-muted-foreground">
            {displayAddress}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-mono text-xs">{address}</span>
      </TooltipContent>
    </Tooltip>
  );
}
