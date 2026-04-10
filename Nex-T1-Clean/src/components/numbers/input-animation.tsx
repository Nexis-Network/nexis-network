"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

type AnimatedNumberInputProps = React.ComponentProps<"input"> & {
  align?: "left" | "center" | "right";
  containerClassName?: string;
  hideCaretWhenEmpty?: boolean;
};

const digitTransition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.6,
} as const;

function normalizeInputValue(value: AnimatedNumberInputProps["value"] | AnimatedNumberInputProps["defaultValue"]) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("");
  return String(value);
}

function resolveAlignmentClasses(align: AnimatedNumberInputProps["align"]) {
  switch (align) {
    case "right":
      return "justify-end text-right";
    case "center":
      return "justify-center text-center";
    default:
      return "justify-start text-left";
  }
}

const AnimatedNumberInput = React.forwardRef<HTMLInputElement, AnimatedNumberInputProps>(
  function AnimatedNumberInput(
    {
      align = "left",
      className,
      containerClassName,
      defaultValue,
      hideCaretWhenEmpty = false,
      onChange,
      value,
      ...props
    },
    forwardedRef,
  ) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(() => normalizeInputValue(defaultValue));
    const resolvedValue = isControlled ? normalizeInputValue(value) : internalValue;

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) {
          setInternalValue(event.target.value);
        }
        onChange?.(event);
      },
      [isControlled, onChange],
    );

    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        <input
          {...props}
          ref={forwardedRef}
          value={resolvedValue}
          onChange={handleChange}
          className={cn(
            className,
            "relative z-10 [appearance:textfield] caret-foreground text-transparent",
            "selection:bg-primary selection:text-primary-foreground",
            "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            hideCaretWhenEmpty && resolvedValue === "" && "caret-transparent",
          )}
        />
        {resolvedValue !== "" ? (
          <div
            aria-hidden="true"
            className={cn(
              className,
              "pointer-events-none absolute inset-0 flex items-center overflow-hidden border-transparent bg-transparent shadow-none outline-none",
              resolveAlignmentClasses(align),
            )}
          >
            <div className={cn("flex min-w-0 max-w-full items-center gap-0 whitespace-pre", resolveAlignmentClasses(align))}>
              <AnimatePresence initial={false} mode="popLayout">
                {resolvedValue.split("").map((character, index) => (
                  <motion.span
                    key={`${character}-${index}`}
                    className="inline-block"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={digitTransition}
                  >
                    {character}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

AnimatedNumberInput.displayName = "AnimatedNumberInput";

function InputAnimation() {
  const [inputValue, setInputValue] = React.useState("");

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="-mt-10 mb-20 grid content-start justify-items-center gap-6 text-center">
        <span className="after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:content-['']">
          Try Entering a number
        </span>
      </div>
      <AnimatedNumberInput
        align="center"
        className="w-full cursor-pointer border-0 bg-transparent px-0 text-center text-[45px] font-semibold tracking-tight caret-white outline-none"
        containerClassName="w-full max-w-[12rem]"
        hideCaretWhenEmpty
        inputMode="decimal"
        onChange={(event) => setInputValue(event.target.value)}
        placeholder="000"
        value={inputValue}
      />
    </div>
  );
}

export { AnimatedNumberInput, InputAnimation };
