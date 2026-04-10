"use client";

import type { AppTheme } from "@/lib/theme/app-theme";

const THEME_TRANSITION_STYLE_ID = "app-theme-transition-styles";

const THEME_TRANSITION_CSS = `
  ::view-transition-group(root) {
    animation-duration: 0.72s;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

  ::view-transition-old(root) {
    animation: none;
    z-index: -1;
  }

  ::view-transition-new(root) {
    animation: app-theme-circle-blur 0.72s both;
  }

  @keyframes app-theme-circle-blur {
    from {
      clip-path: circle(0% at 50% 50%);
      filter: blur(12px);
    }

    55% {
      filter: blur(4px);
    }

    to {
      clip-path: circle(100% at 50% 50%);
      filter: blur(0);
    }
  }
`;

function ensureThemeTransitionStyle(): void {
  if (typeof window === "undefined") {
    return;
  }

  let style = document.getElementById(
    THEME_TRANSITION_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = THEME_TRANSITION_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = THEME_TRANSITION_CSS;
}

export function runAppThemeTransition(params: {
  nextTheme: AppTheme;
  setTheme: (theme: string) => void;
}): void {
  const { nextTheme, setTheme } = params;
  ensureThemeTransitionStyle();

  if (typeof document === "undefined") {
    setTheme(nextTheme);
    return;
  }

  const switchTheme = (): void => {
    setTheme(nextTheme);
  };

  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };

  if (!transitionDocument.startViewTransition) {
    switchTheme();
    return;
  }

  transitionDocument.startViewTransition(switchTheme);
}
