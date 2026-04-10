"use client";

import { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type UserPresenceAvatarProps = {
  icon: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  fallback?: ReactNode;
};

export function UserPresenceAvatar({
  icon,
  name,
  size = 28,
  className,
  fallback,
}: UserPresenceAvatarProps) {
  const dimension = Math.max(14, Math.min(40, size));
  const padding = Math.max(2, Math.round(dimension * 0.15));
  const innerSize = Math.max(6, dimension - padding * 2);

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm",
            className,
          )}
          style={{ width: dimension, height: dimension, padding }}
        >
          {icon ? (
            <div className="relative" style={{ width: innerSize, height: innerSize }}>
              <Image
                src={icon}
                alt={name}
                fill
                sizes={`${innerSize}px`}
                className="object-contain"
              />
            </div>
          ) : fallback ? (
            fallback
          ) : (
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{initials(name)}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{name}</TooltipContent>
    </Tooltip>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
