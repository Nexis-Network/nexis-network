"use client";

import { memo } from "react";

import type { NormalizedTask } from "@/modules/tasks";
import { TaskListItem } from "@/components/sidebar/tasks/task-list-item";
import { cn } from "@/lib/utils";

type TaskGroupSectionProps = {
  title: string;
  description?: string;
  tasks: NormalizedTask[];
  onCancelTask?: (task: NormalizedTask) => void;
  cancellingTaskId?: string | null;
  emptyMessage?: string;
  className?: string;
  onSelectTask?: (task: NormalizedTask) => void;
  onPauseTask?: (task: NormalizedTask) => void;
  onResumeTask?: (task: NormalizedTask) => void;
  onRunTask?: (task: NormalizedTask) => void;
  busyTaskId?: string | null;
};

export const TaskGroupSection = memo(function TaskGroupSection({
  title,
  description,
  tasks,
  onCancelTask,
  cancellingTaskId,
  emptyMessage = "No tasks in this section",
  className,
  onSelectTask,
  onPauseTask,
  onResumeTask,
  onRunTask,
  busyTaskId,
}: TaskGroupSectionProps) {
  return (
    <section className={cn("space-y-3 w-full min-w-0", className)} aria-label={title}>
      <header className="w-full min-w-0">
        <h3 className="text-[clamp(0.55rem,0.85vw,0.7rem)] font-regular uppercase tracking-[0.22em] text-muted-foreground/70">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-[clamp(0.55rem,0.8vw,0.68rem)] text-muted-foreground/60">{description}</p>
        ) : null}
      </header>

      {tasks.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-white/10 bg-white/5 px-3 py-4 text-[clamp(0.65rem,0.9vw,0.8rem)] text-muted-foreground/70">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              onCancel={onCancelTask}
              cancelling={cancellingTaskId === task.id}
              onSelect={onSelectTask}
              onPause={onPauseTask}
              onResume={onResumeTask}
              onRun={onRunTask}
              busy={busyTaskId === task.id}
            />
          ))}
        </div>
      )}
    </section>
  );
});
