"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = useCallback(
    (currentDirection: Direction): Direction => {
      const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
      const currentIndex = directions.indexOf(currentDirection);
      const nextIndex = clockwise
        ? (currentIndex - 1 + directions.length) % directions.length
        : (currentIndex + 1) % directions.length;
      return directions[nextIndex];
    },
    [clockwise]
  );

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(24% 58% at 50% 0%, color-mix(in oklab, var(--primary) 96%, transparent) 0%, color-mix(in oklab, var(--primary) 84%, transparent) 16%, color-mix(in oklab, var(--accent) 72%, transparent) 44%, color-mix(in oklab, var(--primary) 68%, transparent) 68%, color-mix(in oklab, var(--foreground) 40%, transparent) 88%, transparent 100%)",
    LEFT: "radial-gradient(18% 46% at 0% 50%, color-mix(in oklab, var(--primary) 96%, transparent) 0%, color-mix(in oklab, var(--primary) 84%, transparent) 16%, color-mix(in oklab, var(--accent) 72%, transparent) 44%, color-mix(in oklab, var(--primary) 68%, transparent) 68%, color-mix(in oklab, var(--foreground) 40%, transparent) 88%, transparent 100%)",
    BOTTOM:
      "radial-gradient(24% 58% at 50% 100%, color-mix(in oklab, var(--primary) 96%, transparent) 0%, color-mix(in oklab, var(--primary) 84%, transparent) 16%, color-mix(in oklab, var(--accent) 72%, transparent) 44%, color-mix(in oklab, var(--primary) 68%, transparent) 68%, color-mix(in oklab, var(--foreground) 40%, transparent) 88%, transparent 100%)",
    RIGHT:
      "radial-gradient(18% 46% at 100% 50%, color-mix(in oklab, var(--primary) 96%, transparent) 0%, color-mix(in oklab, var(--primary) 84%, transparent) 16%, color-mix(in oklab, var(--accent) 72%, transparent) 44%, color-mix(in oklab, var(--primary) 68%, transparent) 68%, color-mix(in oklab, var(--foreground) 40%, transparent) 88%, transparent 100%)",
  };

  const highlight =
    "radial-gradient(90% 210% at 50% 50%, color-mix(in oklab, var(--foreground) 82%, transparent) 0%, color-mix(in oklab, var(--primary) 78%, transparent) 16%, color-mix(in oklab, var(--primary) 66%, transparent) 36%, color-mix(in oklab, var(--accent) 64%, transparent) 56%, color-mix(in oklab, var(--primary) 56%, transparent) 74%, color-mix(in oklab, var(--foreground) 34%, transparent) 88%, transparent 100%)";

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1400);

    return () => clearInterval(interval);
  }, [duration, rotateDirection]);

  const Component = Tag as React.ElementType<React.HTMLAttributes<HTMLElement>>;

  return (
    <Component
      className={cn(
        "relative flex h-min w-fit flex-col content-center items-center justify-center gap-10 overflow-visible rounded-full border border-border bg-background/20 p-px decoration-clone transition duration-500 hover:bg-background/30",
        containerClassName
      )}
      {...props}
    >
      <div className={cn("z-10 w-auto rounded-[inherit] bg-background px-4 py-2 text-foreground", className)}>{children}</div>

      <motion.div
        className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{
          filter: "blur(2px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: `${highlight}, ${movingMap[direction]}`,
        }}
        transition={{ ease: [0.35, 0.05, 0.25, 1], duration: (duration ?? 1) * 1.2 }}
      />

      <div className="absolute inset-[2px] z-[1] flex-none rounded-[100px] bg-background" />

      <motion.div
        className="pointer-events-none absolute inset-0 z-[5] flex-none overflow-hidden rounded-[inherit] mix-blend-soft-light"
        style={{
          backgroundImage: "url('/assets/Noise.png')",
          backgroundPosition: "0 0",
          backgroundRepeat: "repeat",
          backgroundSize: "60px 60px",
        }}
        initial={false}
        animate={{ opacity: 0.2 }}
        transition={{ ease: [0.35, 0.05, 0.25, 1], duration: 0.24 }}
      />
    </Component>
  );
}
