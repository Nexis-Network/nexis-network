"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  creating: "bg-sky-500/100/10 text-blue-200 border-blue-500/30",
  running: "bg-[#8eb94f]/10 text-emerald-200 border-emerald-500/30",
  stopped: "bg-amber-500/10 text-amber-100 border-amber-500/30",
  failed: "bg-rose-500/10 text-rose-100 border-rose-500/30",
};

export function StatusChip({ status }: { status: string }) {
  const tone = STATUS_STYLES[status.toLowerCase()] ?? "bg-white/10 text-white border-white/20";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}
