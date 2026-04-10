"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AppSidebarToggleProps = {
  className?: string;
};

type AnimatedSidebarToggleIconProps = {
  open: boolean;
  className?: string;
};

const TRANSITION_DURATION = 0.48;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type AnimatedCircleState = {
  x: number[];
  times: number[];
};

type AnimatedCirclePosition = {
  expanded: AnimatedCircleState;
  collapsed: AnimatedCircleState;
  y: number;
};

const animatedCirclePositions: Record<
  "topLeft" | "topRight" | "bottomRight" | "bottomLeft",
  AnimatedCirclePosition
> = {
  topLeft: {
    expanded: { x: [31.5, 14.5, 14.5], times: [0, 0.55, 1] },
    collapsed: { x: [14.5, 14.5, 31.5], times: [0, 0.64, 1] },
    y: 14.5,
  },
  topRight: {
    expanded: { x: [31.5, 14.5, 48.5], times: [0, 0.45, 1] },
    collapsed: { x: [48.5, 14.5, 31.5], times: [0, 0.42, 1] },
    y: 14.5,
  },
  bottomRight: {
    expanded: { x: [31.5, 48.5, 48.5], times: [0, 0.55, 1] },
    collapsed: { x: [48.5, 48.5, 31.5], times: [0, 0.64, 1] },
    y: 48.5,
  },
  bottomLeft: {
    expanded: { x: [31.5, 48.5, 14.5], times: [0, 0.45, 1] },
    collapsed: { x: [14.5, 48.5, 31.5], times: [0, 0.58, 1] },
    y: 48.5,
  },
};

export function AppSidebarToggle({ className }: AppSidebarToggleProps) {
  const { open, toggleSidebar, isMobile } = useSidebar();

  if (isMobile) {
    return null;
  }

  const label = open ? "Hide sidebar" : "Show sidebar";

  return (
    <button
      type="button"
      data-slot="app-sidebar-toggle"
      data-state={open ? "expanded" : "collapsed"}
      aria-label={label}
      aria-pressed={open}
      title={label}
      onClick={toggleSidebar}
      className={cn(
        "inline-flex size-[var(--auth-sidebar-toggle-size)] items-center justify-center rounded-full border border-[var(--auth-sidebar-toggle-border)] bg-[var(--auth-sidebar-toggle-bg)] text-[var(--auth-sidebar-toggle-fg)] shadow-sm backdrop-blur-xl transition-[background-color,color,transform] duration-200 ease-out hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-focus)]",
        className,
      )}
    >
      <AnimatedSidebarToggleIcon open={open} className="size-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function AnimatedSidebarToggleIcon({ open, className }: AnimatedSidebarToggleIconProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const state = open ? "expanded" : "collapsed";

  return (
    <motion.svg
      aria-hidden="true"
      initial={false}
      width="63"
      height="63"
      viewBox="0 0 63 63"
      className={className}
    >
      <AnimatedCircle
        state={state}
        reducedMotion={prefersReducedMotion}
        fill="currentColor"
        zIndexKey="topLeft"
      />
      <AnimatedCircle
        state={state}
        reducedMotion={prefersReducedMotion}
        fill="currentColor"
        zIndexKey="bottomRight"
      />
      <AnimatedCircle
        state={state}
        reducedMotion={prefersReducedMotion}
        fill="currentColor"
        zIndexKey="topRight"
      />
      <AnimatedCircle
        state={state}
        reducedMotion={prefersReducedMotion}
        fill="currentColor"
        zIndexKey="bottomLeft"
      />
    </motion.svg>
  );
}

function AnimatedCircle({
  state,
  reducedMotion,
  fill,
  zIndexKey,
}: {
  state: "expanded" | "collapsed";
  reducedMotion: boolean;
  fill: string;
  zIndexKey: keyof typeof animatedCirclePositions;
}) {
  const config = animatedCirclePositions[zIndexKey];
  const target = config[state];

  return (
    <motion.g
      initial={false}
      animate={
        reducedMotion
          ? { x: target.x[target.x.length - 1], y: config.y }
          : { x: target.x, y: config.y }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: TRANSITION_DURATION,
              ease: EASE,
              times: target.times,
            }
      }
    >
      <circle r="14.5" cx="0" cy="0" fill={fill} />
    </motion.g>
  );
}
