"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

import type { ComposerTaskState, ComposerTaskTone } from "./task-status-state";

type ComposerTaskStatusProps = {
  taskState: ComposerTaskState;
  variant?: "default" | "instant-muted";
};

const TONE_STYLES: Record<ComposerTaskTone, { indicator: string; statusText: string }> = {
  working: {
    indicator: "bg-sky-500",
    statusText: "text-sky-500",
  },
  issue: {
    indicator: "bg-amber-600",
    statusText: "text-amber-600",
  },
  complete: {
    indicator: "bg-lime-400",
    statusText: "text-lime-400",
  },
  error: {
    indicator: "bg-red-600",
    statusText: "text-red-600",
  },
};

function TaskIndicator({ className, tone }: { className?: string; tone: ComposerTaskTone }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        "inline-flex rounded-full",
        tone === "complete" ? "size-2" : "size-2.5",
        TONE_STYLES[tone].indicator,
        className,
      )}
      animate={{
        opacity: [0.45, 1, 0.45],
        scale: [0.92, 1.08, 0.92],
      }}
      transition={{
        duration: tone === "complete" ? 1.8 : 1.2,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />
  );
}

export function ComposerTaskStatus({ taskState, variant = "default" }: ComposerTaskStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(taskState.currentTaskId);

  useEffect(() => {
    setExpandedTaskId((current) => {
      if (current && taskState.tasks.some((task) => task.id === current)) {
        return current;
      }

      return taskState.currentTaskId;
    });
  }, [taskState.currentTaskId, taskState.tasks]);

  return (
    <>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="task-status-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-full left-0 right-0 z-20 mb-2"
          >
            <div className="pointer-events-auto divide-y divide-white/10">
              {taskState.tasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const tone =
                  task.status === "error"
                    ? "error"
                    : task.status === "done"
                      ? "complete"
                      : taskState.tone === "issue"
                        ? "issue"
                        : "working";

                return (
                  <div key={task.id} className="py-1">
                    <button
                      type="button"
                      onClick={() => setExpandedTaskId((current) => (current === task.id ? null : task.id))}
                      className="flex w-full items-start justify-between gap-3 px-0 py-1 text-left"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <TaskIndicator tone={tone} className="mt-1" />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-xs font-medium",
                              variant === "instant-muted" ? "text-[#D7D7DB]" : "text-[#f3f4f6]",
                            )}
                          >
                            {task.title}
                          </span>
                          <span
                            className={cn(
                              "block text-[11px]",
                              task.isCurrent && task.status === "in_progress" ? "animate-pulse" : "",
                              TONE_STYLES[tone].statusText,
                            )}
                          >
                            {task.statusLabel}
                          </span>
                        </span>
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <motion.div
                          key={`${task.id}-details`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden pr-6"
                        >
                          <p
                            className={cn(
                              "pl-4 pt-1 text-[11px] leading-5",
                              variant === "instant-muted" ? "text-[#B7B7BC]" : "text-[#cfd1d6]",
                            )}
                          >
                            {task.detailText}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 text-left"
      >
        <TaskIndicator tone={taskState.tone} />
        <span
          className={cn(
            "truncate text-xs font-medium",
            variant === "instant-muted" ? "text-[#D7D7DB]" : "text-[#F3F4F6]",
          )}
        >
          {taskState.previewText}
        </span>
      </button>
    </>
  );
}
