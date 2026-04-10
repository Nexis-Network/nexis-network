import type { CSSProperties } from "react";

const backdropFilterValue = "blur(24px) saturate(180%)";

/**
 * Dropdown surface styles using the menubar design token system.
 * These complement the `.menubar-dropdown` CSS class for cases
 * where inline styles are needed (e.g. motion components).
 */

export const headerDropdownOverlayStyle = {
  backgroundColor:
    "color-mix(in oklab, var(--menubar-solid-bg, #080808) 22%, transparent)",
  backdropFilter: backdropFilterValue,
  WebkitBackdropFilter: backdropFilterValue,
} satisfies CSSProperties;

export const headerDropdownTopStripStyle = {
  backgroundColor: "var(--auth-header-bg, var(--auth-app-bg, #121212))",
} satisfies CSSProperties;

export const headerDropdownPanelStyle = {
  backgroundColor: "var(--auth-header-bg, var(--auth-app-bg, #121212))",
  borderColor: "transparent",
} satisfies CSSProperties;
