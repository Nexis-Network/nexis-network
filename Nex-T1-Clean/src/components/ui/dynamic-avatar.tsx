"use client";

import type { CSSProperties } from "react";

import { BrandedAvatar } from "@/components/ui/branded-avatar";
import { cn } from "@/lib/utils";
import { normalizeAvatarSeed } from "@/lib/avatar/branded-avatar";
import type { IconPreference } from "@/lib/user/avatar-preferences";

export type { IconPreference } from "@/lib/user/avatar-preferences";

export function useIconPreference(): IconPreference {
  return "polycon";
}

interface DynamicAvatarProps {
  address: string;
  className?: string;
  size?: number;
  type?: IconPreference;
}

export function DynamicAvatar({
  address,
  className,
  size = 32,
  type: _type,
}: DynamicAvatarProps) {
  const style = {
    "--avatar-size": `${size}px`,
  } as CSSProperties;
  const seed = normalizeAvatarSeed({
    walletAddress: address,
    username: address,
  }) ?? "avatar";

  return (
    <div
      className={cn(
        "flex h-[var(--avatar-size)] w-[var(--avatar-size)] shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={style}
    >
      <BrandedAvatar seed={seed} size={size} className="h-full w-full" />
    </div>
  );
}
