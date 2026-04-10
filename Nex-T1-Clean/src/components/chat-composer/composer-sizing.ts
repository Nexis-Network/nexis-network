"use client";

export type ComposerSizingVariant = "default" | "small";

const DEFAULT_POST_SUBMIT_WIDTH_CLASS = "w-full max-w-[473px]";
const DEFAULT_POST_SUBMIT_MAX_WIDTH_CLASS = "max-w-[473px]";
const APP_POST_SUBMIT_WIDTH_CLASS = "w-full max-w-[var(--auth-composer-width)]";
const APP_POST_SUBMIT_MAX_WIDTH_CLASS = "max-w-[var(--auth-composer-width)]";
const SMALL_POST_SUBMIT_WIDTH_CLASS = "w-full max-w-[462px]";
const SMALL_POST_SUBMIT_MAX_WIDTH_CLASS = "max-w-[462px]";
const SMALL_APP_POST_SUBMIT_WIDTH_CLASS =
  "w-full max-w-[var(--auth-composer-small-width)]";
const SMALL_APP_POST_SUBMIT_MAX_WIDTH_CLASS =
  "max-w-[var(--auth-composer-small-width)]";

type ResolveComposerSizingOptions = {
  showStarsOverlay: boolean;
  variant: ComposerSizingVariant;
};

export function resolveComposerSizing({
  showStarsOverlay,
  variant,
}: ResolveComposerSizingOptions) {
  if (variant === "small") {
    return {
      composerWidthClass: showStarsOverlay
        ? SMALL_APP_POST_SUBMIT_WIDTH_CLASS
        : SMALL_POST_SUBMIT_WIDTH_CLASS,
      composerMaxWidthClass: showStarsOverlay
        ? SMALL_APP_POST_SUBMIT_MAX_WIDTH_CLASS
        : SMALL_POST_SUBMIT_MAX_WIDTH_CLASS,
    };
  }

  return {
    composerWidthClass: showStarsOverlay
      ? APP_POST_SUBMIT_WIDTH_CLASS
      : DEFAULT_POST_SUBMIT_WIDTH_CLASS,
    composerMaxWidthClass: showStarsOverlay
      ? APP_POST_SUBMIT_MAX_WIDTH_CLASS
      : DEFAULT_POST_SUBMIT_MAX_WIDTH_CLASS,
  };
}
