"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/hooks/auth/use-auth-context";

const STORAGE_KEY = "nex-onboarding-tasks";

export type OnboardingTaskId = "connect-wallet" | "create-api-key" | "explore-nex";

export type OnboardingTask = {
  id: OnboardingTaskId;
  title: string;
  description: string;
  completed: boolean;
  action: string;
};

type StoredTasks = Record<OnboardingTaskId, boolean>;

const DEFAULT_TASKS: StoredTasks = {
  "connect-wallet": false,
  "create-api-key": false,
  "explore-nex": false,
};

function loadStoredTasks(userId: string | null): StoredTasks {
  if (typeof window === "undefined") return DEFAULT_TASKS;
  try {
    const key = userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_TASKS, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_TASKS;
}

function saveStoredTasks(userId: string | null, tasks: StoredTasks): void {
  if (typeof window === "undefined") return;
  try {
    const key = userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch {
    // Ignore storage errors
  }
}

export function useOnboardingTasks() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  
  const [completedTasks, setCompletedTasks] = useState<StoredTasks>(DEFAULT_TASKS);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    setCompletedTasks(loadStoredTasks(userId));
    setIsLoading(false);
  }, [userId]);

  const markTaskComplete = useCallback((taskId: OnboardingTaskId) => {
    setCompletedTasks((prev) => {
      const next = { ...prev, [taskId]: true };
      saveStoredTasks(userId, next);
      return next;
    });
  }, [userId]);

  const resetTasks = useCallback(() => {
    setCompletedTasks(DEFAULT_TASKS);
    saveStoredTasks(userId, DEFAULT_TASKS);
  }, [userId]);

  const tasks: OnboardingTask[] = useMemo(() => [
    {
      id: "connect-wallet",
      title: "Connect Your Wallet",
      description: "Securely link your wallet to unlock rewards and make seamless transactions.",
      completed: completedTasks["connect-wallet"],
      action: "Connect Wallet",
    },
    {
      id: "create-api-key",
      title: "Create API Key",
      description: "Generate your unique API key to integrate services and manage access.",
      completed: completedTasks["create-api-key"],
      action: "Create API Key",
    },
    {
      id: "explore-nex",
      title: "Explore Nex-T1",
      description: "Dive into powerful cloud features and discover what's possible with your data.",
      completed: completedTasks["explore-nex"],
      action: "CLOUD",
    },
  ], [completedTasks]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const allCompleted = completedCount === tasks.length;

  return {
    tasks,
    completedCount,
    totalCount: tasks.length,
    allCompleted,
    markTaskComplete,
    resetTasks,
    isLoading,
  };
}
