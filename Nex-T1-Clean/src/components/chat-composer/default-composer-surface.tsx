"use client";

import { DefaultComposerCard } from "@/components/chat-composer/default-composer-card";
import { COMPOSER_STACK_CLASS } from "@/components/chat-composer/composer-theme";
import type { DefaultComposerSurfaceProps } from "@/components/chat-composer/default-composer-surface.types";

export function DefaultComposerSurface({
  composerStyle,
  useNexInstantSurface,
  voiceUi,
  ...cardProps
}: DefaultComposerSurfaceProps) {
  return (
    <div className={COMPOSER_STACK_CLASS}>
      <DefaultComposerCard
        {...cardProps}
        composerStyle={composerStyle}
        useNexInstantSurface={useNexInstantSurface}
        voiceUi={voiceUi}
      />

      {voiceUi?.voiceError ? (
        <p className="px-3 pb-2 text-xs text-destructive">
          {voiceUi.voiceError}
        </p>
      ) : null}
    </div>
  );
}
