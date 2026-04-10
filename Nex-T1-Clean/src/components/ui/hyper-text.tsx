"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface HyperTextProps {
  text: string;
  duration?: number;
  className?: string;
  animateOnHover?: boolean;
}

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

export function HyperText({
  text,
  duration = 800,
  className,
  animateOnHover = true,
}: HyperTextProps) {
  const [displayText, setDisplayText] = useState(text.split(""));
  const [trigger, setTrigger] = useState(false);
  const iterations = useRef(0);

  const triggerAnimation = () => {
    iterations.current = 0;
    setTrigger(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!trigger) {
        clearInterval(interval);
        return;
      }
      if (iterations.current < text.length) {
        setDisplayText((t) =>
          t.map((l, i) => {
            if (l === " ") return l;
            if (i <= iterations.current) {
              return text[i];
            }
            return alphabets[Math.floor(Math.random() * alphabets.length)];
          }),
        );
        iterations.current = iterations.current + 0.1;
      } else {
        setTrigger(false);
        clearInterval(interval);
      }
    }, duration / (text.length * 10));

    return () => clearInterval(interval);
  }, [text, duration, trigger]);

  return (
    <span
      className={cn("inline-block overflow-hidden py-[2px] -my-[2px]", className)}
      onMouseEnter={animateOnHover ? triggerAnimation : undefined}
    >
      {displayText.map((letter, i) => (
        <span key={i} className={cn("inline-block", letter === " " ? "w-[0.25em]" : "")}>
          {letter}
        </span>
      ))}
    </span>
  );
}
