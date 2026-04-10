"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XCircleIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";

export type TestResultItem = {
  id: string;
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  summary?: string;
};

export type TestResultsProps = HTMLAttributes<HTMLDivElement> & {
  items: TestResultItem[];
};

const statusIcon = {
  pass: <CheckCircle2Icon className="size-4 text-emerald-400" />,
  fail: <XCircleIcon className="size-4 text-rose-400" />,
  warn: <AlertTriangleIcon className="size-4 text-amber-400" />,
  info: <InfoIcon className="size-4 text-sky-400" />,
} as const;

export function TestResults({
  items,
  className,
  ...props
}: TestResultsProps) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-2xl border border-border bg-muted/50 dark:border-white/10 dark:bg-black/20 p-4",
        className,
      )}
      {...props}
    >
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">
        Test Results
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 dark:border-white/10 dark:bg-black/20 px-3 py-2"
        >
          {statusIcon[item.status]}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground dark:text-white">{item.name}</div>
            {item.summary ? (
              <div className="mt-1 text-xs text-zinc-400">{item.summary}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
