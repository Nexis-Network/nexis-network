/**
 * Streamdown Plugin Configuration
 *
 * Streamdown v1.6.11 bundles ALL required plugins in its default pipeline:
 *
 * Default rehype: raw, katex, sanitize, harden
 * Default remark: gfm, math, cjkFriendly, cjkFriendlyGfmStrikethrough
 *
 * This means @streamdown/code, @streamdown/mermaid, @streamdown/math, and
 * @streamdown/cjk packages are NOT needed — they're already built-in.
 *
 * This module exports customization overrides only (e.g. mermaid theme).
 * Plugin instances are MODULE-LEVEL singletons for stable references —
 * Streamdown's block-level memoization compares references, so recreating
 * objects per-render defeats caching and causes full re-parsing.
 */

import type { MermaidConfig } from "mermaid";
import type { BundledTheme } from "shiki";

/**
 * Mermaid diagram config for dark-themed rendering.
 * Passed to <Streamdown mermaid={{ config }}>
 */
export const mermaidConfig: { config: MermaidConfig } = {
  config: {
    theme: "dark",
  },
} as const;

/**
 * Shiki theme tuple [light, dark] for code highlighting.
 * Streamdown requires a 2-tuple. Since the app is dark-only,
 * both entries use the same dark theme.
 */
export const shikiTheme: [BundledTheme, BundledTheme] = [
  "github-dark-default",
  "github-dark-default",
];
