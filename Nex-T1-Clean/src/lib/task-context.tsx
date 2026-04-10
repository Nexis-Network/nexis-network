"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { listTasks } from "@/lib/task-actions";
import { type TaskResult, TaskStatus } from "./schema";

interface TaskContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  triggerToken: string;
  tasks: TaskResult[];
  loading: boolean;
  hasIncompleteTasks: boolean;
  isPolling: boolean;
}

const BASE_POLL_INTERVAL = 3000; // 3 seconds baseline
const MAX_POLL_INTERVAL = 30 * 1000; // cap interval at 30 seconds
const MAX_POLL_TIME = 20 * 1000; // 20 seconds absolute session cap
const JITTER_MS = 750;

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({
  children,
  triggerToken,
}: {
  children: ReactNode;
  triggerToken: string;
}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const isInitialLoadRef = useRef(true);
  const isFetchingRef = useRef(false);

  const pollStartTimeRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollAttemptRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize fetchTasks to avoid recreation on each render
  const fetchTasks = useCallback(async (isPollingCall = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;

    // Cancel any existing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      isFetchingRef.current = true;

      // Only show loading on initial fetch or manual refresh, not during polling
      if (!isPollingCall) {
        setLoading(true);
      }

      const response = await listTasks({ limit: 10, offset: 0 });
      setTasks(response.tasks);

      // Check for incomplete tasks (queued, executing, delayed, etc.)
      const hasIncompleteTasks = response.tasks.some((task) => isTaskIncomplete(task.status));

      if (isInitialLoadRef.current) {
        // Just complete the initial load
        isInitialLoadRef.current = false;
        setIsPolling(false);
        return;
      }

      // Handle polling state
      if (hasIncompleteTasks) {
        // Continue polling
        setIsPolling(true);
      } else {
        // All tasks complete, stop polling
        setIsPolling(false);
        pollStartTimeRef.current = null;
        pollAttemptRef.current = 0;
        if (pollIntervalRef.current) {
          clearTimeout(pollIntervalRef.current);
          pollIntervalRef.current = undefined;
        }
      }
    } catch (error) {
      // Only show error if it's not an abort error
      if (!(error instanceof Error) || error.name !== "AbortError") {
        toast.error("Failed to fetch tasks");
        setIsPolling(false);
        pollStartTimeRef.current = null;
        pollAttemptRef.current = 0;
        if (pollIntervalRef.current) {
          clearTimeout(pollIntervalRef.current);
          pollIntervalRef.current = undefined;
        }
      }
    } finally {
      isFetchingRef.current = false;
      if (!isPollingCall) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup function to reset all states and refs
  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = undefined;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pollStartTimeRef.current = null;
    pollAttemptRef.current = 0;
    setIsPolling(false);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchTasks();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle refresh trigger
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      // Clean up any existing polling
      cleanup();
      // Start new polling session
      pollStartTimeRef.current = Date.now();
      setIsPolling(true);
      pollAttemptRef.current = 0;
    }
  }, [refreshTrigger, cleanup]);

  // Polling effect
  useEffect(() => {
    let isSubscribed = true;
    let currentPollTimeout: NodeJS.Timeout | undefined;

    const poll = async () => {
      if (!isSubscribed) return;

      // Check for timeout only if we're polling and have a start time
      if (
        isPolling &&
        pollStartTimeRef.current &&
        Date.now() - pollStartTimeRef.current > MAX_POLL_TIME
      ) {
        cleanup();
        toast.error("Task polling timed out");
        return;
      }

      try {
        await fetchTasks(true);

        if (isSubscribed && isPolling) {
          pollAttemptRef.current += 1;
          const delay = computeNextInterval(pollAttemptRef.current);
          currentPollTimeout = setTimeout(poll, delay + randomJitter());
          pollIntervalRef.current = currentPollTimeout;
        }
      } catch {
        // Error handling is done in fetchTasks
      }
    };

    // Only start polling loop if isPolling is true
    if (isPolling) {
      poll();
    }

    // Cleanup
    return () => {
      isSubscribed = false;
      if (currentPollTimeout) {
        clearTimeout(currentPollTimeout);
      }
      // Don't call full cleanup here as we might just be re-rendering
    };
  }, [fetchTasks, isPolling, cleanup]);

  const triggerRefresh = useCallback(() => {
    pollAttemptRef.current = 0;
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Compute hasIncompleteTasks from current tasks state
  const hasIncompleteTasks = tasks.some((task) => isTaskIncomplete(task.status));

  return (
    <TaskContext.Provider
      value={{
        refreshTrigger,
        triggerRefresh,
        triggerToken,
        tasks,
        loading,
        hasIncompleteTasks,
        isPolling,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}

function isTaskIncomplete(status: TaskStatus) {
  return (
    status !== TaskStatus.COMPLETED &&
    status !== TaskStatus.FAILED &&
    status !== TaskStatus.CANCELLED &&
    status !== TaskStatus.REQUIRES_ACTION
  );
}

function computeNextInterval(attempt: number) {
  if (attempt <= 1) {
    return BASE_POLL_INTERVAL;
  }
  const exponential = BASE_POLL_INTERVAL * Math.pow(1.5, attempt - 1);
  return Math.min(exponential, MAX_POLL_INTERVAL);
}

function randomJitter() {
  return Math.floor(Math.random() * JITTER_MS);
}
