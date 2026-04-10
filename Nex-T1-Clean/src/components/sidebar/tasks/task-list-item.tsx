"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { NormalizedTask } from "@/modules/tasks";
import { classifyTaskSchedule, describeTaskSchedule } from "@/modules/tasks";
import { CalendarClock, Bot, Users, Loader2, XCircle, MoreHorizontal, Pause, Play, Zap } from "lucide-react";

type TaskListItemProps = {
  task: NormalizedTask;
  onCancel?: (task: NormalizedTask) => void;
  cancelling?: boolean;
  onSelect?: (task: NormalizedTask) => void;
  onPause?: (task: NormalizedTask) => void;
  onResume?: (task: NormalizedTask) => void;
  onRun?: (task: NormalizedTask) => void;
  busy?: boolean;
};

export const TaskListItem = memo(function TaskListItem({
  task,
  onCancel,
  cancelling,
  onSelect,
  onPause,
  onResume,
  onRun,
  busy = false,
}: TaskListItemProps) {
  const statusMeta = useMemo(() => getStatusMeta(task), [task]);
  const scheduleLabel = useMemo(() => formatSchedule(task), [task]);
  const scheduleBucket = useMemo(() => classifyTaskSchedule(task).bucket, [task]);
  const scheduleBucketLabel = useMemo(() => getScheduleBucketLabel(scheduleBucket), [scheduleBucket]);
  const progressValue = useMemo(
    () => (typeof task.progress === "number" ? Math.round(task.progress * 100) : null),
    [task],
  );
  const actionSummary = useMemo(() => summarizeAction(task.metadata?.action), [task.metadata?.action]);

  return (
    <div
      className={cn(
        "rounded-[14px] border border-transparent bg-white/0 p-3 transition-all",
        "hover:border-white/10 hover:bg-white/10",
        onSelect ? "cursor-pointer" : "",
        onSelect && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        onSelect && "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
      )}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : -1}
      onClick={onSelect ? () => onSelect(task) : undefined}
      onKeyDown={onSelect ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(task);
        }
      } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-regular uppercase tracking-wide text-foreground/90 line-clamp-2" title={task.title}>
              {task.title}
            </h4>
            <Badge
              variant={statusMeta.badgeVariant}
              className={cn("text-[10px] uppercase tracking-wide", statusMeta.badgeClassName)}
            >
              {statusMeta.label}
            </Badge>
            {scheduleBucketLabel ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-foreground/80">
                {scheduleBucketLabel}
              </Badge>
            ) : null}
          </div>
          {task.description ? (
            <p className="text-[11px] text-muted-foreground/70 line-clamp-2" title={task.description ?? undefined}>
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
        {onCancel && statusMeta.canCancel ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border border-transparent bg-white/5 text-muted-foreground transition hover:border-white/10 hover:bg-white/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onCancel(task);
            }}
            disabled={cancelling}
            aria-label={`Cancel task ${task.title}`}
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          </Button>
        ) : null}
          {(onPause || onResume || onRun) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full border border-transparent bg-white/5 text-muted-foreground transition hover:border-white/10 hover:bg-white/10"
                  onClick={(event) => event.stopPropagation()}
                  disabled={busy}
                  aria-label={`Task actions for ${task.title}`}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRun ? (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onRun(task);
                    }}
                    disabled={busy}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Run now
                  </DropdownMenuItem>
                ) : null}
                {onPause ? (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onPause(task);
                    }}
                    disabled={busy || task.status === "paused"}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </DropdownMenuItem>
                ) : null}
                {onResume ? (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onResume(task);
                    }}
                    disabled={busy || task.status !== "paused"}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
        {scheduleLabel ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {scheduleLabel}
          </span>
        ) : null}
        {task.agent ? (
          <span className="inline-flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {task.agent}
          </span>
        ) : null}
        {task.team ? (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {task.team}
          </span>
        ) : null}
      </div>

      {progressValue !== null ? (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress</span>
            <span>{progressValue}%</span>
          </div>
          <Progress
            value={progressValue}
            className={cn(
              "h-1.5 bg-sky-400/20 dark:bg-primary/20",
              '[&_[data-slot="progress-indicator"]]:relative',
              '[&_[data-slot="progress-indicator"]]:overflow-visible',
              '[&_[data-slot="progress-indicator"]]:bg-[linear-gradient(115deg,_#01030d_0%,_#051038_18%,_#0a2261_38%,_#123a96_58%,_#1e55d9_74%,_#2f6cff_86%,_#66f4ff_96%,_#c0fbff_100%)]',
              '[&_[data-slot="progress-indicator"]]:shadow-[0_0_12px_rgba(82,168,255,0.45),0_0_28px_rgba(63,127,255,0.4),6px_0_26px_rgba(102,244,255,0.35)]',
              '[&_[data-slot="progress-indicator"]]:transition-[background,box-shadow]',
              '[&_[data-slot="progress-indicator"]]:duration-500',
              '[&_[data-slot="progress-indicator"]]:ease-out',
              '[&_[data-slot="progress-indicator"]::after]:content-[""]',
              '[&_[data-slot="progress-indicator"]::after]:pointer-events-none',
              '[&_[data-slot="progress-indicator"]::after]:absolute',
              '[&_[data-slot="progress-indicator"]::after]:right-0',
              '[&_[data-slot="progress-indicator"]::after]:top-1/2',
              '[&_[data-slot="progress-indicator"]::after]:h-[160%]',
              '[&_[data-slot="progress-indicator"]::after]:w-[65%]',
              '[&_[data-slot="progress-indicator"]::after]:-translate-y-1/2',
              '[&_[data-slot="progress-indicator"]::after]:translate-x-[15%]',
              '[&_[data-slot="progress-indicator"]::after]:rounded-full',
              '[&_[data-slot="progress-indicator"]::after]:bg-[radial-gradient(circle,_rgba(164,251,255,0.7)_0%,_rgba(164,251,255,0.25)_40%,_rgba(9,22,45,0)_100%)]',
              '[&_[data-slot="progress-indicator"]::after]:blur-md',
              '[&_[data-slot="progress-indicator"]::after]:opacity-90'
            )}
          />
        </div>
      ) : null}
      {actionSummary ? (
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">{actionSummary}</p>
      ) : null}
    </div>
  );
});

