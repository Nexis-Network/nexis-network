"use client";

import { Fragment, useMemo } from "react";

import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getIconCandidates, PLACEHOLDER_ICON } from "@/lib/token-icons";
import { cn } from "@/lib/utils";

type ActiveChainIconsProps = {
  chains: string[];
  className?: string;
  maxVisible?: number;
};

const formatChainLabel = (value: string): string => {
  const normalized = value.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Unknown";
  }
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
};

const resolveChainIcon = (slug: string): string => {
  const [candidate] = getIconCandidates({
    name: slug,
    symbol: slug,
    kind: "network",
  });
  return candidate ?? PLACEHOLDER_ICON;
};

export function ActiveChainIcons({ chains, className, maxVisible = 4 }: ActiveChainIconsProps) {
  const normalizedChains = useMemo(() => {
    return chains
      .map((chain) => chain?.toLowerCase().trim())
      .filter((chain): chain is string => Boolean(chain));
  }, [chains]);

  if (!normalizedChains.length) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No active chains
      </div>
    );
  }

  const visibleChains = normalizedChains.slice(0, maxVisible);
  const remaining = normalizedChains.length - visibleChains.length;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        {visibleChains.map((chain) => {
          const label = formatChainLabel(chain);
          const icon = resolveChainIcon(chain);

          return (
            <Tooltip key={chain}>
              <TooltipTrigger asChild>
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-border/40 bg-background flex items-center justify-center">
                  <Image src={icon} alt={label} width={28} height={28} className="size-full object-contain" unoptimized />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>{label}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remaining > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/40 bg-muted/40 text-xs font-medium text-foreground">
                +{remaining}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="max-w-xs text-sm">
                {normalizedChains.slice(maxVisible).map((chain, index) => (
                  <Fragment key={`${chain}-${index}`}>
                    {index > 0 ? ", " : ""}
                    {formatChainLabel(chain)}
                  </Fragment>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </TooltipProvider>
    </div>
  );
}
