"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCcw, Search, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TaskGroupSection } from "@/components/sidebar/tasks/task-group-section";
import { TaskSchedulerDialog } from "@/components/sidebar/tasks/task-scheduler-dialog";
import { TaskListSkeleton } from "@/components/sidebar/tasks/task-list-skeleton";
import { useUserTasks } from "@/hooks/tasks/use-user-tasks";
import { useTaskStatusMutation } from "@/hooks/tasks/use-task-status";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import type { NormalizedTask } from "@/modules/tasks";
import { classifyTaskSchedule } from "@/modules/tasks";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useTaskSelectionStore } from "@/modules/tasks/selection-store";
import { trackAgentEvent } from "@/modules/analytics/events";
import {
  glassSurfaceClass,
  glassSurfaceStyle,
  glassSurfaceTranslucentClass,
} from "@/lib/ui/surface";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

type TasksSidebarOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 360;

const clampSidebarWidth = (value: number) => {
  const viewportLimit =
    typeof window === "undefined"
      ? MAX_SIDEBAR_WIDTH
      : Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.9));
  return Math.min(Math.max(value, MIN_SIDEBAR_WIDTH), viewportLimit);
};

type TaskGroup = {
  id: string;
  title: string;
  description?: string;
  tasks: NormalizedTask[];
  emptyMessage?: string;
};

