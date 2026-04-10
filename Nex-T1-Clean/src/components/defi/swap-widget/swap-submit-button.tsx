"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwapSubmitButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export function SwapSubmitButton({ onClick, disabled, loading, label = "Buy" }: SwapSubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full py-4 mt-6 rounded-xl font-semibold text-base transition-colors",
        disabled || loading
          ? "bg-blue-900/50 text-blue-200/50 cursor-not-allowed"
          : "bg-[#1D4ED8] hover:bg-blue-600 text-white"
      )}
    >
      {loading ? "Processing..." : label}
    </button>
  );
}
