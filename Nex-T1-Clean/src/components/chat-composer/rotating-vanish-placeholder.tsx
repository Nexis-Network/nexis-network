"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { COMPOSER_PLACEHOLDER_TEXT_CLASS } from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";

const DEFAULT_ROTATION_MS = 3_200;

type RotatingVanishPlaceholderProps = {
  prompts: readonly string[];
  rotationMs?: number;
  className?: string;
};

function RotatingVanishPlaceholderComponent({
  prompts,
  rotationMs = DEFAULT_ROTATION_MS,
  className,
}: RotatingVanishPlaceholderProps) {
  const sanitizedPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.trim().length > 0),
    [prompts],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRotation = useCallback(() => {
    if (!timeoutRef.current) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const scheduleRotation = useCallback(() => {
    if (timeoutRef.current || sanitizedPrompts.length <= 1) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setActiveIndex((currentIndex) => (currentIndex + 1) % sanitizedPrompts.length);
      scheduleRotation();
    }, rotationMs);
  }, [rotationMs, sanitizedPrompts.length]);

  useEffect(() => {
    setActiveIndex(0);
    if (sanitizedPrompts.length <= 1) {
      stopRotation();
      return;
    }

    scheduleRotation();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stopRotation();
        return;
      }

      scheduleRotation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopRotation();
    };
  }, [sanitizedPrompts, scheduleRotation, stopRotation]);

  if (sanitizedPrompts.length === 0) {
    return null;
  }

  const prompt = sanitizedPrompts[Math.min(activeIndex, sanitizedPrompts.length - 1)] ?? "";

  return (
    <div className="relative flex min-h-6 w-full items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.p
          key={activeIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            "pointer-events-none absolute inset-x-0 overflow-hidden text-ellipsis whitespace-nowrap select-none text-[15px] font-normal leading-6 transform-gpu will-change-transform opacity-70",
            COMPOSER_PLACEHOLDER_TEXT_CLASS,
            className,
          )}
        >
          {prompt}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export const RotatingVanishPlaceholder = memo(RotatingVanishPlaceholderComponent);