export function TasksSidebarOverlay({ isOpen, onClose }: TasksSidebarOverlayProps) {
  const { isAuthenticated } = useAuthContext();
  const { isMobile } = useSidebar();
  const [search, setSearch] = useState("");
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH));
  const [activeTaskAction, setActiveTaskAction] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const selectTask = useTaskSelectionStore((state) => state.selectTask);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleViewportResize = () => {
      setPanelWidth((previous) => clampSidebarWidth(previous));
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  const tasksQuery = useUserTasks({ enabled: isOpen && isAuthenticated });
  const taskStatusMutation = useTaskStatusMutation();
  const tasksEnvelope = tasksQuery.data;

  const filteredTasks = useMemo(() => {
    if (!tasksEnvelope) return [] as NormalizedTask[];
    if (!search.trim()) {
      return tasksEnvelope.tasks;
    }
    const term = search.trim().toLowerCase();
    return tasksEnvelope.tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(term) ||
        (task.description?.toLowerCase().includes(term) ?? false) ||
        (task.agent?.toLowerCase().includes(term) ?? false) ||
        (task.team?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [tasksEnvelope, search]);

  const groups = useMemo(() => buildTaskGroups(filteredTasks), [filteredTasks]);

  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch("/api/nex/tasks/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(detail || "Unable to cancel task");
      }
    },
    onSuccess: (_, taskId) => {
      trackAgentEvent("task_cancelled", { taskId });
      toast({ title: "Task cancelled" });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] }).catch(() => {});
    },
    onError: (error: UntypedJson) => {
      trackAgentEvent("task_cancel_failed", {
        message: error instanceof Error ? error.message : String(error ?? "unknown"),
      });
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const cancellingTaskId = cancelTaskMutation.isPending ? cancelTaskMutation.variables ?? null : null;

  const handleSchedulerSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-tasks"] }).catch(() => {});
  }, [queryClient]);

  const handleTaskStatusChange = useCallback(
    async (task: NormalizedTask, action: "pause" | "resume" | "run_now") => {
      setActiveTaskAction(task.id);
      try {
        await taskStatusMutation.mutateAsync({ taskId: task.id, action });
        await tasksQuery.refetch();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Unable to update task",
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setActiveTaskAction(null);
      }
    },
    [taskStatusMutation, tasksQuery, toast],
  );

  const handleCancelTask = useCallback(
    (task: NormalizedTask) => {
      cancelTaskMutation.mutate(task.id);
    },
    [cancelTaskMutation],
  );

  const handleResizeDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = panelWidth;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        setPanelWidth(clampSidebarWidth(startWidth + delta));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [panelWidth],
  );

  const handleSelectTask = useCallback(
    (task: NormalizedTask) => {
      selectTask(task);
      trackAgentEvent("task_selected", {
        taskId: task.id,
        status: task.status,
        agent: task.agent,
        team: task.team,
      });
      onClose();
    },
    [onClose, selectTask],
  );

  const renderPanelBody = (variant: "sheet" | "panel") => {
    const HeaderWrapper: React.ElementType = variant === "sheet" ? SheetHeader : "div";
    const TitleComponent: React.ElementType = variant === "sheet" ? SheetTitle : "h2";

    return (
      <div className="flex h-full flex-col">
        <HeaderWrapper className="border-b border-border bg-transparent px-4 py-5 sm:px-5 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <TitleComponent className="text-xs font-regular uppercase tracking-[0.28em] text-muted-foreground/80">
              Tasks
            </TitleComponent>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close tasks"
              onClick={onClose}
              className="size-8 rounded-full border border-border bg-muted text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground dark:border-transparent dark:bg-white/5 dark:hover:border-white/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Monitor short-term and long-term automations managed by your agents.
          </p>
        </HeaderWrapper>

        <div className="border-b border-border px-4 py-4 sm:px-5 dark:border-white/10">
          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks"
                  className="h-9 rounded-md border border-[#EBEBEB] bg-white pl-9 text-xs text-[#666666] placeholder:text-muted-foreground focus:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-foreground"
                  autoFocus
                />
              </div>
              <Button
                size="sm"
                onClick={() => setSchedulerOpen(true)}
                className="rounded-full bg-primary/10 text-[11px] font-regular! uppercase tracking-wide text-[#666666] hover:bg-primary/20 dark:bg-white/10 dark:text-foreground"
              >
                SCHEDULE
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => tasksQuery.refetch()}
                disabled={tasksQuery.isRefetching}
                aria-label="Refresh tasks"
                className="size-8 rounded-full border border-border bg-muted text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground dark:border-transparent dark:bg-white/5 dark:hover:border-white/10 dark:hover:bg-white/10"
              >
                {tasksQuery.isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              <p className="mb-3">Sign in to view your agent tasks and schedules.</p>
              <SignInDialog>
                <Button size="sm">Sign in</Button>
              </SignInDialog>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {!isAuthenticated ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/70">
              Connect your account to sync task activity.
            </div>
          ) : tasksQuery.isLoading ? (
            <TaskListSkeleton count={4} />
          ) : tasksQuery.isError ? (
            <div className="space-y-3 text-sm text-muted-foreground/70">
              <p>We couldn&apos;t load your tasks right now.</p>
              <Button size="sm" variant="outline" onClick={() => tasksQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : groups.every((group) => group.tasks.length === 0) ? (
            <div className="rounded-[18px] border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
              No tasks to show yet. Create automations or schedules to see them here.
            </div>
          ) : (
            <div className="w-full min-w-0 space-y-6 pb-12">
              {groups.map((group) => (
                <TaskGroupSection
                  key={group.id}
                  title={group.title}
                  description={group.description}
                  tasks={group.tasks}
                  emptyMessage={group.emptyMessage}
                  onCancelTask={handleCancelTask}
                  cancellingTaskId={cancellingTaskId}
                  onSelectTask={handleSelectTask}
                  onPauseTask={(task) => handleTaskStatusChange(task, "pause")}
                  onResumeTask={(task) => handleTaskStatusChange(task, "resume")}
                  onRunTask={(task) => handleTaskStatusChange(task, "run_now")}
                  busyTaskId={activeTaskAction}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  const schedulerDialog = (
    <TaskSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen} onScheduled={handleSchedulerSuccess} />
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
          <SheetContent
            side="left"
            className={cn(
              glassSurfaceClass,
              glassSurfaceTranslucentClass,
              "z-[120] h-[100dvh] w-full max-w-full rounded-none border-0 p-0 text-[#666666] outline-none backdrop-blur-md",
              "sm:m-[8px] sm:h-[calc(100vh-16px)] sm:w-[calc(100vw-16px)] sm:max-w-md sm:rounded-lg sm:border sm:border-white/10",
              "overflow-hidden",
            )}
            style={{ ...glassSurfaceStyle }}
            hideCloseButton
          >
            {renderPanelBody("sheet")}
          </SheetContent>
        </Sheet>
        {schedulerDialog}
      </>
    );
  }

  if (!isOpen) {
    return schedulerDialog;
  }

  // Desktop: Render as static panel in flex flow
  return (
    <>
      <div className="relative z-20 flex h-full shrink-0 flex-col">
        <aside
          className={cn(
            "relative h-full w-full border-r border-transparent bg-transparent p-0 text-[#666666] outline-none",
            // Removed glass/border/rounded styles per request
          )}
          style={{
            width: panelWidth,
            minWidth: MIN_SIDEBAR_WIDTH,
            maxWidth: clampSidebarWidth(Number.MAX_SAFE_INTEGER),
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Tasks overview"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            className="absolute right-0 top-0 z-10 h-full w-3 cursor-ew-resize select-none touch-none"
            onPointerDown={handleResizeDrag}
          >
            <span className="pointer-events-none absolute left-1 top-1/4 h-1/2 w-[2px] rounded-full bg-muted/80 dark:bg-white/20" />
          </div>
          {renderPanelBody("panel")}
        </aside>
      </div>
      {schedulerDialog}
    </>
  );
}

function buildTaskGroups(tasks: NormalizedTask[]): TaskGroup[] {
  const now = Date.now();
  if (!tasks.length) {
    return [
      {
        id: "active",
        title: "Active Now",
        description: "Currently running or due tasks",
        tasks: [],
      },
      {
        id: "future",
        title: "Future Schedules",
        description: "Exact-date launches across this year and beyond",
        tasks: [],
      },
      {
        id: "short-term",
        title: "Short-Term Horizon",
        description: "Milliseconds to the next 7 days",
        tasks: [],
      },
      {
        id: "long-term",
        title: "Long-Term Horizon",
        description: "1 week to 2 years out",
        tasks: [],
      },
      {
        id: "conditional",
        title: "Conditional Triggers",
        description: "Market, volume, and news-based automations",
        tasks: [],
      },
      {
        id: "loop",
        title: "Loop & Recurring",
        description: "Daily, weekly, and monthly cycles",
        tasks: [],
      },
      {
        id: "completed",
        title: "Recently Completed",
        tasks: [],
      },
    ];
  }

  const buckets: Record<string, NormalizedTask[]> = {
    active: [],
    future: [],
    shortTerm: [],
    longTerm: [],
    conditional: [],
    loop: [],
    completed: [],
    failed: [],
  };

  tasks.forEach((task) => {
    const status = task.status;
    const scheduledMs = task.scheduledFor ? Date.parse(task.scheduledFor) : NaN;
    const hasSchedule = !Number.isNaN(scheduledMs);
    const classification = classifyTaskSchedule(task, { now });
    const dueAt = classification.dueAt ?? (hasSchedule ? scheduledMs : null);
    const isDueNow = typeof dueAt === "number" && dueAt <= now;

    if (status === "completed") {
      buckets.completed.push(task);
      return;
    }

    if (status === "failed" || status === "cancelled" || status === "requires_action") {
      buckets.failed.push(task);
      return;
    }

    if (status === "in_progress" || status === "started" || isDueNow) {
      buckets.active.push(task);
      return;
    }

    if (status === "paused") {
      buckets.future.push(task);
      return;
    }

    if (status === "set") {
      buckets.future.push(task);
      return;
    }

    switch (classification.bucket) {
      case "conditional":
        buckets.conditional.push(task);
        return;
      case "loop":
        buckets.loop.push(task);
        return;
      case "shortTerm":
        buckets.shortTerm.push(task);
        return;
      case "longTerm":
        buckets.longTerm.push(task);
        return;
      case "future":
      default:
        break;
    }

    if (hasSchedule && scheduledMs <= now) {
      buckets.active.push(task);
      return;
    }

    buckets.future.push(task);
  });

  return [
    {
      id: "active",
      title: "Active Now",
      description: "Currently running or immediately due tasks",
      tasks: sortByCreatedAt(buckets.active),
      emptyMessage: "No active tasks running right now.",
    },
    {
      id: "future",
      title: "Future Schedules",
      description: "Exact-date launches across this year and beyond",
      tasks: sortByDueDate(buckets.future, now),
      emptyMessage: "No future-dated tasks yet.",
    },
    {
      id: "short-term",
      title: "Short-Term Horizon",
      description: "Milliseconds to the next 7 days",
      tasks: sortByDueDate(buckets.shortTerm, now),
      emptyMessage: "No short-term tasks scheduled.",
    },
    {
      id: "long-term",
      title: "Long-Term Horizon",
      description: "1 week to 2 years out",
      tasks: sortByDueDate(buckets.longTerm, now),
      emptyMessage: "No long-term tasks yet.",
    },
    {
      id: "conditional",
      title: "Conditional Triggers",
      description: "Market, volume, and news-based automations",
      tasks: sortByDueDate(buckets.conditional, now),
      emptyMessage: "No conditional tasks yet.",
    },
    {
      id: "loop",
      title: "Loop & Recurring",
      description: "Daily, weekly, and monthly cycles",
      tasks: sortByDueDate(buckets.loop, now),
      emptyMessage: "No recurring tasks yet.",
    },
    {
      id: "completed",
      title: "Recently Completed",
      tasks: sortByUpdatedAt(buckets.completed).slice(0, 10),
      emptyMessage: "No completed tasks yet.",
    },
    {
      id: "failed",
      title: "Attention Required",
      description: "Failed or cancelled tasks",
      tasks: sortByUpdatedAt(buckets.failed),
      emptyMessage: "No failed tasks. You're all set!",
    },
  ];
}

function sortByDueDate(tasks: NormalizedTask[], now = Date.now()): NormalizedTask[] {
  return [...tasks].sort((a, b) => {
    const aTime = classifyTaskSchedule(a, { now }).dueAt ?? Number.MAX_SAFE_INTEGER;
    const bTime = classifyTaskSchedule(b, { now }).dueAt ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function sortByCreatedAt(tasks: NormalizedTask[]): NormalizedTask[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

function sortByUpdatedAt(tasks: NormalizedTask[]): NormalizedTask[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bTime - aTime;
  });
}
