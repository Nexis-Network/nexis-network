"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwapNowButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SwapNowButton({ label, onClick, disabled, loading }: SwapNowButtonProps) {
  return (
    <div className="px-4 mt-3 mb-4">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          "w-full h-[40px] rounded-lg text-[13px] font-semibold transition-all",
          "bg-[#C8FF00] text-[#0A0A0A] hover:bg-[#D5FF33]",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing...
          </span>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
