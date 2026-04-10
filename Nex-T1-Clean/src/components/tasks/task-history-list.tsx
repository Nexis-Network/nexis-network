"use client";

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatus } from "@/lib/schema";
import { useTaskContext } from "@/lib/task-context";
import { TaskRunDetailDrawer } from "./task-run-detail-drawer";

// History of recent actions.. should show active and recent tasks
export function TaskHistoryList() {
  const { tasks: systemTasks, loading: systemLoading, hasIncompleteTasks, isPolling } = useTaskContext();
  const tasks = [...systemTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const loading = systemLoading;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Status badge component
  const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const getStatusConfig = () => {
      switch (status) {
        case TaskStatus.COMPLETED:
          return {
            icon: CheckCircle2,
            color: "text-green-700 bg-green-50 border-green-200",
            label: "Completed",
          };
        case TaskStatus.FAILED:
          return {
            icon: XCircle,
            color: "text-red-700 bg-red-50 border-red-200",
            label: "Failed",
          };
        case TaskStatus.EXECUTING:
          return {
            icon: Loader2,
            color: "text-blue-700 bg-sky-500/10 border-sky-500/20",
            label: "Running",
            animate: true,
          };
        case TaskStatus.QUEUED:
          return {
            icon: Clock,
            color: "text-yellow-700 bg-yellow-50 border-yellow-200",
            label: "Queued",
          };
        case TaskStatus.DELAYED:
          return {
            icon: Timer,
            color: "text-purple-700 bg-purple-50 border-purple-200",
            label: "Delayed",
          };
        case TaskStatus.CANCELLED:
          return {
            icon: XCircle,
            color: "text-gray-600 bg-gray-100 border-gray-200",
            label: "Cancelled",
          };
        case TaskStatus.REQUIRES_ACTION:
          return {
            icon: AlertCircle,
            color: "text-amber-700 bg-amber-50 border-amber-200",
            label: "Needs Action",
          };
        default:
          return {
            icon: AlertCircle,
            color: "text-gray-700 bg-gray-50 border-gray-200",
            label: status,
          };
      }
    };

    const { icon: Icon, color, animate, label } = getStatusConfig();

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium text-xs ${color}`}
      >
        <Icon className={`h-3.5 w-3.5 ${animate ? "animate-spin" : ""}`} />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border-none bg-white ">
        <CardHeader className="border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-regular text-gray-900 text-sm">
                Task History
              </h2>
              {(loading || hasIncompleteTasks || isPolling) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="w-[130px] font-medium text-gray-600">
                Status
              </TableHead>
              <TableHead className="font-medium text-gray-600">Task</TableHead>
              <TableHead className="w-[180px] font-medium text-gray-600">
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && tasks.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow
                  className="border-gray-100 hover:bg-transparent"
                  key={i}
                >
                  <TableCell className="py-4">
                    <div className="h-6 w-24 animate-pulse rounded-md bg-gray-100" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <div className="h-5 w-40 animate-pulse rounded-md bg-gray-100" />
                      <div className="h-4 w-60 animate-pulse rounded-md bg-gray-50" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded-md bg-gray-100" />
                      <div className="h-4 w-28 animate-pulse rounded-md bg-gray-50" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : tasks.length === 0 ? (
              <TableRow className="border-gray-100 hover:bg-transparent">
                <TableCell colSpan={3}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-xl bg-gray-50 p-3">
                      <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No tasks found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <motion.tr
                    animate={{ opacity: 1 }}
                    className="group border-gray-100 transition-colors hover:bg-gray-50"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key={task.id}
                    onClick={() => {
                      // Only open drawer for system tasks (TaskResult), skipped for automation for now or add distinct drawer
                      if (!task.type || task.type === ("chain" as UntypedJson)) return; 
                      setSelectedTaskId(task.id);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="py-4">
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[300px] space-y-1.5">
                        <p className="truncate font-medium text-gray-900 text-sm">
                          {task.payload.name}
                        </p>
                        {task.error && (
                          <p className="flex items-center gap-1.5 truncate text-red-600 text-xs">
                            <XCircle className="h-3 w-3" />
                            {task.error.message}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <Clock className="h-3 w-3" />
                          {new Date(task.createdAt).toLocaleString()}
                        </p>
                        {task.completedAt && (
                          <p className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            {new Date(task.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </Card>
      <TaskRunDetailDrawer
        onClose={() => {
          setDetailOpen(false);
          setSelectedTaskId(null);
        }}
        open={detailOpen}
        runId={selectedTaskId}
      />
    </div>
  );
}
