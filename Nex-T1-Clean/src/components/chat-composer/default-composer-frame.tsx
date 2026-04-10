"use client";

import type { PropsWithChildren } from "react";

import { BorderGlow } from "@/components/ui/border-glow";
import {
  COMPOSER_FRAME_CLASS,
  COMPOSER_FRAME_CONTENT_CLASS,
} from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";

type DefaultComposerFrameProps = PropsWithChildren<{
  className?: string;
  composerCardMinHeightClass: string;
  composerCardRadiusClass: string;
  composerWidthClass: string;
  useNexInstantSurface: boolean;
}>;

const NEX_INSTANT_BORDER_GLOW_COLORS = ["#2e89ff", "#71e4ff", "#2e89ff"];
const NEX_INSTANT_BACKGROUND_COLOR = "var(--auth-composer-frame-bg)";
const NEX_INSTANT_BORDER_RADIUS = "var(--auth-composer-radius)";
const NEX_INSTANT_GLOW_RADIUS = "var(--auth-composer-frame-glow-radius)";

export function DefaultComposerFrame({
  children,
  className,
  composerCardMinHeightClass,
  composerCardRadiusClass,
  composerWidthClass,
  useNexInstantSurface,
}: DefaultComposerFrameProps) {
  const frameClassName = cn(
    "relative flex min-w-0 w-full max-w-full flex-col items-start",
    composerWidthClass,
    composerCardRadiusClass,
    composerCardMinHeightClass,
    className,
  );

  if (useNexInstantSurface) {
    return (
      <BorderGlow
        animated
        backgroundColor={NEX_INSTANT_BACKGROUND_COLOR}
        borderRadius={NEX_INSTANT_BORDER_RADIUS}
        className={cn(
          frameClassName,
          "p-[var(--auth-composer-frame-padding)] shadow-[var(--auth-composer-frame-shadow)]",
        )}
        colors={NEX_INSTANT_BORDER_GLOW_COLORS}
        contentClassName={COMPOSER_FRAME_CONTENT_CLASS}
        edgeSensitivity={30}
        fillOpacity={0.5}
        glowColor="204 100 64"
        glowIntensity={0.7}
        glowOpacityMultiplier={0.5}
        glowRadius={NEX_INSTANT_GLOW_RADIUS}
        showDropShadow={false}
      >
        {children}
      </BorderGlow>
    );
  }

  return (
    <div
      className={cn(frameClassName, COMPOSER_FRAME_CLASS)}
      data-composer-frame="true"
    >
      {children}
    </div>
  );
}
