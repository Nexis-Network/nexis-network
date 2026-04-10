import type { CSSProperties } from "react";

/**
 * Shared glass surface styling that mirrors the header dropdown treatment.
 * Combines a subtle transparent background with layered inset shadows.
 */
export const glassSurfaceStyle: CSSProperties = {
  boxShadow:
    "inset 1px 1px 0px -0.5px rgba(38, 38, 38, 0.21), inset -1px -1px 0px -0.5px rgba(38, 38, 38, 0.21), inset 1px 1px 0.5px -1px rgba(255, 255, 255, 0.21), inset -1px -1px 0.5px -1px rgba(255, 255, 255, 0.21), inset 0px 0px 3px rgba(255, 255, 255, 0.105), inset 0px 0px 16px rgba(38, 38, 38, 0.21)",
};

/**
 * Utility classList for glass surfaces. Designed to be combined with component-specific sizing classes.
 */
export const glassSurfaceClass =
  "bg-[#f5f5f7] text-foreground backdrop-blur-[14px] border border-border dark:bg-[#0f0f10] dark:text-foreground dark:border-white/10";

/**
 * Optional translucency helper for glass surfaces that need ~20% opacity backgrounds.
 */
export const glassSurfaceTranslucentClass =
  "bg-[rgba(245,245,247,0.2)] dark:bg-[rgba(15,15,16,0.2)]";

/**
 * Dark-mode-only translucency helper for surfaces that should stay solid in light mode.
 */
export const glassSurfaceDarkTranslucentClass = "dark:bg-[rgba(15,15,16,0.2)]";

/**
 * Drop shadow utility for surfaces that sit against the right edge of the viewport.
 * Keeps the visual treatment in Tailwind so we can rely on `drop-shadow-sm`.
 */
export const rightDockedDropShadowClass =
  "drop-shadow-sm [--drop-shadow-sm:4px_0px_12px_rgba(15,15,15,0.25)]";
