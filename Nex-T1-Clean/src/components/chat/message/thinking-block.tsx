"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ai-elements/shimmer";

interface ThinkingBlockProps {
  onClick?: () => void;
  isStreaming?: boolean;
  thoughts?: string;
  currentStep?: string;
  expanded?: boolean;
}

/**
 * ThinkingBlock - Displays AI reasoning process with blurred text effect
 * 
 * Only renders when there's actual thinking content to show.
 * Features a gradient background with blur effects on the streaming text.
 */
export function ThinkingBlock({
  onClick,
  isStreaming = false,
  thoughts = "",
  currentStep = "",
  expanded = false,
}: ThinkingBlockProps) {
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming) {
      startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setSeconds(Math.floor(elapsed));
      }, 250);
      return () => clearInterval(interval);
    }

    startTimeRef.current = null;
    return () => {};
  }, [isStreaming]);

  // Don't render if there's nothing to show
  if (!isStreaming && !thoughts && !currentStep) {
    return null;
  }

  const displayText = thoughts || currentStep || "Processing your request...";
  const statusText = isStreaming ? `Thinking for ${seconds}s` : "Thought complete";
  const subtitleText = isStreaming ? (expanded ? "Collapsing mind" : "Tap to read my mind") : (expanded ? "Hide reasoning" : "View reasoning");
  const statusContent = isStreaming ? (
    <Shimmer
      as="span"
      className="block truncate dark:[--color-muted-foreground:#ffffff] dark:[--color-background:rgba(255,255,255,0.14)]"
      duration={1.6}
      spread={1.5}
    >
      {statusText}
    </Shimmer>
  ) : (
    statusText
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-full max-w-[370px] h-[107px] rounded-2xl overflow-hidden cursor-pointer",
        "border border-[rgba(0,103,168,0.5)]",
        "transition-all duration-200 hover:border-[rgba(0,103,168,0.7)]"
      )}
    >
      {/* Background gradient */}
      <div 
        className="absolute inset-0 z-1"
        style={{
          background: "linear-gradient(90deg, rgba(2, 111, 180, 0.22) 0%, rgba(9, 125, 149, 0.1) 61.45%, rgba(18, 73, 109, 0.2) 100%)",
        }}
      />

      {/* Streamed text area with blur effect */}
      <div className="absolute left-0 right-0 bottom-0 h-[54px] z-0 overflow-hidden">
        {/* Text content */}
        <div 
          className="absolute inset-0 pl-[60px] pr-4 pt-0.5"
          style={{
            fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 274,
            fontSize: "12px",
            lineHeight: "15px",
            color: "var(--foreground)",
            opacity: 0.5,
          }}
        >
          <p className="line-clamp-3">{displayText}</p>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex items-center gap-4 px-4 py-3 h-full">
        {/* Loading indicator */}
        <div className="flex items-center justify-center w-[30px] h-[30px] shrink-0">
          {isStreaming ? (
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-full border-2 border-foreground/20" />
              <div
                className="absolute inset-0 rounded-full border-2 border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin"
                style={{ animationDuration: "1s" }}
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#8eb94f]/20 flex items-center justify-center">
              <svg 
                className="w-4 h-4 text-[#8eb94f]" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 pb-10">
          <p 
            className="text-foreground dark:text-white font-semibold text-lg truncate"
            style={{
              fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 700,
              fontSize: "16px",
              lineHeight: "18px",
            }}
          >
            {statusContent}
          </p>
          <p 
            className="text-foreground/50 dark:text-white/50 truncate"
            style={{
              fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 510,
              fontSize: "14px",
              lineHeight: "17px",
            }}
          >
            {subtitleText}
          </p>
        </div>

        {/* Arrow */}
        <div className="shrink-0">
          <ChevronRight 
            className={cn(
              "w-6 h-6 text-foreground dark:text-white transition-transform",
              expanded && "rotate-90"
            )}
            strokeWidth={2}
          />
        </div>
      </div>
    </div>
  );
}