type StatusMeta = {
  label: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  canCancel: boolean;
  badgeClassName?: string;
};

function getStatusMeta(task: NormalizedTask): StatusMeta {
  const status = task.status;
  switch (status) {
    case "set":
      return { label: "Ready", badgeVariant: "secondary", canCancel: true };
    case "paused":
      return { label: "Paused", badgeVariant: "outline", canCancel: false };
    case "in_progress":
    case "started":
      return {
        label: "In Progress",
        badgeVariant: "secondary",
        canCancel: true,
        badgeClassName: "bg-sky-400/10 border border-sky-400/20 text-sky-400",
      };
    case "pending":
    case "scheduled":
    case "queued":
      return { label: "Scheduled", badgeVariant: "secondary", canCancel: true };
    case "completed":
      return { label: "Completed", badgeVariant: "outline", canCancel: false };
    case "failed":
      return { label: "Failed", badgeVariant: "destructive", canCancel: false };
    case "cancelled":
      return { label: "Cancelled", badgeVariant: "outline", canCancel: false };
    case "requires_action":
      return {
        label: "Needs Approval",
        badgeVariant: "secondary",
        canCancel: false,
        badgeClassName: "border border-amber-200 text-amber-300",
      };
    default:
      return { label: "Active", badgeVariant: "secondary", canCancel: true };
  }
}

function getScheduleBucketLabel(bucket: string): string | null {
  switch (bucket) {
    case "conditional":
      return "Conditional";
    case "loop":
      return "Recurring";
    case "shortTerm":
      return "Short-Term";
    case "longTerm":
      return "Long-Term";
    case "future":
      return "Future";
    default:
      return null;
  }
}

function formatSchedule(task: NormalizedTask): string | null {
  const enhanced = describeTaskSchedule(task);
  if (enhanced) {
    return enhanced;
  }
  return formatLegacySchedule(task);
}

function formatLegacySchedule(task: NormalizedTask): string | null {
  if (!task.scheduledFor) {
    return null;
  }

  const date = new Date(task.scheduledFor);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (Math.abs(diffMs) < 60 * 60 * 1000) {
    const minutes = Math.round(diffMs / (60 * 1000));
    if (minutes >= 0) {
      return minutes <= 1 ? "Due now" : `Due in ${minutes} min`;
    }
    const absMinutes = Math.abs(minutes);
    return absMinutes <= 1 ? "Past due" : `${absMinutes} min overdue`;
  }

  if (Math.abs(diffMs) < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diffMs / (60 * 60 * 1000));
    if (hours >= 0) {
      return `Due in ${hours} hour${hours === 1 ? "" : "s"}`;
    }
    const absHours = Math.abs(hours);
    return `${absHours} hour${absHours === 1 ? "" : "s"} overdue`;
  }

  return formatter.format(date);
}

function summarizeAction(action: UntypedJson): string | null {
  if (!action || typeof action !== "object") {
    return null;
  }
  const typed = action as Record<string, UntypedJson>;
  if (typed.type === "news_digest") {
    return `Digest · ${(typed.topic as string) ?? "topic"}`;
  }
  if (typed.type === "dex_trade") {
    return `Trade · ${(typed.baseToken as string) ?? "TOKEN"}/${(typed.quoteToken as string) ?? "USD"}`;
  }
  return null;
}
