"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

interface ActionSlideButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  loading?: boolean;
}

export function ActionSlideButton({
  label,
  loading,
  className,
  disabled,
  ...props
}: ActionSlideButtonProps) {
  return (
    <>
      <style jsx>{`
        @keyframes arrow {
          0% {
            opacity: 0;
            margin-left: 0px;
          }
          100% {
            opacity: 1;
            margin-left: 10px;
          }
        }
        .slide-arrow-animation {
          animation: arrow 1s linear infinite;
        }
        .icon-transition {
          transition-duration: 1.5s;
        }
      `}</style>
      <button
        disabled={disabled || loading}
        className={cn(
          "group relative flex h-[45px] w-full items-center justify-between rounded-[40px] border border-black/10 bg-white/80 shadow-[0px_5px_20px_rgba(15,23,42,0.08)] transition-all disabled:cursor-not-allowed disabled:opacity-50 dark:border-none dark:bg-[#1d2129] dark:shadow-[0px_5px_10px_#bebebe]",
          className
        )}
        {...props}
      >
        <span className="flex h-full flex-1 items-center justify-center text-[1.1em] tracking-[1.2px] text-[#171717] dark:text-white">
          {loading ? "Processing..." : label}
        </span>
        <span className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-white dark:border-[#1d2129] dark:bg-[#1d2129]">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#666666] dark:text-[#C4c4c4]" />
          ) : (
            <svg
              width={16}
              height={19}
              viewBox="0 0 16 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#666666] icon-transition group-hover:slide-arrow-animation dark:text-[#C4c4c4]"
            >
              <circle cx="1.61321" cy="1.61321" r="1.5" fill="currentColor" />
              <circle cx="5.73583" cy="1.61321" r="1.5" fill="currentColor" />
              <circle cx="5.73583" cy="5.5566" r="1.5" fill="currentColor" />
              <circle cx="9.85851" cy="5.5566" r="1.5" fill="currentColor" />
              <circle cx="9.85851" cy="9.5" r="1.5" fill="currentColor" />
              <circle cx="13.9811" cy="9.5" r="1.5" fill="currentColor" />
              <circle cx="5.73583" cy="13.4434" r="1.5" fill="currentColor" />
              <circle cx="9.85851" cy="13.4434" r="1.5" fill="currentColor" />
              <circle cx="1.61321" cy="17.3868" r="1.5" fill="currentColor" />
              <circle cx="5.73583" cy="17.3868" r="1.5" fill="currentColor" />
            </svg>
          )}
        </span>
      </button>
    </>
  );
}
