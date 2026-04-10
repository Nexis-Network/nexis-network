"use client";

import React from "react";
import { ExternalLink, MoreHorizontal } from "lucide-react";

export function TokenExchangeHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3">
      <span className="text-[13px] font-medium text-white tracking-[0.01em]">
        Token Exchange
      </span>
      <div className="flex items-center gap-3">
        <button className="text-gray-400 hover:text-white transition-colors">
          <ExternalLink className="w-[14px] h-[14px]" />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <MoreHorizontal className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}
