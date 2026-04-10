"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

import { APP_THEME_OPTIONS } from "@/components/theme/app-theme-options";
import { ThemeToggleMenu } from "@/components/navigation/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppThemePreference } from "@/lib/hooks/ui/use-app-theme-preference";
import { cn } from "@/lib/utils";
import type { AppTheme } from "@/lib/theme/app-theme";

type FooterThemeToggleProps = {
  className?: string;
  iconClassName?: string;
};

const THEME_TOGGLE_TRANSITION = {
  duration: 0.35,
  ease: "easeInOut",
} as const;

type ThemeToggleState = {
  clipX: number;
  clipY: number;
  circleRadius: number;
  raysScale: number;
  raysOpacity: number;
};

const DARK_STATE: ThemeToggleState = {
  clipX: -11,
  clipY: 14,
  circleRadius: 10,
  raysScale: 0.5,
  raysOpacity: 0,
};

const THEME_TOGGLE_STATE: Record<string, ThemeToggleState> = {
  light: {
    clipX: 0,
    clipY: 0,
    circleRadius: 8,
    raysScale: 1,
    raysOpacity: 1,
  },
  dark: DARK_STATE,
  // "system" can appear before next-themes resolves the OS preference
  system: DARK_STATE,
};

function FooterThemeToggleGlyph({
  theme,
  className,
}: {
  theme: AppTheme;
  className?: string;
}) {
  const clipPathId = useId();
  const prefersReducedMotion = useReducedMotion();
  const state = THEME_TOGGLE_STATE[theme] ?? DARK_STATE;
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : THEME_TOGGLE_TRANSITION;

  return (
    <motion.div layout className="flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
        viewBox="0 0 32 32"
        className={cn("size-full", className)}
      >
        <clipPath id={clipPathId}>
          <motion.path
            animate={{ x: state.clipX, y: state.clipY }}
            transition={transition}
            d="M0-11h25a1 1 0 0017 13v30H0Z"
          />
        </clipPath>
        <g clipPath={`url(#${clipPathId})`}>
          <motion.circle
            initial={false}
            animate={{ r: state.circleRadius }}
            transition={transition}
            cx="16"
            cy="16"
            r={state.circleRadius}
          />
          <motion.g
            initial={false}
            animate={{
              opacity: state.raysOpacity,
              scale: state.raysScale,
            }}
            transition={transition}
            opacity={state.raysOpacity}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M18.3 3.2c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3S14.7.9 16 .9s2.3 1 2.3 2.3zm-4.6 25.6c0-1.3 1-2.3 2.3-2.3s2.3 1 2.3 2.3-1 2.3-2.3 2.3-2.3-1-2.3-2.3zm15.1-10.5c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zM3.2 13.7c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3S.9 17.3.9 16s1-2.3 2.3-2.3zm5.8-7C9 7.9 7.9 9 6.7 9S4.4 8 4.4 6.7s1-2.3 2.3-2.3S9 5.4 9 6.7zm16.3 21c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zm2.4-21c0 1.3-1 2.3-2.3 2.3S23 7.9 23 6.7s1-2.3 2.3-2.3 2.4 1 2.4 2.3zM6.7 23C8 23 9 24 9 25.3s-1 2.3-2.3 2.3-2.3-1-2.3-2.3 1-2.3 2.3-2.3z" />
          </motion.g>
        </g>
      </svg>
    </motion.div>
  );
}

export function FooterThemeToggle({
  className,
  iconClassName,
}: FooterThemeToggleProps) {
  const { currentTheme } = useAppThemePreference();
  const currentThemeLabel =
    APP_THEME_OPTIONS.find((option) => option.value === currentTheme)?.label ??
    APP_THEME_OPTIONS[0].label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change theme. Current theme: ${currentThemeLabel}`}
          className={cn(
            "inline-flex items-center justify-center rounded-full transition-all duration-300 active:scale-95",
            className,
          )}
        >
          <FooterThemeToggleGlyph
            theme={currentTheme}
            className={cn("size-3.5 shrink-0", iconClassName)}
          />
          <span className="sr-only">Open theme menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ThemeToggleMenu showDescriptions={false} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
