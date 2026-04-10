"use client";

import { resolveComposerSizing } from "@/components/chat-composer/composer-sizing";
import {
  COMPOSER_CARD_INPUT_MIN_HEIGHT_CLASS,
  COMPOSER_CARD_VOICE_MIN_HEIGHT_CLASS,
  COMPOSER_CARD_VOICE_MIN_HEIGHT_COMPACT_CLASS,
  COMPOSER_FRAME_RADIUS_CLASS,
  COMPOSER_INNER_RADIUS_CLASS,
} from "@/components/chat-composer/composer-theme";

const NEX_INSTANT_MODEL_KEY = "nex-t1-free";

type ResolveDefaultComposerLayoutArgs = {
  selectedModelValue: string;
  showStarsOverlay: boolean;
};

export function resolveDefaultComposerLayout({
  selectedModelValue,
  showStarsOverlay,
}: ResolveDefaultComposerLayoutArgs) {
  const useNexInstantSurface =
    showStarsOverlay && selectedModelValue === NEX_INSTANT_MODEL_KEY;
  const { composerMaxWidthClass, composerWidthClass } = resolveComposerSizing({
    showStarsOverlay,
    variant: "default",
  });

  return {
    composerCardMinHeightClass: showStarsOverlay
      ? "min-h-[var(--auth-composer-min-height)]"
      : "",
    composerCardRadiusClass: COMPOSER_FRAME_RADIUS_CLASS,
    composerInnerGapClass: showStarsOverlay
      ? "gap-[var(--auth-composer-surface-gap)]"
      : "gap-1",
    composerInnerMinHeightClass: showStarsOverlay
      ? "min-h-[var(--auth-composer-surface-height)]"
      : "",
    composerInnerPaddingClass: useNexInstantSurface
      ? "px-3 pb-1.5 pt-0"
      : showStarsOverlay
        ? "px-[var(--auth-composer-surface-padding-x)] pb-[var(--auth-composer-surface-padding-bottom)] pt-0"
        : "px-3 pb-2 pt-0",
    composerInnerRadiusClass: COMPOSER_INNER_RADIUS_CLASS,
    composerInputMinHeightClass: showStarsOverlay
      ? "min-h-[var(--auth-composer-input-wrapper-height)]"
      : COMPOSER_CARD_INPUT_MIN_HEIGHT_CLASS,
    composerMaxWidthClass,
    composerVoicePanelMinHeightClass: showStarsOverlay
      ? COMPOSER_CARD_VOICE_MIN_HEIGHT_COMPACT_CLASS
      : COMPOSER_CARD_VOICE_MIN_HEIGHT_CLASS,
    composerWidthClass,
    isComposerGradientActive: !useNexInstantSurface,
    useNexInstantSurface,
  };
}
