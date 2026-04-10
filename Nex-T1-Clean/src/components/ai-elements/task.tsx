"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type TaskStatus = "pending" | "in_progress" | "done" | "error";

const TASK_STATUS_META: Record<
  TaskStatus,
  {
    icon: ReactNode;
    label: string;
    pillClassName: string;
    textClassName: string;
  }
> = {
  pending: {
    icon: <Clock3Icon className="size-3.5" />,
    label: "Pending",
    pillClassName: "border-border bg-muted/30 text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
    textClassName: "text-zinc-300",
  },
  in_progress: {
    icon: <Loader2Icon className="size-3.5 animate-spin" />,
    label: "Running",
    pillClassName: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    textClassName: "text-sky-200",
  },
  done: {
    icon: <CheckCircle2Icon className="size-3.5" />,
    label: "Done",
    pillClassName: "border-transparent bg-transparent text-foreground dark:text-white",
    textClassName: "text-emerald-200",
  },
  error: {
    icon: <AlertTriangleIcon className="size-3.5" />,
    label: "Error",
    pillClassName: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    textClassName: "text-amber-200",
  },
};

export type TaskItemFileProps = ComponentProps<"div">;

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    className={cn(
      "inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground text-xs",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type TaskItemProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  status?: TaskStatus;
};

export const TaskItem = ({
  children,
  className,
  title,
  description,
  status,
  ...props
}: TaskItemProps) => {
  const meta = status ? TASK_STATUS_META[status] : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-muted/30 dark:border-white/8 dark:bg-white/[0.02] px-3 py-2.5",
        className,
      )}
      {...props}
    >
      {meta ? (
        <span
          className={cn(
            "mt-0.5 inline-flex size-7 items-center justify-center rounded-full border",
            meta.pillClassName,
          )}
        >
          {meta.icon}
        </span>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1">
        {title ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground dark:text-white">{title}</p>
            {meta ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  meta.pillClassName,
                )}
              >
                {meta.label}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{children}</div>
        )}

        {description ? (
          <p className="text-xs leading-5 text-zinc-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
};

export type TaskProps = ComponentProps<typeof Collapsible>;

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: TaskProps) => (
  <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string;
  status?: TaskStatus;
  summary?: string;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  status,
  summary,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger asChild className={cn("group", className)} {...props}>
    {children ?? (
      <div className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-muted-foreground transition-colors hover:border-transparent hover:text-foreground">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full border",
            status ? TASK_STATUS_META[status].pillClassName : "border-border bg-muted/30 text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
          )}
        >
          {status ? TASK_STATUS_META[status].icon : <SearchIcon className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground dark:text-white">{title}</p>
          {summary ? <p className="mt-1 text-xs text-zinc-400">{summary}</p> : null}
        </div>
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </div>
    )}
  </CollapsibleTrigger>
);

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    <div className="mt-4 space-y-2 border-muted border-l-2 pl-4">
      {children}
    </div>
  </CollapsibleContent>
);
