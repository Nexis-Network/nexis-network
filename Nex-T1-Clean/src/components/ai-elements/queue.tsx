"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2Icon, Clock3Icon, AlertTriangleIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

type QueueItem = {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done" | "error";
};

export type QueueProps = HTMLAttributes<HTMLDivElement> & {
  pending?: QueueItem[];
  completed?: QueueItem[];
  failed?: QueueItem[];
};

function QueueSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: QueueItem[];
  icon: ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-400">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-muted/50 dark:border-white/10 dark:bg-black/20 px-3 py-2"
          >
            <div className="text-sm font-medium text-foreground dark:text-white">{item.title}</div>
            {item.description ? (
              <div className="mt-1 text-xs text-zinc-400">{item.description}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Queue({
  pending = [],
  completed = [],
  failed = [],
  className,
  ...props
}: QueueProps) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border bg-muted/50 dark:border-white/10 dark:bg-black/20 p-4",
        className,
      )}
      {...props}
    >
      <QueueSection
        title="Pending"
        items={pending}
        icon={<Clock3Icon className="size-4" />}
      />
      <QueueSection
        title="Completed"
        items={completed}
        icon={<CheckCircle2Icon className="size-4 text-emerald-400" />}
      />
      <QueueSection
        title="Failed"
        items={failed}
        icon={<AlertTriangleIcon className="size-4 text-amber-400" />}
      />
    </div>
  );
}
